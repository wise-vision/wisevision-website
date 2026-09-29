#!/usr/bin/env bash
# Local end-to-end smoke for POST /api/lead under `wrangler pages dev` + local D1 (no Cloudflare account used,
# except the public Turnstile siteverify endpoint, called with Cloudflare's always-pass TEST secret).
#
# Runs straight from the repo root: functions/ holds only deployable code, so no staging step is needed.
# Local D1 state goes to a throwaway --persist-to dir, so the smoke never touches your dev state.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"          # functions-dev/
REPO="$(cd "$HERE/.." && pwd)"
STATE="${STATE:-${TMPDIR:-/tmp}/wv-lead-smoke}"
PORT="${PORT:-8788}"
WRANGLER="$HERE/node_modules/.bin/wrangler"
[ -x "$WRANGLER" ] || (cd "$HERE" && npm ci)
rm -rf "$STATE" && mkdir -p "$STATE"
cp -r "$HERE/test-fixtures/dist" "$STATE/dist"
[ -e "$REPO/.dev.vars" ] && { echo "refusing to overwrite $REPO/.dev.vars"; exit 1; }
printf 'TURNSTILE_SECRET=%s\nIP_SALT=local-smoke-salt\n' "1x0000000000000000000000000000000AA" > "$REPO/.dev.vars"
PID=""
MPID=""
cleanup() { for p in $PID $MPID; do kill "$p" 2>/dev/null || true; done; rm -f "$REPO/.dev.vars"; }
trap cleanup EXIT
cd "$REPO"
P=(--persist-to "$STATE/state")

d1() { "$WRANGLER" d1 execute wv-leads --local "${P[@]}" --command "$1" 2>&1 | grep -v '^$'; }

echo "== apply migrations (local)"
"$WRANGLER" d1 migrations apply wv-leads --local "${P[@]}" 2>&1 | tail -n 8
echo "== count before"
d1 "select count(*) as n from leads"

# The companion mailer Worker (owns send_email). `wrangler dev` registers it in the local dev registry, so
# the Pages project's LEAD_MAILER service binding resolves to it; its send_email writes a local .eml.
MAILER_DIR="$REPO/workers/lead-mailer"
[ -d "$MAILER_DIR/node_modules" ] || (cd "$MAILER_DIR" && npm ci)
"$WRANGLER" dev --config "$MAILER_DIR/wrangler.toml" --port "$((PORT + 1))" --ip 127.0.0.1 --persist-to "$STATE/mailer" > "$STATE/mailer-dev.log" 2>&1 &
MPID=$!
sleep 4
"$WRANGLER" pages dev "$STATE/dist" "${P[@]}" --port "$PORT" --ip 127.0.0.1 > "$STATE/pages-dev.log" 2>&1 &
PID=$!
for _ in $(seq 1 60); do curl -sf "http://127.0.0.1:$PORT/" >/dev/null && break; sleep 1; done

URL="http://127.0.0.1:$PORT/api/lead"
EMAIL="smoke+$(date +%s)@example.org"
echo "== POST valid lead ($EMAIL)"
curl -sS -i -X POST "$URL" -H 'content-type: application/json' -H "origin: http://127.0.0.1:$PORT" \
  --data "{\"form\":\"early-access\",\"email\":\"$EMAIL\",\"org\":\"Smoke Robotics\",\"role\":\"QA\",\"use_case\":\"local smoke\",\"consent\":true,\"website\":\"\",\"cf-turnstile-response\":\"XXXX.DUMMY.TOKEN.XXXX\"}"
echo; echo "== POST same lead again (duplicate)"
curl -sS -X POST "$URL" -H 'content-type: application/json' \
  --data "{\"form\":\"early-access\",\"email\":\"$EMAIL\",\"consent\":true,\"cf-turnstile-response\":\"XXXX.DUMMY.TOKEN.XXXX\"}"
echo; echo "== POST honeypot filled (expect 400)"
curl -sS -X POST "$URL" -H 'content-type: application/json' \
  --data '{"form":"contact","email":"bot@example.org","consent":true,"website":"http://spam","cf-turnstile-response":"x"}'
echo; echo "== GET (expect 405)"
curl -sS -o /dev/null -w '%{http_code}\n' "$URL"
echo "== POST cross-origin (expect 403)"
curl -sS -X POST "$URL" -H 'content-type: application/json' -H 'origin: https://evil.example' --data '{}'
echo
sleep 1
# The local send_email logs the path of the .eml it wrote.
EML_SRC="$(sed -n 's/^Email: \(.*\.eml\)$/\1/p' "$STATE/mailer-dev.log" | tail -n 1)"
if [ -n "$EML_SRC" ] && [ -f "$EML_SRC" ]; then cp "$EML_SRC" "$STATE/last-lead.eml"; fi
kill $PID $MPID 2>/dev/null || true; wait $PID $MPID 2>/dev/null || true; PID=""; MPID=""
echo "== count after"
d1 "select count(*) as n from leads"
echo "== last row"
d1 "select id, ts, form, email, org, consent, length(ip_hash) as ip_hash_len from leads order by id desc limit 1"
echo "== send_email / mail lines from pages dev log"
grep -iE "email|mail|lead_" "$STATE/pages-dev.log" "$STATE/mailer-dev.log" | head -n 20 || true
EML="$STATE/last-lead.eml"
if [ -f "$EML" ]; then
  echo "== captured .eml headers (local send_email)"
  tr -d '\r' < "$EML" | grep -E '^(From|To|Reply-To|Subject|Content-Type|Content-Transfer-Encoding):'
  echo "== decoded subject"
  tr -d '\r' < "$EML" | sed -n 's/^Subject: =?utf-8?B?\(.*\)?=$/\1/p' | base64 -d; echo
  echo "== decoded body"
  tr -d '\r' < "$EML" | awk 'f{print} /^$/{f=1}' | base64 -d 2>/dev/null || true
fi
