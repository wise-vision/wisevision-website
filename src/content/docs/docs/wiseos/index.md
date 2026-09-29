---
title: WiseOS (early access)
description: WiseOS is the operations layer for a ROS 2 robot fleet. It is in early access; the code is private.
---

:::note[Early access]
WiseOS is in early access and its code is private. This page describes what it does today. There is no public install guide yet.
:::

WiseOS is the operations layer above your robots: connect them, record what they publish, and ask an AI agent what happened.

## What it does

- **Connect.** Robots join over Zenoh: install `rmw_zenoh_cpp` on the robot and point it at the WiseOS router. Their topics then appear next to everything else.
- **Record.** The [Data Black Box](/docs/ros2-mcp/data-black-box/) writes the ROS 2 topics you choose to InfluxDB, so you can go back to any time window instead of hunting for the right rosbag.
- **See.** A Grafana-based dashboard shows live ROS 2 topics and recorded history side by side, as charts and reports.
- **Ask.** An AI agent built on [ROS2 MCP](/docs/ros2-mcp/quickstart/) answers questions about your fleet in plain language.
- **Sensors, too.** A LoRaWAN bridge brings long-range IoT sensors into the same ROS 2 graph as your robots.

## Built from open parts

The dashboard, the Data Black Box and the LoRaWAN bridge are open source (MPL-2.0). WiseOS wires them into one deployment.

- [wisevision_dashboard](https://github.com/wise-vision/wisevision_dashboard)
- [wisevision_data_black_box](https://github.com/wise-vision/wisevision_data_black_box)
- [wisevision_lorawan_bridge](https://github.com/wise-vision/wisevision_lorawan_bridge)

## Request access

Tell us about your fleet: how many units, which ROS 2 distribution, and what you want to ask it. Use the [early access form](/wiseos/) or email [hello@wisevision.tech](mailto:hello@wisevision.tech).
