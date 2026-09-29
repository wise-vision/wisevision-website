---
title: "ROS2 MCP: connect AI agents to ROS 2"
description: "Open-source MCP server for ROS 2 (MPL-2.0). Topics, services and actions for Claude, Cursor and Codex. One Docker command. Read-only mode for real robots."
og_title: "ROS2 MCP: your agent can see your robot"
---

<!-- Copy for /ros2-mcp/ . Commands are copied verbatim from the ros2_mcp repo
     (README.md, installation/README.md, Dockerfile) or were executed; see the PR body.
     Do not edit a command here without changing it in ros2_mcp first. -->

## section:hero

eyebrow: Open source · MPL-2.0 · In Docker's MCP catalog

# Your agent can see your robot.

ROS2 MCP is a Model Context Protocol server for ROS 2. Point Claude, Cursor or Codex at it and your agent can list topics, read messages, call services and send action goals on a live ROS 2 graph. {#c:mcp-what} {#c:mcp-clients}

- primary_cta: Install → #install
- secondary_cta: Source on GitHub → https://github.com/wise-vision/ros2_mcp

## section:security

eyebrow: Read this first

### It can move your robot. Here is how to stop that.

By default ROS2 MCP can act, not only read: it exposes tools that publish on any topic, call any service and send or cancel action goals. On a simulator that is the point. On a machine with motors, decide before you connect. {#c:mcp-mutating-default}

The mutating tools are:

- `ros2_topic_publish`
- `ros2_publish_multiple_topics`
- `ros2_service_call`
- `ros2_send_action_goal`
- `ros2_cancel_action_goal`

**Read-only mode.** Set `ROS2_MCP_READONLY=1` (or pass `--read-only`) and those five tools are never registered. Your agent does not see them in the tool list, and calling one by name returns an unknown-tool error. Everything that observes stays on. {#c:mcp-readonly} {#c:mcp-readonly-hidden}

```bash
docker run -i --rm -e ROS2_MCP_READONLY=1 mcp/ros2
```

Read-only mode fails closed: a tool is only registered if it was reviewed and listed as read-only, and a test fails when a new tool is added without that review. {#c:mcp-readonly-failclosed}

Read-only mode ships in the next ROS2 MCP release; the image in Docker's catalog does not have it yet. {#c:mcp-readonly-release}

Also worth knowing:

- Transport is stdio. There is no port to expose and no web server to secure. An SSE transport exists and is off unless you start it with `--transport sse`. {#c:mcp-stdio} {#c:mcp-sse-optin}
- A service call with missing request fields is not sent until the agent sets `force_call`, so the model has to ask you first. {#c:mcp-force-call}
- The container sees your ROS 2 graph through DDS discovery like any other node. Keep it on the network segment you intend it to see.

Full lock-down steps: /docs/ros2-mcp/security/

## section:install

eyebrow: Install

### One command. Docker does the rest.

The image from Docker's MCP catalog: {#c:mcp-docker-catalog}

```bash
docker run -i --rm mcp/ros2
```

Or pick your ROS 2 distro. Claude Desktop config, from the ROS2 MCP install guide: {#c:mcp-distros}

```json
{
  "ros2_mcp": {
    "command": "docker",
    "args": [
      "run",
      "-i",
      "--rm",
      "wisevision/ros2_mcp:<humble/jazzy>"
    ],
    "env": {},
    "working_directory": null,
    "start_on_launch": true
  }
}
```

The server speaks stdio, so the same `docker run` command goes into any MCP client. Step-by-step for Claude, Cursor, Codex, VS Code Copilot and Warp: /docs/ros2-mcp/connect/ {#c:mcp-clients}

Build the image yourself:

```bash
git clone https://github.com/wise-vision/ros2_mcp.git
cd ros2_mcp
docker build -t ros2_mcp:<humble/jazzy>  --build-arg ROS_DISTRO=<humble/jazzy> .
```

Custom message packages: build them into `~/mcp_custom_messages` and mount the folder. {#c:mcp-custom-msgs}

```bash
mkdir -p ~/mcp_custom_messages/src
```

## section:tools

eyebrow: What your agent gets

### Topics, services, actions, maps and point clouds.

- **Discover.** List topics, services, actions and interfaces, with message fields and types, so the agent never guesses a schema. {#c:mcp-discover}
- **Read.** Subscribe to one topic or several at once and collect messages for a time window. {#c:mcp-subscribe} {#c:mcp-multi-subscribe}
- **See.** Turn an occupancy grid into a PNG map and a PointCloud2 into a bird's-eye-view image the model can look at. {#c:mcp-map-image} {#c:mcp-bev}
- **Look back.** Query history stored by WiseVision Data Black Box (InfluxDB). {#c:mcp-blackbox}
- **Act.** Publish, call services, send and cancel action goals, or publish to several topics at once. {#c:mcp-operate} {#c:mcp-multi-publish}
- **Prompts.** Built-in prompts for topic analysis, relays, node health checks and topic diffs. {#c:mcp-prompts}

The four tools that used to be in a paid Pro edition (multi-topic subscribe, multi-topic publish, map image, point-cloud BEV) are now part of the free MPL-2.0 package. {#c:mcp-pro-merged}

Full tool reference, generated from the code: /docs/ros2-mcp/tools/ {#c:docs-generated}

## section:proof

- Listed in Docker's official MCP catalog {#c:mcp-docker-catalog}
- Open source, MPL-2.0 {#c:mcp-license}
- ROS 2 Humble and Jazzy images {#c:mcp-distros}
- Connects to Claude, Cursor and Codex {#c:mcp-clients}

## section:cta

### Try it on a simulator first.

- cta: Quickstart → /docs/ros2-mcp/quickstart/
- cta_secondary: Need it on a real fleet? Talk to us → /contact/
