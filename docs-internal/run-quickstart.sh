#!/usr/bin/env bash
# Clean-box run of the docs quickstart (/docs/ros2-mcp/quickstart/), end to end, with a real MCP client.
# Needs: docker, uv. Writes a Markdown transcript to stdout.
#   bash docs-internal/run-quickstart.sh [image] > docs-internal/quickstart-transcript.md
set -euo pipefail
IMAGE="${1:-wisevision/ros2_mcp:jazzy}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CLIENT="$HERE/quickstart_client.py"
DOMAIN=42   # isolated ROS_DOMAIN_ID so a stray robot on the LAN cannot leak into the run

cleanup() { docker rm -f wv-quickstart-talker >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

echo "# ROS2 MCP quickstart: clean-box transcript"
echo
echo "- date (UTC): $(date -u +%FT%TZ)"
echo "- host: $(uname -srm), $(docker --version)"
echo "- server image: \`$IMAGE\` ($(docker image inspect "$IMAGE" --format '{{.Id}} created {{.Created}}' 2>/dev/null || echo 'pulled below'))"
echo "- MCP client: the official \`mcp\` Python SDK over stdio (\`docs-internal/quickstart_client.py\`), launched with \`uv run\`"
echo "- robot: a fresh \`ros:jazzy-ros-base\` container publishing \`/chatter\` (the quickstart's step 1)"
echo "- produced by: \`bash docs-internal/run-quickstart.sh $IMAGE\`"
echo
echo "## Step 1: start a demo robot"
echo '```console'
echo "\$ docker run -d --name wv-quickstart-talker -e ROS_DOMAIN_ID=$DOMAIN ros:jazzy-ros-base bash -c 'source /opt/ros/jazzy/setup.bash && ros2 topic pub -r 2 /chatter std_msgs/msg/String \"{data: hello from the robot}\"'"
docker run -d --name wv-quickstart-talker -e ROS_DOMAIN_ID=$DOMAIN ros:jazzy-ros-base \
  bash -c 'source /opt/ros/jazzy/setup.bash && ros2 topic pub -r 2 /chatter std_msgs/msg/String "{data: hello from the robot}"'
sleep 4
echo "\$ docker logs wv-quickstart-talker | head -2"
docker logs wv-quickstart-talker 2>&1 | head -2
echo '```'
echo
echo "## Steps 2-3: the MCP client starts the server (\`docker run -i --rm $IMAGE\`) and calls tools"
echo '```text'
uv run -q "$CLIENT" -- run -i --rm -e ROS_DOMAIN_ID=$DOMAIN "$IMAGE" 2>/dev/null
echo '```'
echo
echo "## Security: read-only mode (\`-e ROS2_MCP_READONLY=1\`)"
echo "Same client, same robot. Expected: no mutating tool in \`list_tools\`, and \`ros2_topic_publish\` errors."
echo '```text'
uv run -q "$CLIENT" --readonly -- run -i --rm -e ROS_DOMAIN_ID=$DOMAIN -e ROS2_MCP_READONLY=1 "$IMAGE" 2>/dev/null
echo '```'
