import { env as workerEnv } from "cloudflare:workers";
import type { LeadEnv, LeadDeps } from "../_lib/lead";

export const PASS_SECRET = "1x0000000000000000000000000000000AA"; // Cloudflare test secret: always passes
export const FAIL_SECRET = "2x0000000000000000000000000000000AA"; // Cloudflare test secret: always fails
export const ORIGIN = "https://wisevision.tech";

export const db = (workerEnv as unknown as { LEADS: D1Database }).LEADS;

export interface SentMail {
  from: string;
  to: string;
  raw: string;
}

export function fakeMail(opts: { fail?: boolean } = {}) {
  const sent: SentMail[] = [];
  const binding = {
    async send(message: { from: string; to: string; raw: ReadableStream | string }) {
      if (opts.fail) throw new Error("destination address not verified");
      const raw = typeof message.raw === "string" ? message.raw : await new Response(message.raw).text();
      sent.push({ from: message.from, to: message.to, raw });
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

export function makeEnv(over: Partial<LeadEnv> = {}, mail = fakeMail()): LeadEnv {
  return {
    LEADS: db,
    LEAD_MAIL: mail.binding as unknown as SendEmail,
    TURNSTILE_SECRET: PASS_SECRET,
    IP_SALT: "test-salt",
    LEAD_TO: "adam.krawczyk0698@gmail.com",
    LEAD_FROM: "leads@wisevision.tech",
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
