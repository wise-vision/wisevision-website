#!/usr/bin/env bash
# Fails if the built site contains banned strings (people, old contact, Cookiebot, wrong licence).
set -euo pipefail
DIST="${1:-dist}"
PATTERN='michaldobrzanski|pawelmacuda|office@wisevision|Cookiebot|MIT License'
[ -d "$DIST" ] || { echo "dist-grep-gate: $DIST not found (run npm run build first)"; exit 2; }
if grep -rInE "$PATTERN" "$DIST"; then
  echo "dist-grep-gate: FAIL, banned strings found above"
  exit 1
fi
echo "dist-grep-gate: OK, no banned strings in $DIST"
