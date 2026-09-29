# wisevision.tech: lead forms backend (Cloudflare Pages Functions + D1)

`POST /api/lead` takes the early-access / contact / demo forms, stores one row in D1 (`wv-leads`) and mails
Adam through the Email Workers `send_email` binding. Everything here runs locally today. Nothing has been
created on the Cloudflare account yet; the steps below are what the parent runs once the account is usable.

## What the endpoint does

| Step | Behaviour |
|---|---|
| Method | `POST` only. Anything else → `405` + `Allow: POST`. No CORS headers are ever sent. |
| Origin | Same-origin only: a foreign `Origin` or `Sec-Fetch-Site: cross-site` → `403 cross_origin`. |
| Rate limit | ≤ 5 attempts per `ip_hash` per 10 min, counted atomically in D1 (`lead_attempts`, pruned after 24 h). Invalid attempts count too. The 6th → `429` + `Retry-After`. |
| Body | JSON, `application/x-www-form-urlencoded` or `multipart/form-data`; ≤ 32 KB (`413`); other types → `415`. |
| Validation → `400 {fields}` | `form` ∈ early-access/contact/demo · `email` RFC-lite, ≤ 254 · `org` ≤ 200 · `role` ≤ 120 · `use_case` ≤ 4000 · `consent` true/on/1 · honeypot `website` must be empty · `cf-turnstile-response` required. CR/LF are flattened in single-line fields. |
| Turnstile | `siteverify` with `TURNSTILE_SECRET` + `remoteip`. Fail → `403 turnstile_failed`; siteverify down → `503` (fails closed). |
| Duplicate | Same email + form within 24 h → `200 {ok:true, duplicate:true}`, no row, no mail. `dedupe_key UNIQUE` makes concurrent duplicates race-safe. |
| Store | Parameterised `INSERT` into `leads`. Raw IP never stored: `ip_hash = SHA-256(ip | IP_SALT | UTC date)`. |
| Mail | From `leads@wisevision.tech` to `LEAD_TO`, subject `[wisevision lead] <form> — <org or email>`, plain-text body with all fields, `Reply-To` = the lead. If sending throws, the row stays and the reply is `200 {mail:false}`; the failure is logged as `lead_mail_failed` (no PII). |
| Middleware | `/api/*`: nosniff, DENY framing, CSP `default-src 'none'`, HSTS, `no-store`; any throw → `500 {"error":"internal_error"}`, no stack trace. |

Client helper: `src/lib/lead-form.ts` (`buildLeadPayload(new FormData(form))` + `submitLead(payload)`),
which maps every status code to a user message. Field names: `form, email, org, role, use_case, consent, website,
cf-turnstile-response`. A no-JS `<form method="post" action="/api/lead">` works too (form-encoded).

Privacy notice text for the forms page (W3 owns the page): purpose = answering your request; retention = 24 months;
controller = WiseVision; deletion via hello@wisevision.tech.

## Layout

```
wrangler.toml                  Pages config (D1 LEADS → wv-leads, send_email LEAD_MAIL, vars)
migrations/0001_leads.sql      leads + lead_attempts tables and indexes
functions/api/lead.ts          route (onRequestPost / onRequest → 405)
functions/api/_middleware.ts   security headers + JSON errors
functions/_lib/lead.ts         the handler (pure, deps injectable)
functions/test/**              vitest + @cloudflare/vitest-pool-workers (miniflare, local D1)
functions/scripts/stage.sh     builds a clean Pages root (routes only) for dev / deploy
functions/scripts/smoke.sh     wrangler pages dev + curl + local D1 count
```

## Local

```bash
cd functions
npm ci
npm test                 # 65 tests
npm run coverage         # istanbul, threshold 80 % lines
npm run typecheck
npm run smoke            # wrangler pages dev on :8788 against test-fixtures/dist, local D1, prints count before/after + the captured .eml
```

The smoke uses Cloudflare's documented Turnstile **test** secret `1x0000000000000000000000000000000AA` (always passes;
`2x0000000000000000000000000000000AA` always fails) via `.dev.vars` in the stage dir, never a real secret.

> **Why a stage dir:** the Pages route scanner compiles every `.js/.ts` file under `./functions`, including
> `functions/node_modules` and `functions/test`. `scripts/stage.sh` copies only `api/` + `_lib/` next to the built
> `dist/` and symlinks `node_modules`. **Use it for the real deploy too** (below). Alternative for the parent:
> move `functions/package.json`, the tests and `node_modules` to e.g. `functions-dev/`, which would need the
> root `package.json` owner (worker A) to add the deps.

## Deploy (run once Cloudflare is live) — copy-paste

Prereqs: the `wisevision.tech` zone is on Cloudflare, Email Routing is enabled on it, and
`adam.krawczyk0698@gmail.com` is a **verified destination address** (Email → Email Routing → Destination addresses;
click the link in the verification mail). `send_email` only delivers to verified destinations.

```bash
export HOME=/home/adam
cd <repo>/functions && npm ci
export CLOUDFLARE_ACCOUNT_ID=<account id>
npx wrangler login            # or CLOUDFLARE_API_TOKEN with: Pages Edit, D1 Edit, Account Settings Read

# 1. D1
npx wrangler d1 create wv-leads
#    → paste the printed database_id into ../wrangler.toml ([[d1_databases]] database_id), commit.
cd .. && functions/node_modules/.bin/wrangler d1 migrations apply wv-leads --remote
functions/node_modules/.bin/wrangler d1 execute wv-leads --remote --command "select count(*) from leads"   # → 0

# 2. Turnstile widget (dashboard: Turnstile → Add widget, hostnames wisevision.tech + www.wisevision.tech, mode Managed)
#    → put the SITE key in wrangler.toml [vars] TURNSTILE_SITE_KEY (public) and in the page's widget, commit.

# 3. Pages project + secrets (project name must match wrangler.toml `name`)
functions/node_modules/.bin/wrangler pages project create wisevision-website --production-branch main   # skip if W0 created it
functions/node_modules/.bin/wrangler pages secret put TURNSTILE_SECRET --project-name wisevision-website
openssl rand -hex 32 | functions/node_modules/.bin/wrangler pages secret put IP_SALT --project-name wisevision-website

# 4. Build the site (worker A's build → dist/), stage, deploy
npm run build                                            # root site build → ./dist
functions/scripts/stage.sh /tmp/wv-deploy ./dist
cd /tmp/wv-deploy && /path/to/repo/functions/node_modules/.bin/wrangler pages deploy dist --project-name wisevision-website --branch main

# 5. Live end-to-end (W7 gate): submit the real form on https://wisevision.tech, then
functions/node_modules/.bin/wrangler d1 execute wv-leads --remote --command "select id, ts, form, email, org from leads order by id desc limit 3"
#    and Adam confirms the "[wisevision lead] …" mail arrived.
```

Bindings the deploy relies on (all declared in `wrangler.toml`; Pages reads them when deploying with wrangler):
D1 `LEADS` → `wv-leads`; `send_email` `LEAD_MAIL` (destination `adam.krawczyk0698@gmail.com`); vars `LEAD_TO`,
`LEAD_FROM`, `TURNSTILE_SITE_KEY`; secrets `TURNSTILE_SECRET`, `IP_SALT`. If the Pages dashboard does not pick up
`[[send_email]]` from `wrangler.toml`, add it under Settings → Bindings → Send Email, name `LEAD_MAIL`.

Useful after launch:

```bash
# leads in the last 30 days with a real org (OUTCOME predicate input)
wrangler d1 execute wv-leads --remote --command "select count(*) from leads where ts > datetime('now','-30 days') and org is not null"
# retention: delete rows older than 24 months
wrangler d1 execute wv-leads --remote --command "delete from leads where ts < strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 months')"
# deletion request (hello@): 
wrangler d1 execute wv-leads --remote --command "delete from leads where email = 'person@example.org'"
```
