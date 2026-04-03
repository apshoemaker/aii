# Backend Design

## LangGraph Agent

The agent uses a standard ReAct (Reason + Act) loop:

```
START → agent_node → tools_condition
                        ├→ tools_node → agent_node (loop)
                        └→ END (no tool calls)
```

**Model**: Claude Haiku 4.5 (`anthropic/claude-haiku-4.5`) via OpenRouter, with 4096 max tokens. Configurable via `OPENROUTER_MODEL` env var or `DEFAULT_MODEL` in `graph.py`.

**Memory**: `MemorySaver` checkpointer, keyed by thread_id (client UUID). Conversations persist across messages within a session.

**System prompt**: Rebuilt every invocation with:
- Static mission facts (launch date, crew, NAIF IDs)
- Dynamic mission state from `get_mission_context_string()` (current MET, phase, next milestone)
- Explicit guardrails ("never say flyby happened if MET < 5 days")

## WebSocket Protocol

See [references/websocket-protocol.md](references/websocket-protocol.md) for the full message format.

Key design choices:
- **Per-connection tool binding**: Each WebSocket connection gets a fresh LangGraph graph with a screenshot tool bound to that connection's `asyncio.Queue`.
- **Streaming**: Uses `graph.astream_events(version="v2")`. Text tokens are sent as `{"type": "token"}`, tool starts/ends as metadata.
- **Tool call filtering**: `on_chat_model_stream` events with `tool_call_chunks` are skipped (they contain partial JSON, not user-facing text).

## Image Analysis Pipeline

The `image_aware_tool_node` intercepts `__IMAGE_TOOL_RESULT__` markers:

```
Tool returns: "__IMAGE_TOOL_RESULT__\n<question>\n<base64_jpeg>"
     ↓
image_aware_tool_node detects marker
     ↓
Constructs ToolMessage with content blocks:
  [{"type": "image", "source": {"type": "base64", ...}},
   {"type": "text", "text": "...question..."}]
     ↓
Claude vision processes the actual image
```

## Live Feed Capture

The `analyze_live_feed` tool runs server-side:

```
yt-dlp --get-url <youtube_url>  →  stream URL
ffmpeg -i <stream_url> -frames:v 1  →  single JPEG frame
base64 encode  →  __IMAGE_TOOL_RESULT__ response
```

Requires `yt-dlp` and `ffmpeg` installed (both included in the Docker image).
