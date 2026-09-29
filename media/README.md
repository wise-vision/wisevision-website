# media/ — WiseVision HyperFrames explainers (W4)

Four benefit-first explainers, each as a 16:9 web loop and a 9:16 cut, rendered with
[HyperFrames](https://hyperframes.heygen.com) (HTML + GSAP → MP4).

| Video | Persona | Beats | Length |
|---|---|---|---|
| `ros2-mcp-30s` | a ROS 2 developer | hook → install → ask → answer → real footage → close | 30 s |
| `wiseos-30s` | a fleet operator | hook → connect → record → explain (real footage) → close. **"Early access" badge on every frame** | 30 s |
| `defence-30s` | a defence / dual-use programme lead | jamming → link lost, autonomy continues → human approves → real footage → what we build | 30 s |
| `hero-loop-8s` | anyone (silent ambient) | RViz idiom: ROS grid, wireframe fleet, LaserScan ring sweep, one `#3CFFB4` signal line. Seamless 8 s loop | 8 s |

## Layout

```
media/
  src/<name>.html            ← the ONE source per video (placeholders __W__ __H__ __ORIENT__ __PORT__ __ID__)
  build.mjs                  ← expands src/ into compositions/<name>-16x9 and -9x16 (HyperFrames projects)
  compositions/<name>-<ar>/  ← generated, committed (index.html, hyperframes.json, meta.json, symlinks)
  shared/base.css, wv.js     ← layout + deterministic SVG helpers (grid, rover, quadruped, drone, mast, scan ring)
  tokens.css                 ← TEMPORARY copy of the locked tokens; replace with @import of src/styles/tokens.css
  fonts/                     ← self-hosted Space Grotesk / Inter / JetBrains Mono (OFL, licences alongside)
  vendor/gsap.min.js         ← GSAP 3.14.2 pinned locally (no render-time network)
  proof/make-proof.sh        ← cuts the 5 s "Real footage" clips from static/gifs/*.mp4 (LFS). Outputs gitignored.
  claims-check.mjs           ← claims gate (banned words + fabricated commands), node:test in test/
  allowed-commands.json      ← snapshot of ros2_mcp README/installation/Dockerfile lines (fallback when repo absent)
  render-all.sh              ← lint → render → H.264 faststart → poster JPG → copy to the parent's scratch
  renders/                   ← gitignored. MP4s never enter git.
```

## Rebuild

```bash
export HOME=/home/adam
git lfs pull --include="static/gifs/*"
bash media/proof/make-proof.sh
node media/build.mjs                       # after editing media/src/*.html
node media/claims-check.mjs                # 0 violations required
node --test media/test/claims-check.test.mjs                    # claims-check unit tests
systemd-run --user --scope -p MemoryMax=12G bash media/render-all.sh
```

Per-composition lint: `cd media/compositions/<name> && npx hyperframes lint .` (0 errors, 0 warnings on all 8).

## Claims rules (enforced by `claims-check.mjs`)

- Banned: `MIT`, `RBAC`, `enterprise-grade`, `certified`, `military-grade`, `SOC 2`, star/clone/pull/download counts,
  ex-employee names, any e-mail other than `hello@wisevision.tech`, weapons-integration phrasing.
- Every visible line that starts like a shell command (`$ `, `docker `, `uvx `, `pip `, `npx `, `uv `, `curl `, `git clone `…)
  must exist **verbatim** in `ros2_mcp` `README.md`, `installation/README.md` or `Dockerfile`.
- Tool names shown on screen are the real registrations in `ros2_mcp/server/server.py` (`ros2_topic_list`,
  `ros2_topic_subscribe`, `ros2_topic_publish`).
- The grep is a floor, not a ceiling: the per-scene frame grabs still need a human/vision read.

## Content provenance

| On-screen content | Source |
|---|---|
| `git clone …`, `cd ros2_mcp`, `docker build -t wisevision/ros2_mcp .` | `ros2_mcp/installation/README.md` (Warp section) |
| `"command": "docker"`, `"args": ["run", "-i", "--rm", "wisevision/ros2_mcp:<humble/jazzy>"]` | `ros2_mcp/installation/README.md` (Claude Desktop config), shown with the `jazzy` tag |
| `ros2_topic_list`, `ros2_topic_subscribe` (`topic_name`, `duration`) | `ros2_mcp/server/server.py` registrations + README tool table |
| "/scan delivered 50 messages in 5 s, about 10 Hz" | an **illustrative** answer: the shape of `ros2_topic_subscribe` output (`messages`, `count`, `duration`) for a 10 Hz LaserScan. Not a recorded transcript. |
| Real footage (ROS2 MCP) | `static/gifs/mcp-ros2-server.gif` t=7–12 s: Claude calling `ros2_topic_publish` / echo on a live graph |
| Real footage (WiseOS) | `static/gifs/ai_agent_chat.mp4` t=10–15 s: WiseOS AI Agent, question → tool approval → topic list |
| Real footage (Defence) | `static/gifs/ComandToStartandTakeoff.mp4` t=8–13 s: plain-language drone mission, "flying to target number one" |
| WiseOS capabilities (zenoh, Data Black Box/InfluxDB, dashboard, AI agent, LoRaWAN bridge) | `wise-vision/WiseOS` (private) — labelled Early access |
| Defence pillars (autonomy under jamming, C2, simulation, resilient comms), human-in-the-loop | plan §3 W3 / preamble locked facts |
