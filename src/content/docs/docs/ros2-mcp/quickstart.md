---
title: "Quickstart: ROS2 MCP with Docker in 5 minutes"
description: Start a demo ROS 2 robot, run ROS2 MCP in Docker and let your AI agent read its topics.
---

You need Docker and an MCP client (Claude Code, Claude Desktop, Cursor, Codex, VS Code, ...). You do not need ROS 2 installed: the server image contains it.

## 1. Start a demo robot

If you already have a ROS 2 system running, skip to step 2. Otherwise, start a container that publishes `std_msgs/msg/String` on `/chatter` twice a second:

```bash
docker run -d --name demo-robot ros:jazzy-ros-base \
  bash -c 'source /opt/ros/jazzy/setup.bash && ros2 topic pub -r 2 /chatter std_msgs/msg/String "{data: hello from the robot}"'
```

## 2. Add ROS2 MCP to your agent

The server speaks MCP over stdio, so your client starts it as a subprocess. The command is:

```bash
docker run -i --rm wisevision/ros2_mcp:jazzy
```

Use `wisevision/ros2_mcp:humble` for a ROS 2 Humble system. With Claude Code, one line registers it:

```bash
claude mcp add ros2 -- docker run -i --rm wisevision/ros2_mcp:jazzy
```

For other clients, see [Connect your agent](/docs/ros2-mcp/connect/). Restart the client (or reload its MCP servers) after changing the config.

:::tip[Start read-only]
On a real robot, start with `-e ROS2_MCP_READONLY=1` so the agent can observe but cannot publish, call services or send action goals. With Claude Code:

```bash
claude mcp add ros2 -- docker run -i --rm -e ROS2_MCP_READONLY=1 wisevision/ros2_mcp:jazzy
```

See the [security model](/docs/ros2-mcp/security/).
:::

## 3. Ask your agent

Try:

- "List the ROS 2 topics."
- "Read three messages from /chatter."

The agent calls `ros2_topic_list`, then `ros2_topic_subscribe`, and gets back:

```text
[/chatter] 3 messages received.
{ "/chatter#0": { "_data": "hello from the robot", ... } }
```

## If the agent sees no topics or no messages

- **ROS_DOMAIN_ID.** If your robot uses a domain ID other than 0, pass the same one: `docker run -i --rm -e ROS_DOMAIN_ID=<id> wisevision/ros2_mcp:jazzy`.
- **ROS 2 runs on the host itself (not in a container).** Add `--network host --ipc host`. Without `--ipc host` the topics are listed, but messages sent over Fast DDS shared memory do not arrive.
- **The robot is another machine on your network.** DDS discovery uses multicast, which Docker's default bridge network does not forward. Add `--network host`.
- **Right after start-up the list is incomplete.** DDS discovery can take a moment. The server waits for it once, on the first call; tune it with `MCP_ROS_DISCOVERY_STABLE_SEC` (default `1.0`) and `MCP_ROS_DISCOVERY_TIMEOUT_SEC` (default `5.0`).
- **Custom message types.** Build your message packages into `~/mcp_custom_messages` and mount it: `-v ~/mcp_custom_messages:/app/custom_msgs`. See the [FAQ](/docs/faq/).

## Clean up

```bash
docker rm -f demo-robot
```

## Next

- [Security model](/docs/ros2-mcp/security/): what the agent can change, and read-only mode.
- [Tool reference](/docs/ros2-mcp/tools/): every tool the server registers.
