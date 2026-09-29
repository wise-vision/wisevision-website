#!/usr/bin/env bash
# Cut the "Real footage" proof clips from the old site's LFS recordings.
# Needs the real LFS bytes: `git lfs pull --include="static/gifs/*"`, or WV_GIFS=<a smudged clone>/static/gifs.
# Every clip is 6.5 s so it outlasts the scene that shows it. A <video> clip that ends before its scene does
# leaves the black .footage background on screen: that was the wave-1 "black REAL FOOTAGE panel" bug
# (5 s clips with data-duration=5 inside scenes that stay on screen for 6.45 s).
# claims-check.mjs now guards it: each <video src> must exist, be > 10 KB, and be >= its data-duration.
set -euo pipefail
cd "$(dirname "$0")"
G="${WV_GIFS:-../../static/gifs}"
if [[ ! -f "$G/ai_agent_chat.mp4" || $(stat -c %s "$G/ai_agent_chat.mp4") -lt 10000 ]]; then
  G=/home/adam/repos/wisevision-website/static/gifs   # LFS pointer files in the worktree: use the smudged clone
fi
# The output file is the LAST argument; codec flags must come before it (trailing ffmpeg options are ignored,
# which is how wave 1 shipped a yuv444p clip with an AAC track).
enc() {
  local out="${!#}"
  ffmpeg -v error -y "${@:1:$#-1}" -an -c:v libx264 -profile:v high -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart "$out"
}
# ROS2 MCP: Claude calls ros2_topic_publish, then checks /position (gif t=7.5..14 s).
# Crop to the chat column (480x360 of the 640x480 gif), 2x upscale so the text reads at >= 20 px in the render,
# panning down 60 px to follow the growing answer.
# (GIFs have no seekable keyframes, so trim in the filter graph and reset timestamps before the crop pan.)
enc -i "$G/mcp-ros2-server.gif" \
  -vf "trim=start=7.5:duration=6.5,setpts=PTS-STARTPTS,fps=30,crop=480:360:80:'40+min(t/6\,1)*60',scale=960:720:flags=lanczos,setsar=1" claude-ros2-topics.mp4
# WiseOS AI Agent (Grafana plugin): question -> tool approval -> ros2_topic_list result (t=10.3..16.8 s).
# Crop 600x400 of the 1914x986 source (chat column only), 1.5x scale, panning down as the answer appears.
enc -ss 10.3 -t 6.5 -i "$G/ai_agent_chat.mp4" \
  -vf "fps=30,crop=600:400:340:'190+min(max(t-1.5\,0)/3.5\,1)*250',scale=900:600:flags=lanczos,setsar=1" wiseos-agent-chat.mp4
# Drone mission from one plain-language order: "USER: EXECUTE MISSION FLY TO POINT X AND BACK" -> take-off (t=0..6.5 s).
# The window deliberately ends before the recording's later "flying to target" caption.
enc -ss 0 -t 6.5 -i "$G/ComandToStartandTakeoff.mp4" -vf "fps=30,scale=720:-2:flags=lanczos,setsar=1" drone-mission.mp4
for f in *.mp4; do
  printf '%s %s bytes %s\n' "$f" "$(stat -c %s "$f")" \
    "$(ffprobe -v error -show_entries stream=codec_name,pix_fmt,width,height:format=duration -of csv=p=0 "$f" | tr '\n' ' ')"
done
