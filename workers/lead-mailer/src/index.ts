/**
 * wv-lead-mailer: the companion Worker that owns the `send_email` binding for wisevision.tech leads.
 *
 * Why it exists: Cloudflare Pages Functions cannot hold a `send_email` binding, so the Pages Function
 * `POST /api/lead` calls this Worker through the `LEAD_MAILER` service binding instead.
 *
 * Surface: NONE public. `workers_dev = false`, no routes, no custom domain (see wrangler.toml), so the
 * only caller is the service binding. Even so, input is treated as untrusted:
 *   - accepts ONLY `POST` with a JSON object of exactly {subject, text, replyTo}; anything else → 400/405;
 *   - the recipient and sender are fixed by config (`LEAD_TO`, `LEAD_FROM`), never taken from the input;
 *   - subject/replyTo must be single-line (no header injection); lengths are capped.
 */
import { EmailMessage } from "cloudflare:email";
// Browser build: pure JS, CRLF line endings, no Node built-ins (so no nodejs_compat is needed).
import { Mailbox, createMimeMessage } from "mimetext/browser";

export interface MailerEnv {
  LEAD_MAIL: SendEmail;
  LEAD_TO: string;
  LEAD_FROM?: string;
}

export const MAILER_LIMITS = { subject: 300, text: 20_000, replyTo: 254, body: 64 * 1024 } as const;
const DEFAULT_FROM = "leads@wisevision.tech";
const KEYS = ["replyTo", "subject", "text"];
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
// Any C0 control char (incl. CR/LF/TAB) or DEL: forbidden in single-line header values.
const HEADER_UNSAFE_RE = /[\u0000-\u001F\u007F]/;

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", ...extra } });
const bad = (error: string) => json(400, { ok: false, error });

export interface MailRequest {
  subject: string;
  text: string;
  replyTo: string;
}

export function parseMailRequest(raw: unknown): { ok: true; req: MailRequest } | { ok: false; error: string } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "invalid_body" };
  const o = raw as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  if (keys.length !== KEYS.length || keys.some((k, i) => k !== KEYS[i])) return { ok: false, error: "unexpected_fields" };
  const { subject, text, replyTo } = o;
  if (typeof subject !== "string" || typeof text !== "string" || typeof replyTo !== "string") return { ok: false, error: "invalid_types" };
  if (subject.trim() === "" || subject.length > MAILER_LIMITS.subject || HEADER_UNSAFE_RE.test(subject)) return { ok: false, error: "invalid_subject" };
  if (text.trim() === "" || text.length > MAILER_LIMITS.text) return { ok: false, error: "invalid_text" };
  if (replyTo.length > MAILER_LIMITS.replyTo || HEADER_UNSAFE_RE.test(replyTo) || !EMAIL_RE.test(replyTo)) return { ok: false, error: "invalid_reply_to" };
  return { ok: true, req: { subject, text, replyTo } };
}

function base64Lines(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return (btoa(bin).match(/.{1,76}/g) ?? []).join("\r\n");
}

export function buildRawMail(m: MailRequest, from: string, to: string): string {
  const msg = createMimeMessage();
  msg.setSender({ name: "wisevision.tech leads", addr: from });
  msg.setRecipient(to);
  msg.setSubject(m.subject);
  msg.setHeader("Reply-To", new Mailbox(m.replyTo));
  // base64 so UTF-8 in free-text fields survives any relay (7bit would be non-compliant).
  msg.addMessage({ contentType: "text/plain", charset: "UTF-8", encoding: "base64", data: base64Lines(m.text) });
  return msg.asRaw();
}

export default {
  async fetch(req: Request, env: MailerEnv): Promise<Response> {
    if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, { allow: "POST" });
    if (!env.LEAD_MAIL || !env.LEAD_TO) {
      console.error("lead_mailer_misconfigured", { LEAD_MAIL: !!env.LEAD_MAIL, LEAD_TO: !!env.LEAD_TO });
      return json(500, { ok: false, error: "misconfigured" });
    }
    const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (type !== "application/json") return bad("unsupported_media_type");
    const buf = await req.arrayBuffer();
    if (buf.byteLength > MAILER_LIMITS.body) return bad("payload_too_large");
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder().decode(buf));
    } catch {
      return bad("invalid_json");
    }
    const p = parseMailRequest(raw);
    if (!p.ok) return bad(p.error);

    const from = env.LEAD_FROM || DEFAULT_FROM;
    try {
      await env.LEAD_MAIL.send(new EmailMessage(from, env.LEAD_TO, buildRawMail(p.req, from, env.LEAD_TO)));
    } catch (e) {
      // Never log the lead's PII (subject/text/replyTo), only the platform error.
      console.error("lead_mailer_send_failed", { error: e instanceof Error ? e.message : String(e) });
      return json(502, { ok: false, error: "send_failed" });
    }
    return json(200, { ok: true });
  },
};
