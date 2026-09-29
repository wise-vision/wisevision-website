#!/usr/bin/env bash
# media/frame-grabs.sh — one PNG per scene (settled frame) from each rendered MP4, for the parent's vision grade.
set -euo pipefail
MEDIA="$(cd "$(dirname "$0")" && pwd)"
OUT="${WV_FRAMES:-/home/adam/.hermes/cache/scratch/wvrevive/D/frames}"
# scene settle times (s): after the last entrance tween of each scene
declare -A AT=(
  [ros2-mcp-30s]="4.5 12.5 19.5 23.5 29.0"
  [wiseos-30s]="4.5 11.5 17.5 23.0 29.0"
  [defence-30s]="4.5 11.5 17.5 23.0 29.0"
  [hero-loop-8s]="0.0 1.6 2.8 5.5"
)
for mp4 in "$MEDIA"/renders/*.mp4; do
  name="$(basename "$mp4" .mp4)"; base="${name%-*}"
  dir="$OUT/$name"; mkdir -p "$dir"; i=1
  for t in ${AT[$base]}; do
    ffmpeg -v error -y -ss "$t" -i "$mp4" -frames:v 1 "$dir/scene-$i-t${t}s.png"; i=$((i + 1))
  done
  echo "$dir: $(ls "$dir" | wc -l) frames"
done
