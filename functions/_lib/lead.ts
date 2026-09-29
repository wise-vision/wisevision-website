// RED stub: implementation follows.
export interface LeadEnv { LEADS: D1Database; LEAD_MAIL?: SendEmail; TURNSTILE_SECRET: string; IP_SALT: string; LEAD_TO: string; LEAD_FROM?: string }
export interface LeadDeps { fetch: typeof fetch; now?: () => Date }
export async function handleLead(_r: Request, _e: LeadEnv, _d: LeadDeps): Promise<Response> {
  return new Response("not implemented", { status: 501 });
}
