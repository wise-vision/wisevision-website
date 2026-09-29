/**
 * Framework-agnostic client helper for the wisevision.tech lead forms (POST /api/lead).
 *
 * Usage in a page:
 *   form.addEventListener("submit", async (e) => {
 *     e.preventDefault();
 *     const r = await submitLead(buildLeadPayload(new FormData(form)));
 *     r.ok ? showThanks() : showError(r.message, r.fields);
 *   });
 *
 * Form field names: form (early-access | contact | demo), email, org, role, use_case, consent (checkbox),
 * website (hidden honeypot, must stay empty), cf-turnstile-response (set by the Turnstile widget).
 * Without JS the same <form method="post" action="/api/lead"> posts form-encoded and still works.
 */
export type LeadPayload = Record<string, string | boolean>;

export type LeadResult =
  | { ok: true; duplicate: boolean; mail?: boolean }
  | { ok: false; status: number; error: string; message: string; fields?: Record<string, string> };

const TEXT_KEYS = ["form", "email", "org", "role", "use_case", "website", "cf-turnstile-response"] as const;

type Source = FormData | Record<string, unknown>;

function get(src: Source, key: string): unknown {
  return typeof (src as FormData).get === "function" ? (src as FormData).get(key) : (src as Record<string, unknown>)[key];
}

export function buildLeadPayload(src: Source): LeadPayload {
  const out: LeadPayload = {};
  for (const k of TEXT_KEYS) {
    const v = get(src, k);
    if (typeof v === "string") out[k] = v.trim();
  }
  const c = get(src, "consent");
  out.consent = c === true || (typeof c === "string" && ["on", "true", "1", "yes"].includes(c.toLowerCase()));
  if (out.website === undefined) out.website = "";
  return out;
}

const MESSAGES: Record<number, string> = {
  400: "Please check the highlighted fields.",
  403: "The anti-spam verification failed. Please reload the page and try again.",
  413: "Your message is too long. Please shorten it.",
  429: "Too many attempts from your network. Please wait a few minutes.",
  503: "Verification is temporarily unavailable. Please try again in a minute.",
};
const FALLBACK = "Something went wrong. Please try again, or write to hello@wisevision.tech.";

export async function submitLead(
  payload: LeadPayload | Record<string, unknown>,
  opts: { fetch?: typeof fetch; endpoint?: string; signal?: AbortSignal } = {},
): Promise<LeadResult> {
  const f = opts.fetch ?? fetch;
  let res: Response;
  try {
    // `credentials` is a browser RequestInit field; cast keeps this file type-clean under Workers types too.
    const init = {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
      signal: opts.signal,
    } as RequestInit;
    res = await f(opts.endpoint ?? "/api/lead", init);
  } catch {
    return { ok: false, status: 0, error: "network_error", message: "Network error. Check your connection and try again." };
  }
  let data: Record<string, unknown> | null = null;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = null;
  }
  if (!data) return { ok: false, status: res.status, error: "bad_response", message: FALLBACK };
  if (res.ok && data.ok === true) {
    return { ok: true, duplicate: data.duplicate === true, ...(typeof data.mail === "boolean" ? { mail: data.mail } : {}) };
  }
  return {
    ok: false,
    status: res.status,
    error: typeof data.error === "string" ? data.error : "unknown_error",
    message: MESSAGES[res.status] ?? FALLBACK,
    ...(data.fields && typeof data.fields === "object" ? { fields: data.fields as Record<string, string> } : {}),
  };
}
