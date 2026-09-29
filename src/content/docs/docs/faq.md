---
title: FAQ
description: Common questions about ROS2 MCP, its licence, supported ROS 2 versions, networking and custom messages.
---

## Is ROS2 MCP free?

Yes. It is open source under the Mozilla Public License 2.0 (MPL-2.0), with every tool included and no licence key. You can use it in commercial products. If you change the server's own files and distribute them, MPL-2.0 asks you to share those changes to those files.

## Which ROS 2 versions are supported?

ROS 2 Humble and Jazzy. Use the image tag that matches your robot: `wisevision/ros2_mcp:humble` or `wisevision/ros2_mcp:jazzy`. The repository's CI runs the tests on both.

## Which AI clients work with it?

Any MCP client that can start a stdio server. There are exact configs for Claude Code, Claude Desktop, Cursor, Codex, VS Code and Hermes in [Connect your agent](/docs/ros2-mcp/connect/).

## Can the agent move my robot?

In the default mode, yes: it can publish on topics, call services and send action goals. Use [read-only mode](/docs/ros2-mcp/security/) (`-e ROS2_MCP_READONLY=1`) to let it observe only.

## What is the difference between `mcp/ros2` and `wisevision/ros2_mcp`?

They are built from the same source. `mcp/ros2` is the image in Docker's MCP catalog; Docker builds it and updates it on its own schedule. `wisevision/ros2_mcp:<humble|jazzy>` is built by us on every change to `main`, so it has the latest release first.

## The agent sees no topics, or topics but no messages

See the [quickstart troubleshooting list](/docs/ros2-mcp/quickstart/#if-the-agent-sees-no-topics-or-no-messages): the usual causes are a different `ROS_DOMAIN_ID`, a ROS 2 system on the host that needs `--network host --ipc host`, or discovery that is still running.

## How do I use my own message types?

Build your message packages into a folder and mount it into the container:

```bash
mkdir -p ~/mcp_custom_messages/src
cd ~/mcp_custom_messages/src
git clone <your message package repository>
cd ~/mcp_custom_messages
colcon build
```

Then add `-v ~/mcp_custom_messages:/app/custom_msgs` to the `docker run` arguments. The server sources `/app/custom_msgs/install/setup.bash` on start-up. Build with the same ROS 2 distribution as the image.

## Does it work without Docker?

Yes. Clone the repository in an environment where ROS 2 is sourced and run `uv run mcp_ros_2_server`. Most clients then use that as their command. Docker is the easy path because the image already contains ROS 2 and the common message packages.

## Does it open a network port?

No. By default it uses stdio only. See the [security model](/docs/ros2-mcp/security/#other-safeguards-in-the-server) for the optional SSE transport.

## How do I debug the server?

Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector docker run -i --rm wisevision/ros2_mcp:jazzy
```

## Where do I report a bug or ask a question?

Open an [issue on GitHub](https://github.com/wise-vision/ros2_mcp/issues), or join the [Discord](https://discord.gg/9aSw6HbUaw). For commercial questions, email [hello@wisevision.tech](mailto:hello@wisevision.tech).
