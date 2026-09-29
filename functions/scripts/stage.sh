#!/usr/bin/env bash
# Build a clean Pages project root for `wrangler pages dev` / `wrangler pages deploy`.
#
# Why: the Pages route scanner compiles EVERY .js/.ts file under ./functions, including this package's
# node_modules (it fails on .d.ts files) and the tests. The stage holds only the routes (api/ + _lib/),
# with node_modules symlinked (the scanner skips symlinks; esbuild still resolves imports through it).
#
# usage: scripts/stage.sh <stage_dir> <static_dist_dir>
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"          # functions/
REPO="$(cd "$HERE/.." && pwd)"
STAGE="${1:?stage dir}"
DIST="$(cd "${2:?static dist dir}" && pwd)"
[ -d "$HERE/node_modules" ] || (cd "$HERE" && npm ci)

rm -rf "$STAGE" && mkdir -p "$STAGE/functions"
cp -r "$HERE/api" "$HERE/_lib" "$STAGE/functions/"
ln -s "$HERE/node_modules" "$STAGE/functions/node_modules"
cp -r "$REPO/migrations" "$STAGE/"
cp -r "$DIST" "$STAGE/dist"
cp "$REPO/wrangler.toml" "$STAGE/wrangler.toml"
echo "staged Pages root at $STAGE"
