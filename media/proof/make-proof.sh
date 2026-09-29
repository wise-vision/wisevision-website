#!/usr/bin/env bash
# Cut the "Real footage" proof clips (best 5 s) from the old site's LFS recordings.
# Needs: git lfs pull --include="static/gifs/*"  (run from the repo root first).
set -euo pipefail
cd "$(dirname "$0")"
G=../../static/gifs
enc() { ffmpeg -v error -y "$@" -an -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart; }
# Claude calling ros2_topic_list / ros2_topic_publish on a live graph (t=7..12 s)
enc -ss 7 -t 5 -i "$G/mcp-ros2-server.gif" -vf "fps=30,scale=960:-2:flags=lanczos" claude-ros2-topics.mp4
# WiseOS AI Agent (Grafana plugin): question -> tool approval -> topic list (t=10..15 s)
enc -ss 10 -t 5 -i "$G/ai_agent_chat.mp4" -vf "fps=30,scale=1280:-2:flags=lanczos" wiseos-agent-chat.mp4
# Drone mission, "AI: FLYING TO TARGET NUMBER ONE" (t=8..13 s), vertical source
enc -ss 8 -t 5 -i "$G/ComandToStartandTakeoff.mp4" -vf "fps=30,scale=720:-2:flags=lanczos" drone-mission.mp4
ls -la *.mp4
