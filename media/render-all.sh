#!/usr/bin/env bash
# media/render-all.sh — render every composition to media/renders/<name>.mp4 (+ poster JPG), then copy to
# the parent's scratch dir. Heavy: run under a memory-capped scope, e.g.
#   systemd-run --user --scope -p MemoryMax=12G bash media/render-all.sh [name-filter]
# Needs the proof clips first: bash media/proof/make-proof.sh
set -euo pipefail
export HOME=${HOME:-/home/adam}
MEDIA="$(cd "$(dirname "$0")" && pwd)"
OUT="$MEDIA/renders"
SCRATCH="${WV_SCRATCH:-/home/adam/.hermes/cache/scratch/wvrevive/D}"
mkdir -p "$OUT" "$SCRATCH"
FILTER="${1:-}"
node "$MEDIA/claims-check.mjs"
for dir in "$MEDIA"/compositions/*/; do
  name="$(basename "$dir")"
  [[ -n "$FILTER" && "$name" != *"$FILTER"* ]] && continue
  echo "== $name"
  (cd "$dir" && npx --no-install hyperframes lint . | tail -1)
  raw="$OUT/.$name.raw.mp4"
  (cd "$dir" && npx --no-install hyperframes render . -o "$raw" --quality delivery --strict --quiet >/dev/null)
  # Web delivery: H.264 high, yuv420p, faststart, no audio (explainers are silent). CRF picked to keep loops small.
  crf=24; [[ "$name" == hero-loop* ]] && crf=26
  ffmpeg -v error -y -i "$raw" -an -c:v libx264 -profile:v high -preset slow -crf "$crf" -pix_fmt yuv420p -movflags +faststart "$OUT/$name.mp4"
  # Size gates: Cloudflare Pages hard limit 25 MiB/file; 16:9 web loops must be <= 6 MB. Step CRF up until they fit.
  limit=26214400; [[ "$name" == *-16x9 ]] && limit=6000000
  while [[ $(stat -c %s "$OUT/$name.mp4") -gt $limit && $crf -lt 36 ]]; do
    crf=$((crf + 2)); echo "   size $(stat -c %s "$OUT/$name.mp4") > $limit, re-encode crf=$crf"
    ffmpeg -v error -y -i "$raw" -an -c:v libx264 -profile:v high -preset slow -crf "$crf" -pix_fmt yuv420p -movflags +faststart "$OUT/$name.mp4"
  done
  [[ $(stat -c %s "$OUT/$name.mp4") -le 26214400 ]] || { echo "FAIL: $name over 25 MiB"; exit 1; }
  rm -f "$raw"
  # Poster = a settled, content-bearing frame (hero: t=0 so the poster matches the first frame of the loop).
  pt=4.5; [[ "$name" == hero-loop* ]] && pt=0
  ffmpeg -v error -y -ss "$pt" -i "$OUT/$name.mp4" -frames:v 1 -q:v 3 "$OUT/$name.poster.jpg"
  cp "$OUT/$name.mp4" "$OUT/$name.poster.jpg" "$SCRATCH/"
  ls -la "$OUT/$name.mp4" | awk '{print $5, $9}'
done
