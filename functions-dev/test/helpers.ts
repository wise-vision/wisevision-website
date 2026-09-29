import type { EmailMessage } from "cloudflare:email";
import { env as workerEnv } from "cloudflare:workers";
import type { LeadEnv, LeadDeps } from "../../functions/_lib/lead";
import mailer from "../../workers/lead-mailer/src/index";

export const PASS_SECRET = "1x0000000000000000000000000000000AA"; // Cloudflare test secret: always passes
export const FAIL_SECRET = "2x0000000000000000000000000000000AA"; // Cloudflare test secret: always fails
export const ORIGIN = "https://wisevision.tech";

export const db = (workerEnv as unknown as { LEADS: D1Database }).LEADS;

export interface SentMail {
  from: string;
  to: string;
  raw: string;
  isEmailMessage: boolean;
}

export function fakeMail(opts: { fail?: boolean } = {}) {
  const sent: SentMail[] = [];
  const binding = {
    async send(message: EmailMessage) {
      if (opts.fail) throw new Error("destination address not verified");
      // Miniflare's EmailMessage keeps the MIME source under this key; fall back to `.raw`.
      const m = message as unknown as Record<string, unknown>;
      const src = (m["EmailMessage::raw"] ?? m.raw) as ReadableStream | string;
      const raw = typeof src === "string" ? src : await new Response(src).text();
      sent.push({ from: message.from, to: message.to, raw, isEmailMessage: "EmailMessage::raw" in m });
    },
  };
  return { binding, sent };
}

/**
 * Emulates https://challenges.cloudflare.com/turnstile/v0/siteverify using Cloudflare's
 * documented test secrets (1x…AA always passes, 2x…AA always fails), so unit tests stay offline.
 */
export function fakeSiteverify() {
  const calls: { url: string; body: URLSearchParams | FormData | string }[] = [];
  const fn = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = init?.body as FormData;
    calls.push({ url, body });
    const secret = body.get("secret");
    const token = body.get("response");
    const success = secret === PASS_SECRET && typeof token === "string" && token.length > 0;
    return Response.json({ success, "error-codes": success ? [] : ["invalid-input-response"] });
  };
  return { fn: fn as typeof fetch, calls };
}

/**
 * A fake `LEAD_MAILER` service binding that routes into the REAL wv-lead-mailer Worker module, whose own
 * `send_email` binding is the `fakeMail()` capture. So Pages-side tests exercise both sides of the hop.
 * `calls` records every request body the Pages Function sent over the binding.
 */
export function fakeMailer(mail = fakeMail()) {
  const calls: { url: string; body: unknown }[] = [];
  const binding = {
    async fetch(input: RequestInfo | URL, init?: RequestInit) {
      const req = new Request(input, init);
      calls.push({ url: req.url, body: await req.clone().json().catch(() => null) });
      return mailer.fetch(req, {
        LEAD_MAIL: mail.binding as unknown as SendEmail,
        LEAD_TO: "adam.krawczyk0698@gmail.com",
        LEAD_FROM: "leads@wisevision.tech",
      });
    },
  };
  return { binding: binding as unknown as Fetcher, calls, sent: mail.sent };
}

export function makeEnv(over: Partial<LeadEnv> = {}, mail = fakeMail()): LeadEnv {
  return {
    LEADS: db,
    LEAD_MAILER: fakeMailer(mail).binding,
    TURNSTILE_SECRET: PASS_SECRET,
    IP_SALT: "test-salt",
    ...over,
  };
}

export function validLead(over: Record<string, unknown> = {}) {
  return {
    form: "early-access",
    email: "ros.dev@example.org",
    org: "Acme Robotics",
    role: "Robotics engineer",
    use_case: "Drive a Nav2 stack from Claude",
    consent: true,
    website: "",
    "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
    ...over,
  };
}

export function jsonRequest(body: unknown, opts: { ip?: string; origin?: string | null; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "cf-connecting-ip": opts.ip ?? "203.0.113.7",
    "user-agent": "vitest/agent",
    ...(opts.headers ?? {}),
  };
  if (opts.origin !== null) headers.origin = opts.origin ?? ORIGIN;
  return new Request(`${ORIGIN}/api/lead`, { method: "POST", headers, body: JSON.stringify(body) });
}

export async function leadCount(): Promise<number> {
  const row = await db.prepare("SELECT count(*) AS n FROM leads").first<{ n: number }>();
  return row?.n ?? 0;
}

export async function resetDb() {
  await db.batch([db.prepare("DELETE FROM leads"), db.prepare("DELETE FROM lead_attempts")]);
}

export function deps(over: Partial<LeadDeps> = {}): LeadDeps {
  return { fetch: fakeSiteverify().fn, ...over };
}

function b64utf8(b64: string): string {
  const bin = atob(b64.replace(/\s+/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Minimal decoder for the single-part text/plain MIME message the handler builds. */
export function decodeMail(raw: string) {
  const norm = raw.replace(/\r\n/g, "\n");
  const split = norm.indexOf("\n\n");
  const head = norm.slice(0, split);
  const headers: Record<string, string> = {};
  for (const line of head.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) headers[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim();
  }
  const subject = headers.subject.replace(/=\?utf-8\?B\?([^?]*)\?=/gi, (_m, b) => b64utf8(b));
  const body = /base64/i.test(headers["content-transfer-encoding"] ?? "") ? b64utf8(norm.slice(split + 2)) : norm.slice(split + 2);
  return { headers, subject, body, headerLines: head.split("\n") };
}
