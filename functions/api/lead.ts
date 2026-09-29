/** Cloudflare Pages Function: POST /api/lead. See functions/README.md. */
import { handleLead, type LeadEnv } from "../_lib/lead";

// Late-bound so the runtime (or a test spy) supplies the current global fetch.
const deps = { fetch: ((input, init) => fetch(input, init)) as typeof fetch };

export const onRequestPost: PagesFunction<LeadEnv> = (ctx) => handleLead(ctx.request, ctx.env, deps);

/** Any other method: handleLead answers 405 with `Allow: POST`. No CORS preflight is ever granted. */
export const onRequest: PagesFunction<LeadEnv> = (ctx) => handleLead(ctx.request, ctx.env, deps);
