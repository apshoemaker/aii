"""FastAPI server with WebSocket endpoint for the LangGraph agent."""
import asyncio
import json
import os
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv

from graph import build_graph
from tools.screenshot import create_screenshot_tool

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Artemis II Assistant")


async def invoke_agent(graph, message: str, thread_id: str, websocket: WebSocket):
    """Stream agent response back through WebSocket."""
    config = {"configurable": {"thread_id": thread_id}}

    try:
        async for event in graph.astream_events(
            {"messages": [{"role": "user", "content": message}]},
            config=config,
            version="v2",
        ):
            kind = event["event"]

            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                content = chunk.content

                # Skip chunks that are tool calls (not text for the user)
                if hasattr(chunk, "tool_call_chunks") and chunk.tool_call_chunks:
                    continue

                if isinstance(content, str) and content:
                    await websocket.send_text(json.dumps({
                        "type": "token",
                        "content": content,
                    }))
                elif isinstance(content, list):
                    for block in content:
                        if isinstance(block, dict) and block.get("type") == "text":
                            text = block.get("text", "")
                            if text:
                                await websocket.send_text(json.dumps({
                                    "type": "token",
                                    "content": text,
                                }))

            elif kind == "on_tool_start":
                tool_name = event.get("name", "unknown")
                await websocket.send_text(json.dumps({
                    "type": "tool_start",
                    "name": tool_name,
                }))

            elif kind == "on_tool_end":
                tool_name = event.get("name", "unknown")
                await websocket.send_text(json.dumps({
                    "type": "tool_end",
                    "name": tool_name,
                }))

    except Exception as e:
        logger.error(f"Streaming error: {e}", exc_info=True)
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": f"Agent error: {str(e)}",
        }))

    await websocket.send_text(json.dumps({"type": "end"}))


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    thread_id = None
    screenshot_queue = asyncio.Queue()

    # Create screenshot tool bound to this connection
    async def request_screenshot():
        await websocket.send_text(json.dumps({"type": "screenshot_request"}))

    screenshot_tool = create_screenshot_tool(screenshot_queue, request_screenshot)
    graph = build_graph(extra_tools=[screenshot_tool])

    logger.info("WebSocket connection accepted")

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON",
                }))
                continue

            msg_type = data.get("type")

            if msg_type == "init":
                thread_id = data.get("uuid", "default")
                logger.info(f"Initialized session: {thread_id}")

            elif msg_type == "message":
                thread_id = data.get("uuid", thread_id or "default")
                content = data.get("content", "")
                if content:
                    try:
                        await invoke_agent(graph, content, thread_id, websocket)
                    except Exception as e:
                        logger.error(f"Agent error: {e}")
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": str(e),
                        }))

            elif msg_type == "screenshot":
                b64_data = data.get("data")
                if b64_data:
                    await screenshot_queue.put(b64_data)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {thread_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
