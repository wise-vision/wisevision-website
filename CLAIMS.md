# CLAIMS.md: every capability sentence on wisevision.tech, with its evidence

The claims lint (`node scripts/claims-lint.mjs`) fails the build when a page contains a capability
sentence without a `{#c:<id>}` anchor, an anchor with no row here, a row with an empty evidence cell,
or a banned term (MIT, RBAC, ex-employee names, star/pull counts, ...). Config: `scripts/claims-lint.config.json`.

**Status values**

- `shipped`: true today on `main` of the cited repo (or the cited public source says it).
- `shipped-on-merge`: true once the cited open PR/branch merges. Before launch, check each of these has merged
  or reword the sentence. `grep shipped-on-merge CLAIMS.md` is the launch checklist.
- `early-access`: WiseOS (private code). The sentence describes what the private repo does today.
- `roadmap`: not built. The copy must say "roadmap" next to it.

**Evidence conventions**

- `ros2_mcp@main:<path>:<line>` = `wise-vision/ros2_mcp` at `origin/main` 66f3f2d (2026-09-29).
- `ros2_mcp@w6a:<path>:<line>` = branch `agent/tori/wvrevive-w6a` 3ca8b84 (Pro merge + read-only mode), open PR wise-vision/ros2_mcp#63.
- `ros2_mcp@w6b` = branch `agent/tori/wvrevive-w6b`, open PR wise-vision/ros2_mcp#62 (tool-docs generator + drift gate).
- `WiseOS:<path>:<line>` = private `wise-vision/WiseOS` at d0208dc.
- `probe:` = a command that was run on 2026-09-29; output summarised.
- Defence sources: full quotes in `docs-internal/defence-sources.md`.

| id | claim | page | evidence | status |
|---|---|---|---|---|
| hero-layer | WiseVision is the AI layer for ROS 2 robots: agents that see, understand and operate your fleet | home | L2 positioning; backed by the ROS2 MCP rows below (see = `mcp-see`, understand = `mcp-understand`, operate = `mcp-operate`) and WiseOS rows (fleet, early access) | shipped |
| mcp-what | ROS2 MCP is an MCP server for ROS 2; agents can list topics, read messages, call services and send action goals on a live graph | ros2-mcp | ros2_mcp@main:README.md:12; ros2_mcp@main:server/server.py:56-69 (ROS2TopicList, ROS2TopicSubscribe, ROS2ServiceCall, ROS2SendActionGoal) | shipped |
| mcp-see | Agent lists live topics, services and actions and reads their message types | home | ros2_mcp@main:server/server.py:56-58,62,64 (topic/service/interface list, message fields, list actions); probe: `docker run -i --rm mcp/ros2` tools/list returned ros2_topic_list, ros2_service_list, ros2_interface_list, ros2_get_message_fields, ros2_list_actions | shipped |
| mcp-understand | Agent subscribes to topics, follows action status and queries recorded history | home | ros2_mcp@main:server/server.py:60,61,68,69 (ROS2TopicSubscribe, ROS2GetMessages, ROS2ActionSubscribeFeedback, ROS2ActionSubscribeStatus) | shipped |
| mcp-operate | Agent can publish, call services, send and cancel action goals | home, ros2-mcp | ros2_mcp@main:server/server.py:59,63,65,66 (ROS2ServiceCall, ROS2TopicPublish, ROS2SendActionGoal, ROS2CancelActionGoal) | shipped |
| mcp-mutating-default | By default ROS2 MCP exposes tools that publish, call any service and send/cancel action goals | ros2-mcp | ros2_mcp@main:server/server.py:59,63,65,66 registered unconditionally; list of 5 mutating tools = ros2_mcp@w6a:server/tool_safety.py:27-40 | shipped |
| mcp-readonly | `ROS2_MCP_READONLY=1` or `--read-only` stops the mutating tools from being registered | home, ros2-mcp, defence | ros2_mcp@w6a:server/server.py:44-45,65-67 (`_allowed`), ros2_mcp@w6a:server/main.py:29-36, ros2_mcp@w6a:tests/tool_safety_test.py; command `docker run -i --rm -e ROS2_MCP_READONLY=1 mcp/ros2` = ros2_mcp@w6a:README.md:26 (PR wise-vision/ros2_mcp#63) | shipped-on-merge |
| mcp-readonly-hidden | In read-only mode the mutating tools are absent from the tool list and calling one returns an unknown-tool error | ros2-mcp | ros2_mcp@w6a:server/tool_safety.py:8-10 (docstring); ros2_mcp@w6a:server/server.py:154 `raise ValueError(f"Unknown tool: {name}")`; W5 gate: negative test that read-only config cannot call ros2_topic_publish | shipped-on-merge |
| mcp-readonly-failclosed | Read-only fails closed: only reviewed read-only tools register; a test fails on an unclassified new tool | ros2-mcp | ros2_mcp@w6a:server/server.py:65-67 (`_allowed` checks READ_ONLY_TOOLS); ros2_mcp@w6a:tests/tool_safety_test.py; ros2_mcp@w6a:README.md:31 | shipped-on-merge |
| mcp-readonly-release | Read-only mode ships in release 2610 and the wisevision/ros2_mcp:humble/:jazzy images; Docker's catalog image mcp/ros2 does not have it yet | ros2-mcp | ros2_mcp tag 2610 (release workflow green 2026-09-29); Docker Hub wisevision/ros2_mcp tags humble/jazzy pushed 2026-09-29T22:0x; mcp/ros2:latest last_updated 2026-02-04 (hub.docker.com v2 tags API) | shipped |
| mcp-stdio | ROS2 MCP speaks stdio; no port to expose | home, ros2-mcp | ros2_mcp@main:README.md:12 "over **stdio**"; ros2_mcp@main:server/main.py:31 `default="stdio"`; ros2_mcp@main:server.json:15 | shipped |
| mcp-sse-optin | An SSE transport exists and only starts with `--transport sse` | ros2-mcp | ros2_mcp@main:server/main.py:31-32 (`choices=["stdio","sse"]`); ros2_mcp@main:server/transport.py:47 | shipped |
| mcp-force-call | A service call with missing request fields is not sent unless the agent sets `force_call` | ros2-mcp | ros2_mcp@main:server/tools_ros2.py:156-158 | shipped |
| mcp-docker-image | ROS2 MCP ships as a Docker image | home | ros2_mcp@main:Dockerfile; Docker Hub tags `wisevision/ros2_mcp:humble`, `:jazzy` (probe: hub.docker.com/v2/repositories/wisevision/ros2_mcp/tags) | shipped |
| mcp-docker-catalog | Listed in Docker's official MCP catalog as `mcp/ros2` | home, ros2-mcp | https://hub.docker.com/mcp/server/ros2/overview ("WiseVision ROS2 … Docker Image mcp/ros2"); ros2_mcp@main:README.md:7; ros2_mcp@main:server.json:13-19 (oci `docker.io/mcp/ros2:latest`, stdio, runtimeHint docker); command `docker run -i --rm mcp/ros2` = the `run -i --rm <image>` args of ros2_mcp@main:installation/README.md:49-54 with the catalog image, and ros2_mcp@w6a:README.md:26; probe 2026-09-29: it answered initialize + tools/list (14 tools) | shipped |
| mcp-license | Open source under MPL-2.0 | home, ros2-mcp | ros2_mcp@main:LICENSE:1 "Mozilla Public License Version 2.0"; ros2_mcp@main:README.md:95 | shipped |
| mcp-free | Free for commercial use; no licence key, no paid tier | home | ros2_mcp@main:README.md:95-96 ("free and MPL-2.0 licensed — you can use it in a commercial product"); "no paid tier" requires L16: Pro merged (w6a) + easy.tools listing removed (H3) | shipped-on-merge |
| mcp-distros | ROS 2 Humble and Jazzy images | home, ros2-mcp | ros2_mcp@main:README.md:5-6; ros2_mcp@main:installation/README.md:54 `wisevision/ros2_mcp:<humble/jazzy>`; Docker Hub tags humble, jazzy | shipped |
| mcp-clients | Connects to Claude, Cursor and Codex (any stdio MCP client) | home, ros2-mcp | ros2_mcp@main:installation/README.md:28 (Claude Desktop), :261 (Codex CLI), :3 (VS Code Copilot), :122 (Warp); Cursor: stdio server + https://cursor.com/docs/context/mcp ("Cursor supports three transport methods: stdio …"); L17 | shipped |
| mcp-custom-msgs | Custom message packages: build into `~/mcp_custom_messages` and mount the folder | ros2-mcp | ros2_mcp@main:installation/README.md:62-79,245-259 | shipped |
| mcp-discover | Lists topics, services, actions and interfaces with fields and types | ros2-mcp | ros2_mcp@main:server/server.py:56-58,62,64; ros2_mcp@main:README.md:77 (auto type discovery) | shipped |
| mcp-subscribe | Subscribe to a topic and collect messages for a time window | ros2-mcp | ros2_mcp@main:server/server.py:60 (ROS2TopicSubscribe); ros2_mcp@main:README.md:167 (duration / message_limit) | shipped |
| mcp-multi-subscribe | Subscribe to several topics at once | ros2-mcp | ros2_mcp@w6a:server/server.py:116; ros2_mcp@w6a:server/tools_ros2_extended.py:36,41 `ros2_subscribe_multiple_topics`; origin: mcp_server_ros_2-private/extensions/private_tools.py:37 | shipped-on-merge |
| mcp-multi-publish | Publish to several topics at once | ros2-mcp | ros2_mcp@w6a:server/server.py:117; ros2_mcp@w6a:server/tools_ros2_extended.py:125,130 `ros2_publish_multiple_topics`; origin: mcp_server_ros_2-private/extensions/private_tools.py:129 | shipped-on-merge |
| mcp-map-image | Turn an OccupancyGrid into a PNG map | ros2-mcp | ros2_mcp@w6a:server/server.py:118; ros2_mcp@w6a:server/tools_ros2_extended.py:181,187 `ros2_get_map_as_image`; origin: mcp_server_ros_2-private/extensions/private_tools.py:188 | shipped-on-merge |
| mcp-bev | Turn a PointCloud2 into a bird's-eye-view PNG | ros2-mcp | ros2_mcp@w6a:server/server.py:119; ros2_mcp@w6a:server/tools_ros2_extended.py:219,225 `ros2_get_pointcloud_as_bev`; origin: mcp_server_ros_2-private/extensions/private_tools.py:229 | shipped-on-merge |
| mcp-pro-merged | The four ex-Pro tools are now part of the free MPL-2.0 package | ros2-mcp | ros2_mcp@w6a commit c10c9fd "merge the 4 former Pro tools into MPL-2.0 core"; source mcp_server_ros_2-private/extensions/private_tools.py | shipped-on-merge |
| mcp-blackbox | Query history stored by WiseVision Data Black Box (InfluxDB) | ros2-mcp | ros2_mcp@main:server/server.py:61; ros2_mcp@main:server/tools_ros2.py:259-265 (`ros2_get_messages_stored_in_influx_data_base`, calls `/get_messages`) | shipped |
| mcp-prompts | Built-in prompts: topic analysis, relay, node health check, topic diff | ros2-mcp | ros2_mcp@main:server/prompts_ros2.py:18,141,293,480 | shipped |
| docs-generated | The tool reference in /docs is generated from the code | home, ros2-mcp | ros2_mcp@w6b ddf1cc9 "tool reference generator + drift gate" (PR #62); W5 docs | shipped-on-merge |
| wiseos-summary | WiseOS connects robots and sensors, records topics and adds an AI agent | home, wiseos | WiseOS:docker-compose.yml:2-10 (dashboard, influxdb_ros2, lorawan_bridge, visualisation, data_source); rows below | early-access |
| wiseos-status | WiseOS is in early access; code private | home, wiseos | `gh api repos/wise-vision/WiseOS` private=true; L5 | early-access |
| wiseos-zenoh | Robots join over Zenoh: install rmw_zenoh_cpp, point at the WiseOS router | wiseos | WiseOS:docs/SETUP.md:33-36,48-58; WiseOS:docker-compose.zenoh.yml:9 (zenoh-rmw-router) | early-access |
| wiseos-blackbox | Data Black Box records chosen ROS 2 topics to InfluxDB | wiseos | WiseOS:src/wisevision_influxdb_ros2/README.md:5 ("starting and stopping recording of pointed topics, creates new influx buckets") | early-access |
| wiseos-dashboard | Grafana-based dashboard: live topics and recorded history, charts and reports | wiseos | WiseOS:src/WiseOS_dashboard/README.md:3; WiseOS:src/wisevision_influxdb_ros2/README.md:7 ("charts and reports") | early-access |
| wiseos-agent | An AI agent built on ROS2 MCP, OpenAI models today | wiseos | WiseOS:src/WiseOS_dashboard/README.md:3 ("AI agent with ROS2 MCP"); WiseOS:src/WiseOS_dashboard/app/server_ai_agent/pyproject.toml:6-8,21 (langchain-mcp-adapters); WiseOS:docs/SETUP.md:16-23 (OPENAI_API_KEY) | early-access |
| wiseos-lorawan | A LoRaWAN bridge brings IoT sensors into the ROS 2 graph | wiseos | WiseOS:docker-compose.yml:6 (wisevision_lorawan_bridge); https://github.com/wise-vision/wisevision_lorawan_bridge | early-access |
| wiseos-satellites | Dashboard, Data Black Box and LoRaWAN bridge are open source (MPL-2.0) on GitHub | home, wiseos | probe: `gh api repos/wise-vision/{wisevision_dashboard,wisevision_data_black_box,wisevision_lorawan_bridge}` → private=false, license MPL-2.0 | shipped |
| def-ugv-missions | August 2026: >25,000 UGV logistics and evacuation missions, 3.3× January | home, defence | https://mod.gov.ua/en/news/robots-at-work-defence-forces-of-ukraine-more-than-triple-their-use-of-ug-vs (quote in docs-internal/defence-sources.md #1) | shipped |
| def-ugv-contracts | By July 2026, >22,000 UGVs contracted for 2026, nearly double all of 2025 | defence | https://www.zbroya.gov.ua/en/news/ponad-22-000-nrk-zakontraktovano-z-pochatku-2026-roku-maizhe-udvichi-bilshe-nizh-za-ves-mynulyi (sources #2) | shipped |
| def-logistics-goal | Ukraine's defence minister: "100% of frontline logistics should be performed by robotic systems" | defence | https://www.defensenews.com/unmanned/2026/04/24/ukraine-to-field-25000-ground-robots-in-push-to-replace-soldiers-for-frontline-logistics (sources #3) | shipped |
| def-ew | EW severs the drone-operator radio link or spoofs GPS | defence | https://newsukraine.rbc.ua/news/how-ukrainian-drones-use-ai-and-autopilot-1783239853.html (sources #4) | shipped |
| def-partial-autonomy | Progress is in partial autonomy; human oversight remains critical in engagement decisions | defence | https://www.csis.org/analysis/ukraines-future-vision-and-current-capabilities-waging-ai-enabled-autonomous-warfare (sources #5) | shipped |
| def-dod-3000 | DoD Directive 3000.09 requires "appropriate levels of human judgment over the use of force" | defence | https://www.esd.whs.mil/portals/54/documents/dd/issuances/dodd/300009p.pdf §1.2.a (sources #6) | shipped |
| def-principle | A human decides every use of force; we do not build target selection or integrate weapons | defence | Policy statement (L6 + §6 risk 3), owned by Adam; nothing in any WiseVision repo does target selection or weapons integration (ros2_mcp, WiseOS trees reviewed 2026-09-29) | shipped |
| def-build-autonomy | Onboard autonomy that keeps a unit safe when its link degrades | defence | Not built; labelled "(roadmap)" in the copy | roadmap |
| def-build-c2 | One operator view across robots and sensors with recorded topics (WiseOS) | defence | = wiseos-dashboard + wiseos-blackbox + wiseos-zenoh evidence; labelled "(early access)" in the copy | early-access |
| def-build-sim | ROS2 MCP already drives Gazebo simulations | defence | ros2_mcp@main:docs/DEMO_DRONE.md:1-20 (Gazebo `Quadcopter Teleop` world driven through ROS2 MCP); ros2_mcp@main:README.md:156-157 | shipped |
| def-build-comms | ROS 2 over Zenoh for intermittent links; LoRaWAN for long-range sensors | defence | ros2_mcp@main:Dockerfile:30 (`ros-${ROS_DISTRO}-rmw-zenoh-cpp`); WiseOS:docs/SETUP.md:48-58; WiseOS:docker-compose.yml:6 | shipped |
