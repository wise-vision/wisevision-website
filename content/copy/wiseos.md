---
title: "WiseOS: one screen for your robot fleet (early access)"
description: "WiseOS connects ROS 2 robots and LoRaWAN sensors over Zenoh, records every topic and adds an AI agent on top. Early access: request a demo."
og_title: "WiseOS: one screen for the whole fleet"
---

<!-- Copy for /wiseos/ . Everything on this page is early access (L5).
     Describe only what the private WiseOS repo does today. -->

## section:hero

eyebrow: Early access

# One screen for the whole fleet.

WiseOS is the operations layer above your robots: connect them, record everything they say, and ask an AI agent what happened. {#c:wiseos-summary}

It is in early access, and the code is private. {#c:wiseos-status}

- primary_cta: Request early access → #early-access
- secondary_cta: Start with ROS2 MCP (free) → /ros2-mcp/

## section:capabilities

### Connect

Robots join over Zenoh: install `rmw_zenoh_cpp` on the robot, point it at the WiseOS router, and its topics show up next to everything else. {#c:wiseos-zenoh}

### Record

The Data Black Box writes the ROS 2 topics you choose to InfluxDB, so you can replay any window after the fact instead of hunting for the right rosbag. {#c:wiseos-blackbox}

### See

A Grafana-based dashboard shows live ROS 2 topics and recorded history side by side, as charts and reports. {#c:wiseos-dashboard}

### Ask

An AI agent, built on ROS2 MCP and running on OpenAI models today, answers questions about your fleet in plain language. {#c:wiseos-agent}

### Sensors, too

A LoRaWAN bridge brings long-range IoT sensors into the same ROS 2 graph as your robots. {#c:wiseos-lorawan}

## section:stack

### Built from open parts.

The dashboard, the Data Black Box and the LoRaWAN bridge are open source (MPL-2.0) on GitHub. WiseOS wires them into one deployment. {#c:wiseos-satellites}

- link: wisevision_dashboard → https://github.com/wise-vision/wisevision_dashboard
- link: wisevision_data_black_box → https://github.com/wise-vision/wisevision_data_black_box
- link: wisevision_lorawan_bridge → https://github.com/wise-vision/wisevision_lorawan_bridge

## section:early-access

### Request early access

Tell us about your fleet: how many units, which ROS 2 distro, what you want to ask it. We reply from hello@wisevision.tech.

form: early-access (fields: email, organisation, role, use case, consent)

consent_label: I agree that WiseVision stores this form to reply to me. See the privacy notice → /privacy/
