---
title: Connect your agent
description: Exact MCP configs for Claude Code, Claude Desktop, Cursor, Codex, VS Code and Hermes.
---

ROS2 MCP is a stdio MCP server in a Docker image. Every client below starts the same command:

```bash
docker run -i --rm wisevision/ros2_mcp:jazzy
```

Use the `:humble` tag for ROS 2 Humble. To lock the agent out of every tool that changes robot state, add `-e ROS2_MCP_READONLY=1` before the image name (see the [security model](/docs/ros2-mcp/security/)). If your robot uses a non-zero `ROS_DOMAIN_ID`, add `-e ROS_DOMAIN_ID=<id>` the same way. If ROS 2 runs directly on the host, add `--network host --ipc host` (see the [quickstart](/docs/ros2-mcp/quickstart/)).

The `-i` flag is required: it keeps stdin open, and stdin is the MCP channel.

## Claude Code

```bash
claude mcp add ros2 -- docker run -i --rm wisevision/ros2_mcp:jazzy
```

Read-only (the agent can observe but not move the robot):

```bash
claude mcp add ros2 -- docker run -i --rm -e ROS2_MCP_READONLY=1 wisevision/ros2_mcp:jazzy
```

Add `--scope project` to write it to `.mcp.json` in the current project and share it with your team:

```json
{
  "mcpServers": {
    "ros2": {
      "type": "stdio",
      "command": "docker",
      "args": ["run", "-i", "--rm", "wisevision/ros2_mcp:jazzy"],
      "env": {}
    }
  }
}
```

## Claude Desktop

Open Settings, then Developer, then Edit config, and add the server to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ros2": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "wisevision/ros2_mcp:jazzy"]
    }
  }
}
```

Restart Claude Desktop after saving.

## Cursor

Add the server to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (this project):

```json
{
  "mcpServers": {
    "ros2": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "wisevision/ros2_mcp:jazzy"]
    }
  }
}
```

## Codex CLI

```bash
codex mcp add ros2 -- docker run -i --rm wisevision/ros2_mcp:jazzy
```

This writes the following to `~/.codex/config.toml`, which you can also edit by hand:

```toml
[mcp_servers.ros2]
command = "docker"
args = ["run", "-i", "--rm", "wisevision/ros2_mcp:jazzy"]
```

Restart Codex after adding the server.

## VS Code (GitHub Copilot)

Open the Extensions view, then MCP Servers, add a server of type Docker Image and enter `mcp/ros2` (the image from Docker's MCP catalog). Or add it to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "ros2": {
      "type": "stdio",
      "command": "docker",
      "args": ["run", "-i", "--rm", "wisevision/ros2_mcp:jazzy"]
    }
  }
}
```

## Hermes

```bash
hermes mcp add ros2 --command docker --args run -i --rm wisevision/ros2_mcp:jazzy
```

Or add it to `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  ros2:
    command: docker
    args: ["run", "-i", "--rm", "wisevision/ros2_mcp:jazzy"]
```

## Docker MCP Toolkit

ROS2 MCP is listed in Docker's official MCP catalog as [`mcp/ros2`](https://hub.docker.com/mcp/server/ros2/overview). Docker builds that image from our repository and updates it on its own schedule, so it can lag behind the latest release. The `wisevision/ros2_mcp` images are built by us on every change to `main`.

## Build the image yourself

```bash
git clone https://github.com/wise-vision/ros2_mcp.git
cd ros2_mcp
docker build -t ros2_mcp:jazzy --build-arg ROS_DISTRO=jazzy .
```

Then use `ros2_mcp:jazzy` as the image name in any config above.

## Other options

- **Custom message packages:** build them into `~/mcp_custom_messages` and mount it with `-v ~/mcp_custom_messages:/app/custom_msgs`. See the [FAQ](/docs/faq/).
- **Extra prompts:** add `-e MCP_CUSTOM_PROMPTS=true`. See [Prompts](/docs/ros2-mcp/prompts/).
