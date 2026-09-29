/**
 * /api/* middleware: security headers on every response, JSON errors, never a stack trace.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "cache-control": "no-store",
};

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function withSecurity(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  return out;
}

export const onRequest: PagesFunction = async (ctx) => {
  let res: Response;
  try {
    res = await ctx.next();
  } catch (e) {
    console.error("api_unhandled_error", { path: new URL(ctx.request.url).pathname, error: e instanceof Error ? e.message : String(e) });
    return withSecurity(jsonError(500, "internal_error"));
  }
  const isJson = (res.headers.get("content-type") ?? "").includes("application/json");
  if (res.status >= 400 && !isJson) {
    const code = res.status === 404 ? "not_found" : res.status === 405 ? "method_not_allowed" : res.status >= 500 ? "internal_error" : "request_error";
    return withSecurity(jsonError(res.status, code));
  }
  return withSecurity(res);
};
