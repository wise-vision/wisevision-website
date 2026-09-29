# ROS2 MCP quickstart: clean-box transcript

- date (UTC): 2026-09-29T20:29:24Z
- host: Linux 7.0.0-34-generic x86_64, Docker version 29.8.1, build 4a63305
- server image: `wisevision/ros2_mcp:jazzy-amd64` (sha256:26003d45ca18325160f4b3488c55733eb7b736eb4df9e96f905d991968d88f89 created 2026-09-29T19:24:32.600511499Z)
- why `jazzy-amd64`: the per-arch tag pushed by ros2_mcp run 36618782009 (the push of tag 2610's commit 2909bf6, AMD64 job green). The multi-arch `:jazzy` tag the docs use is re-pointed only after the ARM64 jobs finish, and they were still building on the self-hosted runner during this run. Same image content on amd64; the docs keep `:jazzy`.
- MCP client: the official `mcp` Python SDK over stdio (`docs-internal/quickstart_client.py`), launched with `uv run`
- robot: a fresh `ros:jazzy-ros-base` container publishing `/chatter` (the quickstart's step 1)
- produced by: `bash docs-internal/run-quickstart.sh wisevision/ros2_mcp:jazzy-amd64`

## Step 1: start a demo robot
```console
$ docker run -d --name wv-quickstart-talker -e ROS_DOMAIN_ID=42 ros:jazzy-ros-base bash -c 'source /opt/ros/jazzy/setup.bash && ros2 topic pub -r 2 /chatter std_msgs/msg/String "{data: hello from the robot}"'
d2565d78c3e123c321ac6c638677187288da7fcd1480d218db5c0f05c40ffb76
$ docker logs wv-quickstart-talker | head -2
```

## Steps 2-3: the MCP client starts the server (`docker run -i --rm wisevision/ros2_mcp:jazzy-amd64`) and calls tools
```text
$ docker run -i --rm -e ROS_DOMAIN_ID=42 wisevision/ros2_mcp:jazzy-amd64
serverInfo: ROS2 MCP 1.28.1
list_tools: 24 tools
  ros2_action_request_result, ros2_action_subscribe_feedback, ros2_action_subscribe_status, ros2_cancel_action_goal, ros2_get_map_as_image, ros2_get_message_fields, ros2_get_messages_stored_in_influx_data_base, ros2_get_pointcloud_as_bev, ros2_interface_list, ros2_list_actions, ros2_publish_multiple_topics, ros2_send_action_goal, ros2_service_call, ros2_service_list, ros2_stream_next, ros2_stream_next_image, ros2_stream_start, ros2_stream_stop, ros2_subscribe_multiple_topics, ros2_topic_list, ros2_topic_publish, ros2_topic_subscribe, ros2_viewer_app, ros2_viewer_config
list_prompts: 4 prompts: base.ros2-node-health-check, base.ros2-topic-diff-monitor, base.ros2-topic-echo-and-analyze, base.ros2-topic-relay
mutating tools present: ['ros2_cancel_action_goal', 'ros2_publish_multiple_topics', 'ros2_send_action_goal', 'ros2_service_call', 'ros2_topic_publish']

### ros2_topic_list  (isError=False)
[
  {
    "topic_name": "/chatter",
    "topic_type": "std_msgs/msg/String",
    "request_fields": {
      "data": "string"
    }
  },
  {
    "topic_name": "/parameter_events",
    "topic_type": "rcl_interfaces/msg/ParameterEvent",
    "request_fields": {
      "stamp": "builtin_interfaces/Time",
      "node": "string",
      "new_parameters": "sequence<rcl_interfaces/Parameter>",
      "changed_parameters": "sequence<rcl_interfaces/Parameter>",
      "deleted_parameters": "sequence<rcl_interfaces/Parameter>"
    }
  },
  {
    "topic_name": "/rosout",
    "topic_type": "rcl_interfaces/msg/Log",
    "request_fields": {
      "stamp": "builtin_interfaces/Time",
      "level": "uint8",
      "name": "string",
      "msg": "string",
      "file": "string",
      "function": "string",
      "line": "uint32"
    }
  }
]

### ros2_topic_subscribe /chatter  (isError=False)
[/chatter] 3 messages received.
{
  "/chatter#0": {
    "_data": "hello from the robot",
    "_check_fields": false
  }
}
{
  "/chatter#1": {
    "_data": "hello from the robot",
    "_check_fields": false
  }
}
{
  "/chatter#2": {
    "_data": "hello from the robot",
    "_check_fields": false
  }
}
```

## Variant: ROS 2 running directly on the host (not in a container)
A robot stack started natively on the same machine uses the host network and Fast DDS shared memory.
Simulated here with `--network host --ipc host` on the publisher. The server then needs the same two flags.
```text
-- without --ipc host (expected: topics are listed, but no message arrives)
$ docker run -i --rm --network host -e ROS_DOMAIN_ID=42 wisevision/ros2_mcp:jazzy-amd64
### ros2_topic_subscribe /chatter  (isError=False)
[/chatter] 0 messages received.
-- with --network host --ipc host
$ docker run -i --rm --network host --ipc host -e ROS_DOMAIN_ID=42 wisevision/ros2_mcp:jazzy-amd64
### ros2_topic_subscribe /chatter  (isError=False)
[/chatter] 3 messages received.
```

## Security: read-only mode (`-e ROS2_MCP_READONLY=1`)
Same client, same robot. Expected: no mutating tool in `list_tools`, and `ros2_topic_publish` errors.
```text
$ docker run -i --rm -e ROS_DOMAIN_ID=42 -e ROS2_MCP_READONLY=1 wisevision/ros2_mcp:jazzy-amd64
serverInfo: ROS2 MCP 1.28.1
list_tools: 19 tools
  ros2_action_request_result, ros2_action_subscribe_feedback, ros2_action_subscribe_status, ros2_get_map_as_image, ros2_get_message_fields, ros2_get_messages_stored_in_influx_data_base, ros2_get_pointcloud_as_bev, ros2_interface_list, ros2_list_actions, ros2_service_list, ros2_stream_next, ros2_stream_next_image, ros2_stream_start, ros2_stream_stop, ros2_subscribe_multiple_topics, ros2_topic_list, ros2_topic_subscribe, ros2_viewer_app, ros2_viewer_config
list_prompts: 4 prompts: base.ros2-node-health-check, base.ros2-topic-diff-monitor, base.ros2-topic-echo-and-analyze, base.ros2-topic-relay
mutating tools present: none

### ros2_topic_list  (isError=False)
[
  {
    "topic_name": "/chatter",
    "topic_type": "std_msgs/msg/String",
    "request_fields": {
      "data": "string"
    }
  },
  {
    "topic_name": "/parameter_events",
    "topic_type": "rcl_interfaces/msg/ParameterEvent",
    "request_fields": {
      "stamp": "builtin_interfaces/Time",
      "node": "string",
      "new_parameters": "sequence<rcl_interfaces/Parameter>",
      "changed_parameters": "sequence<rcl_interfaces/Parameter>",
      "deleted_parameters": "sequence<rcl_interfaces/Parameter>"
    }
  },
  {
    "topic_name": "/rosout",
    "topic_type": "rcl_interfaces/msg/Log",
    "request_fields": {
      "stamp": "builtin_interfaces/Time",
      "level": "uint8",
      "name": "string",
      "msg": "string",
      "file": "string",
      "function": "string",
      "line": "uint32"
    }
  }
]

### ros2_topic_subscribe /chatter  (isError=False)
[/chatter] 3 messages received.
{
  "/chatter#0": {
    "_data": "hello from the robot",
    "_check_fields": false
  }
}
{
  "/chatter#1": {
    "_data": "hello from the robot",
    "_check_fields": false
  }
}
{
  "/chatter#2": {
    "_data": "hello from the robot",
    "_check_fields": false
  }
}

### ros2_topic_publish (read-only: must fail)  (isError=True)
Caught Exception. Error: Unknown tool: ros2_topic_publish

READ-ONLY CHECK: PASS (publish tool absent from list_tools and the call errors)
```
