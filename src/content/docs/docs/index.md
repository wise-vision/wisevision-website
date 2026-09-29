---
title: WiseVision documentation
description: Documentation for ROS2 MCP and WiseOS.
---

WiseVision builds the AI layer for ROS 2 robots. These docs cover two products.

## ROS2 MCP

An open-source (MPL-2.0) Model Context Protocol server for ROS 2 Humble and Jazzy. It lets an AI agent (Claude, Cursor, Codex, VS Code and any other stdio MCP client) list, read, publish on and call ROS 2 topics, services and actions.

- [Quickstart (Docker, 5 min)](/docs/ros2-mcp/quickstart/): a demo robot, the server and your agent, end to end.
- [Connect your agent](/docs/ros2-mcp/connect/): exact configs for Claude Code, Claude Desktop, Cursor, Codex, VS Code and Hermes.
- [Security model](/docs/ros2-mcp/security/): which tools can move a robot, and how to lock them out with read-only mode.
- [Tool reference](/docs/ros2-mcp/tools/): every tool and its input schema, generated from the server's source.
- [Prompts](/docs/ros2-mcp/prompts/) and [Data Black Box](/docs/ros2-mcp/data-black-box/).

The source is at [github.com/wise-vision/ros2_mcp](https://github.com/wise-vision/ros2_mcp).

## WiseOS

The operations layer for a robot fleet. It is in [early access](/docs/wiseos/).

## For AI agents

Every page here has a Markdown twin: add `.md` to the page path (for example [/docs/ros2-mcp/quickstart.md](/docs/ros2-mcp/quickstart.md)). The whole site is indexed in [/llms.txt](/llms.txt).
