"""FastAPI server with WebSocket endpoint for the LangGraph agent."""
import asyncio
import json
import os
import logging
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from dotenv import load_dotenv
import httpx

from graph import build_graph
from tools.screenshot import create_screenshot_tool

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Artemis II Assistant")

# Static frontend (production only — in dev, Vite serves these)
STATIC_DIR = Path(__file__).parent / "static"


# API proxies (replace Vite dev proxy in production)
@app.get("/api/horizons")
async def proxy_horizons(request: Request):
    """Proxy JPL Horizons API to avoid CORS."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            "https://ssd.jpl.nasa.gov/api/horizons.api",
            params=dict(request.query_params),
        )
        return Response(content=resp.content, media_type="text/plain")


@app.get("/api/dsn")
async def proxy_dsn():
    """Proxy NASA DSN XML feed."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get("https://eyes.nasa.gov/dsn/data/dsn.xml")
        return Response(content=resp.content, media_type="application/xml")


@app.get("/api/tdrs")
async def proxy_tdrs():
    """Proxy CelesTrak TDRS TLE data."""
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://celestrak.org/NORAD/elements/gp.php",
            params={"GROUP": "tdrss", "FORMAT": "json"},
        )
        return Response(content=resp.content, media_type="application/json")


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
                # Send model info to client
                import os
                from graph import DEFAULT_MODEL
                model_name = os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL)
                await websocket.send_text(json.dumps({
                    "type": "config",
                    "model": model_name,
                }))

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


# Serve static frontend files in production
# This must be AFTER all API/WebSocket routes
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")
    app.mount("/data", StaticFiles(directory=STATIC_DIR / "data"), name="data")
    app.mount("/textures", StaticFiles(directory=STATIC_DIR / "textures"), name="textures")
    app.mount("/models", StaticFiles(directory=STATIC_DIR / "models"), name="models")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve static files, fallback to index.html for SPA."""
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
