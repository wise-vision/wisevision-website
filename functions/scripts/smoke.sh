#!/usr/bin/env bash
# Local end-to-end smoke for POST /api/lead under `wrangler pages dev` + local D1 (no Cloudflare account used,
# except the public Turnstile siteverify endpoint, called with Cloudflare's always-pass TEST secret).
#
# Runs against a clean stage (scripts/stage.sh): see that file for why.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"          # functions/
REPO="$(cd "$HERE/.." && pwd)"
STAGE="${STAGE:-${TMPDIR:-/tmp}/wv-lead-smoke}"
PORT="${PORT:-8788}"
WRANGLER="$HERE/node_modules/.bin/wrangler"

"$HERE/scripts/stage.sh" "$STAGE" "$HERE/test-fixtures/dist"
cat > "$STAGE/.dev.vars" <<VARS
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
IP_SALT=local-smoke-salt
VARS
cd "$STAGE"

d1() { "$WRANGLER" d1 execute wv-leads --local --command "$1" 2>&1 | grep -v '^$'; }

echo "== apply migrations (local)"
"$WRANGLER" d1 migrations apply wv-leads --local 2>&1 | tail -n 8
echo "== count before"
d1 "select count(*) as n from leads"

"$WRANGLER" pages dev dist --port "$PORT" --ip 127.0.0.1 > "$STAGE/pages-dev.log" 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
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
EML_SRC="$(find "$STAGE/.wrangler/tmp" -name '*.eml' 2>/dev/null | head -n 1)"
[ -n "$EML_SRC" ] && cp "$EML_SRC" "$STAGE/last-lead.eml"
kill $PID 2>/dev/null || true; wait $PID 2>/dev/null || true; trap - EXIT
echo "== count after"
d1 "select count(*) as n from leads"
echo "== last row"
d1 "select id, ts, form, email, org, consent, length(ip_hash) as ip_hash_len from leads order by id desc limit 1"
echo "== send_email / mail lines from pages dev log"
grep -iE "email|mail|lead_" "$STAGE/pages-dev.log" | head -n 20 || true
EML="$STAGE/last-lead.eml"
if [ -f "$EML" ]; then
  echo "== captured .eml headers (local send_email)"
  tr -d '\r' < "$EML" | grep -E '^(From|To|Reply-To|Subject|Content-Type|Content-Transfer-Encoding):'
  echo "== decoded subject"
  tr -d '\r' < "$EML" | sed -n 's/^Subject: =?utf-8?B?\(.*\)?=$/\1/p' | base64 -d; echo
  echo "== decoded body"
  tr -d '\r' < "$EML" | awk 'f{print} /^$/{f=1}' | base64 -d 2>/dev/null || true
fi
