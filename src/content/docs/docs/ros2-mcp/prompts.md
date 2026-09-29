---
title: Prompts
description: The MCP prompts that ship with ROS2 MCP, the optional prompt pack, and how to add your own.
---

MCP prompts are ready-made instructions that your client offers as templates (in Claude Desktop and VS Code they appear as slash commands or in the prompt picker). You fill in a few arguments; the prompt tells the agent which tools to call and how to report. See the [MCP specification](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts) for how clients show them.

## Built-in prompts

These four are always available:

| Prompt | What it does | Arguments (required in bold) |
| --- | --- | --- |
| `base.ros2-topic-echo-and-analyze` | Subscribes to a topic for a while and reports message rate, count and statistics of numeric fields. Picks the topic itself if there is only one. | `topic_name`, **`duration_sec`**, **`analysis_type`** (`statistics`, `rate`, `message_count` or `all`) |
| `base.ros2-topic-relay` | Subscribes to one topic and republishes on another, optionally rate-limited or filtered. | **`source_topic`**, **`destination_topic`**, **`message_type`**, `transform` (`identity`, `rate_limit`, `filter`), `target_rate_hz`, **`duration_sec`** |
| `base.ros2-node-health-check` | Checks that the topics and services you expect exist, and optionally that topics publish fast enough. | `expected_topics`, `expected_services`, **`check_rates`**, `rate_check_duration_sec`, `min_expected_rate_hz` |
| `base.ros2-topic-diff-monitor` | Compares the messages on two topics field by field, for example raw against filtered sensor data. | **`topic1_name`**, **`topic2_name`**, **`duration_sec`**, `diff_fields`, `tolerance_percent`, `sync_by_timestamp` |

`base.ros2-topic-relay` publishes, so it needs the publish tools. It fails in [read-only mode](/docs/ros2-mcp/security/).

## The prompt pack: Nav2 and MAVROS

The open-source [ros2_mcp_prompts](https://github.com/wise-vision/ros2_mcp_prompts) pack (MPL-2.0) is included in the Docker image. Turn it on with `-e MCP_CUSTOM_PROMPTS=true`:

```json
{
  "mcpServers": {
    "ros2": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "MCP_CUSTOM_PROMPTS=true", "wisevision/ros2_mcp:jazzy"]
    }
  }
}
```

It adds:

| Prompt | What it does |
| --- | --- |
| `nav2.nav2-navigate-to-pose` | Sends a Nav2 `NavigateToPose` goal from x, y and yaw in the map frame, follows the feedback and cancels on timeout. |
| `mavros2.drone-simple-takeoff` | Takes a MAVROS2 / ArduPilot drone off to a target altitude, and optionally lands it again. |
| `mavros2.drone-mavros2-mission` | Builds a full MAVLink mission (takeoff, waypoint, return to launch, land) from a target position and switches to AUTO. |

All three send action goals or call services, so they move the robot. They do not work in read-only mode.

## Your own prompts

Put your prompts in a Python module in a local folder, mount it, and point the server at it:

```bash
docker run -i --rm \
  -e MCP_CUSTOM_PROMPTS=true \
  -e MCP_PROMPTS_LOCAL=true \
  -v /path/to/ros2_mcp_prompts:/app/ros2_mcp_prompts \
  wisevision/ros2_mcp:jazzy
```

The module (default name `extension_prompts`, set with `MCP_PROMPTS_MODULE`) exposes its prompts through a `register_prompts()` function, an `ALL_PROMPTS` list or a `get_prompts()` function. Each prompt is a `BasePromptHandler` with a name, a description, its arguments and a message template. The step-by-step guide is [CREATE_PROMPT.md](https://github.com/wise-vision/ros2_mcp/blob/2610/docs/CREATE_PROMPT.md).
