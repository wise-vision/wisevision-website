# wisevision.tech: lead forms backend (Pages Functions + D1 + mailer Worker)

`POST /api/lead` takes the early-access / contact / demo forms, stores one row in D1 (`wv-leads`) and mails
Adam. Cloudflare Pages Functions **cannot hold a `send_email` binding** (wrangler rejects the whole Pages config
if one is declared), so the mail goes through a `LEAD_MAILER` **service binding** to the companion Worker
`wv-lead-mailer` (`workers/lead-mailer/`). That Worker owns `send_email` and has **no public surface**
(`workers_dev = false`, `preview_urls = false`, no routes, no custom domain).

```
browser ──POST /api/lead──▶ Pages Function (functions/) ──INSERT──▶ D1 wv-leads
                                    │
                                    └─service binding LEAD_MAILER─▶ Worker wv-lead-mailer ──send_email──▶ adam.krawczyk0698@gmail.com
                                       {subject, text, replyTo}       (recipient + sender fixed in its own config)
```

## What the endpoint does

| Step | Behaviour |
|---|---|
| Method | `POST` only. Anything else → `405` + `Allow: POST`. No CORS headers are ever sent. |
| Origin | Same-origin only: a foreign `Origin` or `Sec-Fetch-Site: cross-site` → `403 cross_origin`. |
| Rate limit | ≤ 5 attempts per `ip_hash` per 10 min, counted atomically in D1 (`lead_attempts`, pruned after 24 h). Invalid attempts count too. The 6th → `429` + `Retry-After`. |
| Body | JSON, `application/x-www-form-urlencoded` or `multipart/form-data`; ≤ 32 KB (`413`); other types → `415`. |
| Validation → `400 {fields}` | `form` ∈ early-access/contact/demo · `email` RFC-lite, ≤ 254 · `org` ≤ 200 · `role` ≤ 120 · `use_case` ≤ 4000 · `consent` true/on/1 · honeypot `website` must be empty · `cf-turnstile-response` required. CR/LF are flattened in single-line fields. |
| Turnstile | `siteverify` with `TURNSTILE_SECRET` + `remoteip`. Fail → `403 turnstile_failed`; siteverify down → `503` (fails closed). |
| E2E bypass | Only when the `E2E_KEY` secret is set: header `X-WV-E2E` equal to it (constant-time compare) skips Turnstile and prefixes the stored `use_case` with `[e2e]`. A present-but-wrong header → `403 e2e_forbidden`. No secret → the header is ignored. |
| Duplicate | Same email + form within 24 h → `200 {ok:true, duplicate:true}`, no row, no mail. `dedupe_key UNIQUE` makes concurrent duplicates race-safe. |
| Store | Parameterised `INSERT` into `leads`. Raw IP never stored: `ip_hash = SHA-256(ip | IP_SALT | UTC date)`. |
| Mail | `LEAD_MAILER.fetch()` with `{subject: "[wisevision lead] <form> — <org or email>", text, replyTo: <lead email>}`. The mailer sends from `leads@wisevision.tech` to its fixed `LEAD_TO`, `Reply-To` = the lead. Binding missing / non-2xx / throw → the row stays and the reply is `200 {mail:false}`; logged as `lead_mail_failed` (no PII). |
| Middleware | `/api/*`: nosniff, DENY framing, CSP `default-src 'none'`, HSTS, `no-store`; any throw → `500 {"error":"internal_error"}`, no stack trace. |

Mailer Worker contract (`workers/lead-mailer/src/index.ts`): `POST` + `application/json` only, body ≤ 64 KB, the object
must have **exactly** the keys `subject`, `text`, `replyTo` (any extra key such as `to`/`bcc` → `400`), subject ≤ 300 and
single-line, text ≤ 20 000, `replyTo` a single-line email. `200 {ok:true}` / `400` / `405` / `500 misconfigured` / `502 send_failed`.

Client helper: `src/lib/lead-form.ts` (`buildLeadPayload(new FormData(form))` + `submitLead(payload)`),
which maps every status code to a user message. Field names: `form, email, org, role, use_case, consent, website,
cf-turnstile-response`. A no-JS `<form method="post" action="/api/lead">` works too (form-encoded).

Privacy notice text for the forms page (W3 owns the page): purpose = answering your request; retention = 24 months;
controller = WiseVision; deletion via hello@wisevision.tech.

## Layout

```
wrangler.toml                     Pages config: D1 LEADS → wv-leads, service LEAD_MAILER → wv-lead-mailer, TURNSTILE_SITE_KEY
migrations/0001_leads.sql         leads + lead_attempts tables and indexes
functions/api/lead.ts             route (onRequestPost / onRequest → 405)
functions/api/_middleware.ts      security headers + JSON errors
functions/_lib/lead.ts            the handler (pure, deps injectable)
workers/lead-mailer/              companion Worker: wrangler.toml (send_email LEAD_MAIL), src/index.ts
functions-dev/                    dev/test package (NOT deployed): vitest + @cloudflare/vitest-pool-workers, smoke
functions-dev/test/**             tests for functions/, workers/lead-mailer/ and src/lib/lead-form.ts
functions-dev/scripts/smoke.sh    wrangler dev (mailer) + wrangler pages dev + curl + local D1 count + captured .eml
```

`functions/` holds only deployable code, so wrangler compiles it straight from the repo root (no staging step).

## Local

```bash
cd functions-dev
npm ci
npm test                 # all suites in workerd (miniflare, local D1)
npm run coverage         # istanbul, threshold 80 % lines
npm run typecheck
npm run smoke            # needs no .dev.vars in the repo root (it writes a temporary one with the Turnstile TEST secret)
# or from the repo root: npm run test:functions
```

The smoke uses Cloudflare's documented Turnstile **test** secret `1x0000000000000000000000000000000AA` (always passes;
`2x0000000000000000000000000000000AA` always fails), never a real secret.

## Production (provisioned 2026-09-29; CI keeps it deployed)

Everything below is **already done** and idempotent to re-run. CI (`.github/workflows/ci.yml`, job `deploy`, push to
`main` only, after `build-test` + `functions` + `claims-lint`) deploys the mailer Worker first, then Pages
(`dist/` + `functions/`), then smoke-tests `/`, `/llms.txt` and `GET /api/lead` → 405.
Repo secrets used by CI: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

```bash
export HOME=/home/adam; set -a; . ~/.hermes/.env; set +a      # CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID; never print them
W=functions-dev/node_modules/.bin/wrangler                   # run from the repo root

# D1 (id 0c675264-1da8-41e6-a959-3c04b5a5a7a5 is already in wrangler.toml)
$W d1 migrations apply wv-leads --remote
$W d1 migrations list  wv-leads --remote                      # → "No migrations to apply!"

# Mailer Worker (send_email → verified destination adam.krawczyk0698@gmail.com, sender leads@wisevision.tech)
(cd workers/lead-mailer && npm ci && npx wrangler deploy)     # → "No targets deployed" is EXPECTED (no public surface)

# Pages secrets, via stdin only (production AND preview, so preview deploys work)
S=/home/adam/.hermes/state/wvrevive                           # 0600 files: turnstile-secret, ip-salt, e2e-key
for e in production preview; do
  tr -d '\n' < $S/turnstile-secret | $W pages secret put TURNSTILE_SECRET --project-name wisevision --env $e
  tr -d '\n' < $S/ip-salt          | $W pages secret put IP_SALT          --project-name wisevision --env $e
  tr -d '\n' < $S/e2e-key          | $W pages secret put E2E_KEY          --project-name wisevision --env $e
done

# Manual deploy (CI does this on main): preview first, production only via CI
npm run build && $W pages deploy dist --project-name wisevision --branch w7-preview
```

Live E2E (Turnstile bypassed with the E2E key; the row is tagged `[e2e]`):

```bash
K=$(cat /home/adam/.hermes/state/wvrevive/e2e-key)
curl -s -X POST https://wisevision.tech/api/lead -H 'content-type: application/json' -H "x-wv-e2e: $K" \
  --data '{"form":"contact","email":"adam.krawczyk0698+wvtest@gmail.com","org":"WiseVision E2E test","use_case":"e2e","consent":true}'
unset K
$W d1 execute wv-leads --remote --command "select id,ts,form,org from leads order by id desc limit 3"
```

To disable the bypass entirely: `$W pages secret delete E2E_KEY --project-name wisevision`.

Useful after launch:

```bash
# real leads in the last 30 days (excludes e2e rows)
$W d1 execute wv-leads --remote --command "select count(*) from leads where ts > strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days') and coalesce(use_case,'') not like '[e2e]%'"
# retention: delete rows older than 24 months
$W d1 execute wv-leads --remote --command "delete from leads where ts < strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 months')"
# deletion request (hello@):
$W d1 execute wv-leads --remote --command "delete from leads where email = 'person@example.org'"
```
