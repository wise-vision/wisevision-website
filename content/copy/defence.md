---
title: "Defence & dual-use: autonomy with a human in command"
description: "Ground robots now carry the front line's most dangerous work. WiseVision builds resilient autonomy, C2 and simulation software, with a human in command."
og_title: "Robots now do the most dangerous work. Keep a human in command."
---

<!-- Copy for /defence/ . Bold, human-in-the-loop, no customer names, no weapons-integration claims.
     Every number cites a public source listed in docs-internal/defence-sources.md.
     H5: Adam reads this page once after launch. -->

## section:hero

eyebrow: Defence & dual-use

# The front line is going unmanned.

In August 2026, Ukraine's ground robots ran more than 25,000 logistics and evacuation missions in a single month, 3.3 times the January figure. [Ministry of Defence of Ukraine] {#c:def-ugv-missions}

The machines that carry ammunition and pull out the wounded are now robots. The software that coordinates them decides whether they arrive.

- primary_cta: Talk to us → /contact/?topic=defence

## section:shift

### What changed

- **Scale.** By July 2026, Ukraine's procurement agency had contracted over 22,000 unmanned ground vehicles for the year, nearly double the total for all of 2025. [Defence Procurement Agency DOT, via zbroya.gov.ua] {#c:def-ugv-contracts}
- **Goal.** Ukraine's defence minister set the target publicly: "100% of frontline logistics should be performed by robotic systems." [Defense News, April 2026] {#c:def-logistics-goal}
- **Jamming.** Electronic warfare severs the radio link between a drone and its operator, or feeds it false GPS. What keeps working is what can carry on when the link drops. [RBC-Ukraine, July 2026] {#c:def-ew}
- **Autonomy is partial.** Real progress is in partial autonomy, and human oversight remains critical in engagement decisions. [CSIS, March 2025] {#c:def-partial-autonomy}

## section:build

### What we build

Software, not weapons. Our work is the layer between the operator and a mixed fleet of robots and sensors.

- **Autonomy that survives jamming** (roadmap). Onboard behaviour that keeps a unit safe and on task when its link degrades, and hands control back when the link returns. {#c:def-build-autonomy}
- **Command and control** (early access). One operator view across robots and sensors, with the topics you choose recorded for after-action review. Built on WiseOS. {#c:def-build-c2}
- **Simulation first.** Test a mission against a simulated fleet before a real unit moves. ROS2 MCP already drives Gazebo simulations. {#c:def-build-sim}
- **Resilient comms.** ROS 2 over Zenoh for links that come and go, LoRaWAN for long-range low-power sensors. {#c:def-build-comms}

## section:principle

### Human in command. Not negotiable.

The work we take on moves supplies, maps terrain, watches perimeters and brings people home. A human decides every use of force. We do not build target selection, and we do not integrate weapons. {#c:def-principle}

This matches the public standard: the U.S. Department of Defense requires autonomous systems to "allow commanders and operators to exercise appropriate levels of human judgment over the use of force." [DoD Directive 3000.09] {#c:def-dod-3000}

The same rule is in our open-source code: ROS2 MCP has a read-only mode that removes every tool able to move a robot. {#c:mcp-readonly}

## section:cta

### Working on dual-use robotics?

We do not name the teams we talk to. Dual-use export rules apply to this work.

- cta: Contact → /contact/?topic=defence
- mail: hello@wisevision.tech

## section:sources

Sources:

- Ministry of Defence of Ukraine, 7 Sep 2026 → https://mod.gov.ua/en/news/robots-at-work-defence-forces-of-ukraine-more-than-triple-their-use-of-ug-vs
- Defence Procurement Agency DOT via zbroya.gov.ua, 20 Jul 2026 → https://www.zbroya.gov.ua/en/news/ponad-22-000-nrk-zakontraktovano-z-pochatku-2026-roku-maizhe-udvichi-bilshe-nizh-za-ves-mynulyi
- Defense News, 24 Apr 2026 → https://www.defensenews.com/unmanned/2026/04/24/ukraine-to-field-25000-ground-robots-in-push-to-replace-soldiers-for-frontline-logistics
- RBC-Ukraine, 5 Jul 2026 → https://newsukraine.rbc.ua/news/how-ukrainian-drones-use-ai-and-autopilot-1783239853.html
- CSIS, 6 Mar 2025 → https://www.csis.org/analysis/ukraines-future-vision-and-current-capabilities-waging-ai-enabled-autonomous-warfare
- U.S. DoD Directive 3000.09, 25 Jan 2023 → https://www.esd.whs.mil/portals/54/documents/dd/issuances/dodd/300009p.pdf
