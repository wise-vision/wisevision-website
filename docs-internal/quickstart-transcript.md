# ROS2 MCP quickstart: clean-box transcript

- date (UTC): 2026-09-29T19:49:59Z
- host: Linux 7.0.0-34-generic x86_64, Docker version 29.8.1, build 4a63305
- server image: `wisevision/ros2_mcp:jazzy-amd64` (sha256:26003d45ca18325160f4b3488c55733eb7b736eb4df9e96f905d991968d88f89 created 2026-09-29T19:24:32.600511499Z)
- MCP client: the official `mcp` Python SDK over stdio (`docs-internal/quickstart_client.py`), launched with `uv run`
- robot: a fresh `ros:jazzy-ros-base` container publishing `/chatter` (the quickstart's step 1)
- produced by: `bash docs-internal/run-quickstart.sh wisevision/ros2_mcp:jazzy-amd64`

## Step 1: start a demo robot
```console
$ docker run -d --name wv-quickstart-talker -e ROS_DOMAIN_ID=42 ros:jazzy-ros-base bash -c 'source /opt/ros/jazzy/setup.bash && ros2 topic pub -r 2 /chatter std_msgs/msg/String "{data: hello from the robot}"'
4995c9dd59252062e3685d31118a66ddf206e9dd2c64f70d8bb9eb8488926c77
$ docker logs wv-quickstart-talker | head -2
```

## Steps 2-3: the MCP client starts the server (`docker run -i --rm wisevision/ros2_mcp:jazzy-amd64`) and calls tools
```text
$ docker run -i --rm -e ROS_DOMAIN_ID=42 wisevision/ros2_mcp:jazzy-amd64
serverInfo: ROS2 MCP 1.28.1
list_tools: 24 tools
  ros2_action_request_result, ros2_action_subscribe_feedback, ros2_action_subscribe_status, ros2_cancel_action_goal, ros2_get_map_as_image, ros2_get_message_fields, ros2_get_messages_stored_in_influx_data_base, ros2_get_pointcloud_as_bev, ros2_interface_list, ros2_list_actions, ros2_publish_multiple_topics, ros2_send_action_goal, ros2_service_call, ros2_service_list, ros2_stream_next, ros2_stream_next_image, ros2_stream_start, ros2_stream_stop, ros2_subscribe_multiple_topics, ros2_topic_list, ros2_topic_publish, ros2_topic_subscribe, ros2_viewer_app, ros2_viewer_config
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

## Security: read-only mode (`-e ROS2_MCP_READONLY=1`)
Same client, same robot. Expected: no mutating tool in `list_tools`, and `ros2_topic_publish` errors.
```text
$ docker run -i --rm -e ROS_DOMAIN_ID=42 -e ROS2_MCP_READONLY=1 wisevision/ros2_mcp:jazzy-amd64
serverInfo: ROS2 MCP 1.28.1
list_tools: 19 tools
  ros2_action_request_result, ros2_action_subscribe_feedback, ros2_action_subscribe_status, ros2_get_map_as_image, ros2_get_message_fields, ros2_get_messages_stored_in_influx_data_base, ros2_get_pointcloud_as_bev, ros2_interface_list, ros2_list_actions, ros2_service_list, ros2_stream_next, ros2_stream_next_image, ros2_stream_start, ros2_stream_stop, ros2_subscribe_multiple_topics, ros2_topic_list, ros2_topic_subscribe, ros2_viewer_app, ros2_viewer_config
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
