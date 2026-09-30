---
title: Security model
description: Which ROS2 MCP tools can change robot state, and how to lock them out with read-only mode.
review: approved-adam-2026-09-30
---

An agent connected to ROS2 MCP acts with the permissions of a ROS 2 node on your network. With the default configuration it can move a robot. Read this page before you connect an agent to real hardware.

## The tools that change robot state

These five tools are **registered by default**. Each one can change what a robot does:

| Tool | What it can do |
| --- | --- |
| `ros2_topic_publish` | Publish any message on any topic, for example velocity commands on `/cmd_vel`. |
| `ros2_publish_multiple_topics` | Publish on several topics at once, repeatedly, at a set frequency for a set duration. |
| `ros2_service_call` | Call any service. The server cannot know whether a service has side effects (reset, arm, set a parameter, ...), so every service call counts as a change. |
| `ros2_send_action_goal` | Send a goal to any action server: navigate, move an arm, take off. |
| `ros2_cancel_action_goal` | Cancel running goals. Stopping a robot mid-task is also a change. |

The server does not ask for confirmation before it runs one of these. Whether your agent asks you first depends on the client and its settings.

## Lock it down: read-only mode

Read-only mode removes all five tools. The agent can still list topics, services and actions, subscribe to topics, read maps and point clouds, and query recorded data.

1. Add `-e ROS2_MCP_READONLY=1` to the `docker run` command in your MCP client config, before the image name:

   ```json
   {
     "mcpServers": {
       "ros2": {
         "command": "docker",
         "args": ["run", "-i", "--rm", "-e", "ROS2_MCP_READONLY=1", "wisevision/ros2_mcp:jazzy"]
       }
     }
   }
   ```

   Outside Docker, use the flag instead: `uv run mcp_ros_2_server --read-only`. The values `1`, `true`, `yes` and `on` all enable it.

2. Restart the MCP client, so it starts a new server process.

3. Check it. On start-up the server writes `Starting ROS2 MCP server using "stdio" transport (read-only)` to stderr, and your client's tool list must not contain any of the five tools above.

In read-only mode the five tools are **not registered at all**. They are absent from `list_tools`, and a call to one of them fails with `Unknown tool: ros2_topic_publish`. We ran this check with a real MCP client against the release image: 24 tools in the default mode, 19 in read-only mode, and the publish call was refused.

Read-only mode fails closed. The server registers only the tools that are explicitly listed as read-only in [`server/tool_safety.py`](https://github.com/wise-vision/ros2_mcp/blob/2610/server/tool_safety.py). A new tool that nobody has classified is left out of read-only mode, and a test in the repository fails until it is classified.

Read-only mode needs release 2610 or later. The `mcp/ros2` image in Docker's MCP catalog is built by Docker and can lag behind; check that its start-up line says `(read-only)`, or use `wisevision/ros2_mcp`.

## What read-only mode does not cover

- **It is a switch in the server, not a ROS 2 permission.** Anyone who can edit the client config can remove the flag. For hard guarantees, use [SROS 2](https://docs.ros.org/en/jazzy/Tutorials/Advanced/Security/Introducing-ros2-security.html) access control on the ROS 2 side as well.
- **Reading is not harmless.** Subscribed messages (camera images, maps, positions) go to the agent's model provider. Choose the topics and the provider with that in mind.
- **`ros2_get_messages_stored_in_influx_data_base`** stays available. It calls only the Data Black Box query service `/get_messages`, which reads stored messages.
- **Prompts** that describe publishing or sending goals (for example `base.ros2-topic-relay`) still appear, but the tools they need are gone, so they fail.

## Other safeguards in the server

- **stdio by default.** The server talks to its client over stdin/stdout and opens no network port. An SSE transport exists, but it starts only with `--transport sse`, and then it listens on `127.0.0.1:8123` without authentication. Do not expose that port.
- **Incomplete service requests are held back.** If the agent leaves out request fields, `ros2_service_call` does not call the service; it returns the missing fields and asks the agent to add them or to set `force_call`.
- **Isolate with ROS_DOMAIN_ID.** The server only sees nodes on its ROS domain. Run agents against a test or simulation domain first.

## Recommended setup

| Situation | Setup |
| --- | --- |
| Exploring a live robot or fleet | Read-only mode. |
| Development in simulation | Default mode, on a separate `ROS_DOMAIN_ID`. |
| Letting an agent act on real hardware | Default mode only with a person watching, a hardware emergency stop, and a client that asks before every tool call. |

Found a security problem? Email [hello@wisevision.tech](mailto:hello@wisevision.tech).
