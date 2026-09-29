#!/usr/bin/env bash
# media/publish-release.sh — upload the rendered explainers to the GitHub Release `media-v1`.
# MP4s never enter git (no R2): CI runs `gh release download media-v1 -D public/media` before `npm run build`,
# so Pages serves them same-origin at /media/<name>.mp4.
# Usage: bash media/publish-release.sh [tag]      (needs gh auth with write access to the repo)
set -euo pipefail
MEDIA="$(cd "$(dirname "$0")" && pwd)"
TAG="${1:-media-v1}"
REPO="${WV_REPO:-wise-vision/wisevision-website}"
shopt -s nullglob
files=("$MEDIA"/renders/*.mp4 "$MEDIA"/renders/*.jpg)
(( ${#files[@]} )) || { echo "no renders in $MEDIA/renders; run media/render-all.sh first"; exit 1; }
for f in "${files[@]}"; do
  s=$(stat -c %s "$f")
  [[ $s -gt 102400 || $f == *.jpg ]] || { echo "FAIL: $f is only $s bytes"; exit 1; }
  [[ $s -le 26214400 ]] || { echo "FAIL: $f over the 25 MiB Pages limit"; exit 1; }
done
gh release view "$TAG" -R "$REPO" >/dev/null 2>&1 || gh release create "$TAG" -R "$REPO" --title "Media $TAG" \
  --notes "HyperFrames explainer videos + posters for wisevision.tech. Served from /media/ (CI downloads them into public/media before the build). Rebuild: media/README.md."
gh release upload "$TAG" -R "$REPO" --clobber "${files[@]}"
gh release view "$TAG" -R "$REPO" --json assets -q '.assets[] | "\(.size)\t\(.name)"'
