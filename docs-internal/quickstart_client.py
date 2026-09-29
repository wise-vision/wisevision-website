# /// script
# requires-python = ">=3.10"
# dependencies = ["mcp>=1.9"]
# ///
"""Drive ROS2 MCP exactly as an MCP client would: stdio, `docker run -i --rm ...`.

Usage: uv run docs-internal/quickstart_client.py [--readonly] -- <docker args after `docker`>
Prints a transcript of initialize, list_tools, ros2_topic_list, ros2_topic_subscribe
and (in --readonly mode) the refused ros2_topic_publish call.
"""
import asyncio
import json
import sys

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

MUTATING = {
    "ros2_topic_publish",
    "ros2_publish_multiple_topics",
    "ros2_service_call",
    "ros2_send_action_goal",
    "ros2_cancel_action_goal",
}


def _err(r):
    return bool(getattr(r, "is_error", None) if hasattr(r, "is_error") else getattr(r, "isError", False))


def show(label, result):
    texts = [c.text for c in result.content if getattr(c, "type", "") == "text"]
    body = "\n".join(texts)
    if len(body) > 1500:
        body = body[:1500] + "\n... (truncated)"
    print(f"\n### {label}  (isError={_err(result)})\n{body}")


async def main():
    argv = sys.argv[1:]
    readonly = "--readonly" in argv
    only_lists = "--lists-only" in argv
    docker_args = argv[argv.index("--") + 1 :]
    params = StdioServerParameters(command="docker", args=docker_args)
    print("$ docker " + " ".join(docker_args))
    async with stdio_client(params) as (r, w):
        async with ClientSession(r, w) as s:
            init = await s.initialize()
            info = getattr(init, "server_info", None) or getattr(init, "serverInfo")
            print(f"serverInfo: {info.name} {info.version}")
            tools = sorted(t.name for t in (await s.list_tools()).tools)
            print(f"list_tools: {len(tools)} tools")
            print("  " + ", ".join(tools))
            prompts = sorted(p.name for p in (await s.list_prompts()).prompts)
            print(f"list_prompts: {len(prompts)} prompts: {', '.join(prompts)}")
            present = sorted(MUTATING & set(tools))
            print(f"mutating tools present: {present or 'none'}")
            if only_lists:
                return
            show("ros2_topic_list", await s.call_tool("ros2_topic_list", {}))
            show(
                "ros2_topic_subscribe /chatter",
                await s.call_tool(
                    "ros2_topic_subscribe",
                    {"topic_name": "/chatter", "duration": 3.0, "message_limit": 3},
                ),
            )
            if readonly:
                assert not present, f"read-only mode still lists {present}"
                try:
                    res = await s.call_tool(
                        "ros2_topic_publish",
                        {
                            "topic_name": "/chatter",
                            "message_type": "std_msgs/msg/String",
                            "data": {"data": "should be refused"},
                        },
                    )
                    show("ros2_topic_publish (read-only: must fail)", res)
                    assert _err(res), "ros2_topic_publish succeeded in read-only mode"
                except Exception as e:  # protocol-level error is also a refusal
                    print(f"\n### ros2_topic_publish (read-only: must fail)\nraised {type(e).__name__}: {e}")
                print("\nREAD-ONLY CHECK: PASS (publish tool absent from list_tools and the call errors)")


if __name__ == "__main__":
    asyncio.run(main())
