---
title: Data Black Box
description: Let your agent query past ROS 2 messages stored by the WiseVision Data Black Box, not only live topics.
---

A live subscription shows what a robot says now. To ask about the past ("what was the battery voltage when it stopped?"), the messages must be recorded somewhere. The [WiseVision Data Black Box](https://github.com/wise-vision/wisevision_data_black_box) (open source, MPL-2.0) records chosen ROS 2 topics to InfluxDB through a Zenoh server, and answers queries through the ROS 2 service `/get_messages`.

ROS2 MCP talks to it with one tool, `ros2_get_messages_stored_in_influx_data_base`.

## How it works

1. The Data Black Box node (`ros2 run wisevision_data_black_box black_box`) runs next to InfluxDB and a Zenoh server, and stores the topics you point it at.
2. The agent calls `ros2_get_messages_stored_in_influx_data_base` with a topic, its message type and an optional time window.
3. ROS2 MCP calls `/get_messages` (type `lora_msgs/srv/GetMessages`) and returns the stored messages with their timestamps.

The tool calls only `/get_messages`, which reads. It stays available in [read-only mode](/docs/ros2-mcp/security/).

## Arguments

| Argument | Required | Meaning |
| --- | --- | --- |
| `topic_name` | yes | The recorded topic. |
| `message_type` | yes | Full message type used to decode it, for example `sensor_msgs/msg/BatteryState`. |
| `number_of_messages` | no | How many messages to return (default `0`). |
| `time_start` | no | ISO 8601 timestamp: only messages after it. |
| `time_end` | no | ISO 8601 timestamp: only messages before it. |

The full schema is in the [tool reference](/docs/ros2-mcp/tools/).

## Set it up

The Data Black Box is a separate ROS 2 package. Build and run it with the guides in its repository:

- [Build and run](https://github.com/wise-vision/wisevision_data_black_box/blob/main/docs/BUILD.md): colcon build, the `config.json` with your Zenoh REST URL, and `DB_ADDRESS` / `DB_PORT` for InfluxDB.
- [Minimal example](https://github.com/wise-vision/wisevision_data_black_box/blob/main/docs/MINIMAL_EXAMPLE.md): create the InfluxDB storage, choose the topics to record, and query them.

The ROS2 MCP Docker image already contains the message types the tool needs. The server and the Data Black Box must be on the same ROS domain.

If `/get_messages` is not running, the tool returns `Service '/get_messages' not available (timeout).`

## In WiseOS

[WiseOS](/docs/wiseos/) (early access) sets the Data Black Box, InfluxDB and a dashboard up for a whole fleet in one deployment.
