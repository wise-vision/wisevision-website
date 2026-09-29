/**
 * POST /api/lead core (wvrevive W7). Framework-free so it can be unit-tested with injected deps.
 *
 * Order of checks (cheap and abuse-resistant first):
 *   method → same-origin → config → rate limit (D1, atomic) → body parse/size → validation + honeypot
 *   → Turnstile siteverify → duplicate check → INSERT (UNIQUE dedupe_key) → send_email (best effort).
 *
 * Privacy: the raw IP is never stored; only SHA-256(ip | IP_SALT | UTC day). No lead PII is logged.
 */
import { EmailMessage } from "cloudflare:email";
// Browser build: pure JS, CRLF line endings, no Node built-ins (so no nodejs_compat is needed).
import { Mailbox, createMimeMessage } from "mimetext/browser";

export interface LeadEnv {
  LEADS: D1Database;
  LEAD_MAIL?: SendEmail;
  TURNSTILE_SECRET: string;
  IP_SALT: string;
  LEAD_TO: string;
  LEAD_FROM?: string;
  /** Optional secret. When set, a request whose `X-WV-E2E` header equals it skips Turnstile (live E2E tests). */
  E2E_KEY?: string;
}

export interface LeadDeps {
  /** Injectable so tests never reach the network. */
  fetch: typeof fetch;
  now?: () => Date;
}

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const FORMS = ["early-access", "contact", "demo"] as const;
export type LeadFormKind = (typeof FORMS)[number];

export const LIMITS = { email: 254, org: 200, role: 120, use_case: 4000, token: 2048, body: 32 * 1024 } as const;
export const RATE = { max: 5, windowMs: 10 * 60_000 } as const;
const DUP_WINDOW_MS = 24 * 3600_000;
const ATTEMPT_RETENTION_MS = 24 * 3600_000;
const DEFAULT_FROM = "leads@wisevision.tech";

export interface Lead {
  form: LeadFormKind;
  email: string;
  org: string | null;
  role: string | null;
  use_case: string | null;
  token: string;
}

type Fields = Record<string, string>;

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

export function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });
}

const fail = (status: number, error: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
  json(status, { ok: false, error, ...extra }, headers);

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ipHash(ip: string, salt: string, now: Date): Promise<string> {
  return sha256Hex(`${ip}|${salt}|${now.toISOString().slice(0, 10)}`);
}

/** Same-origin only: no CORS headers are ever emitted, and a foreign Origin / cross-site fetch is refused. */
function isSameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.get("origin");
  if (origin === null) return true;
  return origin === new URL(req.url).origin;
}

// ---------- body parsing ----------

class BodyError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const kinds = ["application/json", "application/x-www-form-urlencoded", "multipart/form-data"];
  if (!kinds.includes(type)) throw new BodyError(415, "unsupported_media_type");
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > LIMITS.body) throw new BodyError(413, "payload_too_large");
  const buf = await req.arrayBuffer();
  if (buf.byteLength > LIMITS.body) throw new BodyError(413, "payload_too_large");

  if (type === "application/json") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(buf));
    } catch {
      throw new BodyError(400, "invalid_body");
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new BodyError(400, "invalid_body");
    return parsed as Record<string, unknown>;
  }
  let fd: FormData;
  try {
    fd = await new Response(buf, { headers: { "content-type": req.headers.get("content-type")! } }).formData();
  } catch {
    throw new BodyError(400, "invalid_body");
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

// ---------- validation ----------

// RFC-lite: one @, no whitespace/control/specials, a dotted domain with a 2+ char TLD.
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function oneLine(s: string): string {
  return s.replace(CONTROL_RE, "").replace(/\s*[\r\n]+\s*/g, " ").trim();
}

function multiLine(s: string): string {
  return s.replace(/\r\n?/g, "\n").replace(CONTROL_RE, "").trim();
}

function truthy(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (typeof v === "string") return ["true", "on", "1", "yes"].includes(v.trim().toLowerCase());
  return false;
}

export function validate(
  raw: Record<string, unknown>,
  opts: { requireToken?: boolean } = {},
): { ok: true; lead: Lead } | { ok: false; fields: Fields } {
  const requireToken = opts.requireToken ?? true;
  const fields: Fields = {};

  const hp = raw.website;
  if (hp !== undefined && hp !== null && hp !== "") fields.website = "must_be_empty";

  const form = raw.form;
  if (typeof form !== "string" || !(FORMS as readonly string[]).includes(form)) fields.form = "invalid";

  let email = "";
  if (typeof raw.email !== "string" || raw.email.trim() === "") fields.email = "required";
  else {
    email = raw.email.trim().toLowerCase();
    if (email.length > LIMITS.email) fields.email = "too_long";
    else if (!EMAIL_RE.test(email)) fields.email = "invalid";
  }

  const opt = (key: "org" | "role" | "use_case", clean: (s: string) => string): string | null => {
    const v = raw[key];
    if (v === undefined || v === null) return null;
    if (typeof v !== "string") {
      fields[key] = "invalid";
      return null;
    }
    const c = clean(v);
    if (c.length > LIMITS[key]) fields[key] = "too_long";
    return c === "" ? null : c;
  };
  const org = opt("org", oneLine);
  const role = opt("role", oneLine);
  const use_case = opt("use_case", multiLine);

  if (!truthy(raw.consent)) fields.consent = "required";

  const token = raw["cf-turnstile-response"];
  if (requireToken && (typeof token !== "string" || token === "" || token.length > LIMITS.token)) fields.turnstile = "required";

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, lead: { form: form as LeadFormKind, email, org, role, use_case, token: typeof token === "string" ? token : "" } };
}

// ---------- E2E bypass ----------

/** Constant-time string equality: compares SHA-256 digests, so neither length nor content leaks via timing. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export const E2E_PREFIX = "[e2e]";

// ---------- Turnstile ----------

type Verdict = "pass" | "fail" | "unavailable";

export async function verifyTurnstile(token: string, secret: string, ip: string, f: typeof fetch): Promise<Verdict> {
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  try {
    const res = await f(SITEVERIFY_URL, { method: "POST", body });
    if (!res.ok) return "unavailable";
    const data = (await res.json()) as { success?: unknown };
    return data.success === true ? "pass" : "fail";
  } catch {
    return "unavailable";
  }
}

// ---------- mail ----------

function base64Lines(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return (btoa(bin).match(/.{1,76}/g) ?? []).join("\r\n");
}

export function mailSubject(lead: Pick<Lead, "form" | "org" | "email">): string {
  return `[wisevision lead] ${lead.form} — ${lead.org ?? lead.email}`;
}

export function mailBody(lead: Lead, meta: { id: number; ts: string; ua: string | null }): string {
  return [
    `New ${lead.form} lead from wisevision.tech`,
    "",
    `id:        ${meta.id}`,
    `ts:        ${meta.ts}`,
    `form:      ${lead.form}`,
    `email:     ${lead.email}`,
    `org:       ${lead.org ?? "-"}`,
    `role:      ${lead.role ?? "-"}`,
    `consent:   yes`,
    `ua:        ${meta.ua ?? "-"}`,
    "",
    "use case:",
    lead.use_case ?? "-",
    "",
    "Reply to this mail to answer the lead directly (Reply-To is set).",
  ].join("\n");
}

export function buildRawMail(lead: Lead, meta: { id: number; ts: string; ua: string | null }, from: string, to: string): string {
  const msg = createMimeMessage();
  msg.setSender({ name: "wisevision.tech leads", addr: from });
  msg.setRecipient(to);
  msg.setSubject(mailSubject(lead));
  msg.setHeader("Reply-To", new Mailbox(lead.email));
  // base64 so UTF-8 in free-text fields survives any relay (7bit would be non-compliant).
  msg.addMessage({ contentType: "text/plain", charset: "UTF-8", encoding: "base64", data: base64Lines(mailBody(lead, meta)) });
  return msg.asRaw();
}

// ---------- handler ----------

export async function handleLead(req: Request, env: LeadEnv, deps: LeadDeps): Promise<Response> {
  if (req.method !== "POST") return fail(405, "method_not_allowed", {}, { allow: "POST" });
  if (!isSameOrigin(req)) return fail(403, "cross_origin");

  if (!env.LEADS || !env.TURNSTILE_SECRET || !env.IP_SALT || !env.LEAD_TO) {
    console.error("lead_config_missing", {
      LEADS: !!env.LEADS, TURNSTILE_SECRET: !!env.TURNSTILE_SECRET, IP_SALT: !!env.IP_SALT, LEAD_TO: !!env.LEAD_TO,
    });
    return fail(500, "server_misconfigured");
  }

  const now = (deps.now ?? (() => new Date()))();
  const ts = now.toISOString();
  const ip = req.headers.get("cf-connecting-ip") ?? "";
  const hash = await ipHash(ip || "unknown", env.IP_SALT, now);
  const db = env.LEADS;

  // Rate limit: atomic "insert only if fewer than RATE.max attempts in the window". Every attempt that
  // passes method/origin counts, valid or not, so bots cannot probe validation for free.
  const windowStart = new Date(now.getTime() - RATE.windowMs).toISOString();
  const rl = await db
    .prepare(
      `INSERT INTO lead_attempts (ts, ip_hash)
       SELECT ?1, ?2 WHERE (SELECT count(*) FROM lead_attempts WHERE ip_hash = ?2 AND ts > ?3) < ?4`,
    )
    .bind(ts, hash, windowStart, RATE.max)
    .run();
  if (rl.meta.changes === 0) {
    const oldest = await db
      .prepare("SELECT min(ts) AS t FROM lead_attempts WHERE ip_hash = ?1 AND ts > ?2")
      .bind(hash, windowStart)
      .first<{ t: string | null }>();
    const until = oldest?.t ? Date.parse(oldest.t) + RATE.windowMs : now.getTime() + RATE.windowMs;
    const retry = Math.max(1, Math.ceil((until - now.getTime()) / 1000));
    return fail(429, "rate_limited", {}, { "retry-after": String(retry) });
  }
  // Housekeeping: attempts are only needed for the rate window; keep a day for forensics.
  await db
    .prepare("DELETE FROM lead_attempts WHERE ts < ?1")
    .bind(new Date(now.getTime() - ATTEMPT_RETENTION_MS).toISOString())
    .run();

  // E2E bypass: only active when the E2E_KEY secret is set. A present-but-wrong header is refused outright.
  let e2e = false;
  const e2eHeader = req.headers.get("x-wv-e2e");
  if (env.E2E_KEY && e2eHeader !== null) {
    if (!(await safeEqual(e2eHeader, env.E2E_KEY))) return fail(403, "e2e_forbidden");
    e2e = true;
  }

  let raw: Record<string, unknown>;
  try {
    raw = await readBody(req);
  } catch (e) {
    if (e instanceof BodyError) return fail(e.status, e.code);
    throw e;
  }

  const v = validate(raw, { requireToken: !e2e });
  if (!v.ok) return fail(400, "validation_failed", { fields: v.fields });
  const lead = v.lead;

  if (e2e) {
    lead.use_case = lead.use_case ? `${E2E_PREFIX} ${lead.use_case}` : E2E_PREFIX;
    console.log("lead_e2e_bypass", { form: lead.form });
  } else {
    const verdict = await verifyTurnstile(lead.token, env.TURNSTILE_SECRET, ip, deps.fetch);
    if (verdict === "unavailable") return fail(503, "turnstile_unavailable");
    if (verdict === "fail") return fail(403, "turnstile_failed");
  }

  const dupSince = new Date(now.getTime() - DUP_WINDOW_MS).toISOString();
  const dup = await db
    .prepare("SELECT id FROM leads WHERE email = ?1 AND form = ?2 AND ts > ?3 LIMIT 1")
    .bind(lead.email, lead.form, dupSince)
    .first();
  if (dup) return json(200, { ok: true, duplicate: true });

  // dedupe_key buckets by UTC day: any two submissions > 24 h apart always land in different buckets,
  // so the UNIQUE constraint only ever blocks true duplicates (it closes the concurrent-request race).
  const bucket = Math.floor(now.getTime() / DUP_WINDOW_MS);
  const dedupeKey = await sha256Hex(`${lead.email}|${lead.form}|${bucket}`);
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 512) || null;
  const ins = await db
    .prepare(
      `INSERT INTO leads (ts, form, email, org, role, use_case, consent, ip_hash, ua, dedupe_key)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9)
       ON CONFLICT (dedupe_key) DO NOTHING`,
    )
    .bind(ts, lead.form, lead.email, lead.org, lead.role, lead.use_case, hash, ua, dedupeKey)
    .run();
  if (ins.meta.changes === 0) return json(200, { ok: true, duplicate: true });
  const id = Number(ins.meta.last_row_id);

  let mail = false;
  try {
    if (!env.LEAD_MAIL) throw new Error("LEAD_MAIL binding missing");
    const from = env.LEAD_FROM || DEFAULT_FROM;
    const rawMail = buildRawMail(lead, { id, ts, ua }, from, env.LEAD_TO);
    await env.LEAD_MAIL.send(new EmailMessage(from, env.LEAD_TO, rawMail));
    mail = true;
  } catch (e) {
    // The row stands; Adam can still read it from D1. Never log the lead's PII.
    console.error("lead_mail_failed", { id, form: lead.form, error: e instanceof Error ? e.message : String(e) });
  }
  return json(200, { ok: true, duplicate: false, mail });
}
