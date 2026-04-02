# Architecture

This document describes the high-level architecture of the aii project.
If you want to familiarize yourself with the codebase, this is a good place to start.

See also [AGENTS.md](AGENTS.md) for the full documentation index.

## Bird's Eye View

The system has two processes:

1. A **frontend** (Vite + Three.js) that renders the 3D trajectory scene, polls live telemetry, and provides a chat UI.
2. A **backend** (FastAPI + LangGraph) that runs an AI agent with tools for querying ephemeris data, reading telemetry, searching the web, and analyzing images.

They communicate over WebSocket. The frontend also directly fetches ephemeris data from JPL Horizons (via a Vite proxy) and telemetry from a NASA GCS bucket.

```
                  ┌─────────────┐
                  │ JPL Horizons│
                  └──────┬──────┘
                         │ HTTP (proxied)
┌────────────────────────┼────────────────────────┐
│ Frontend (port 5199)   │                        │
│                        ▼                        │
│  ephemeris-fetcher ──► interpolator ──► scene   │
│                                          │      │
│  telemetry-poller ──► hud + marker       │      │
│                                          │      │
│  chat-ui ◄──── chat-ws ─────────────────┼──┐   │
│                                          │  │   │
│  NASA GCS ◄── telemetry-poller           │  │   │
└──────────────────────────────────────────┘  │   │
                                              │ WS│
┌─────────────────────────────────────────────┼───┘
│ Backend (port 8000)                         │
│                                             ▼
│  main.py (FastAPI WebSocket) ──► graph.py (LangGraph)
│                                      │
│                              ┌───────┴───────┐
│                              ▼               ▼
│                          agent_node      tools_node
│                         (Claude Sonnet)   (8 tools)
│                                              │
│                          horizons.py ────► JPL Horizons
│                          telemetry.py ───► NASA GCS
│                          livefeed.py ────► YouTube (yt-dlp + ffmpeg)
│                          web_search.py ──► Tavily
│                          timeline.py ────► ephemeris JSON (computed)
│                          calculator.py ──► (local eval)
│                          screenshot.py ──► (WebSocket round-trip)
└─────────────────────────────────────────────────┘
```

## Code Map

### `frontend/src/main.js`

The entry point. Wires together the scene, bodies, ephemeris, telemetry, chat, and animation loop. The animation loop runs at 60fps: it interpolates body positions from ephemeris, updates the HUD, and renders the Three.js scene.

### `frontend/src/scene.js`

Three.js renderer, camera, OrbitControls, starfield, and lighting. Uses logarithmic depth buffer (near=1e-7, far=5000) to handle the extreme scale range from a 5-meter spacecraft to a 400,000 km trajectory.

### `frontend/src/bodies/`

`earth.js` — Sphere with Blue Marble texture. Rotation uses real GMST (Greenwich Mean Sidereal Time) computed from the IAU formula, so the prime meridian faces the correct direction.

`moon.js` — Sphere with LROC texture, positioned each frame from interpolated Moon ephemeris.

`sun.js` — Glowing sphere placed at a fixed visual distance in the Sun's real ICRF direction. Also drives the directional light, so Earth/Moon lighting is physically accurate.

### `frontend/src/trajectory/`

`ephemeris-fetcher.js` — The data pipeline. Fetches Moon, Artemis II, and Sun vectors from Horizons every 30 minutes (via Vite proxy). Computes mission milestones (apogee, perigee, lunar flyby, max distance) from the actual trajectory vectors. Falls back to pre-fetched static JSON files.

`interpolator.js` — Hermite interpolation using position + velocity for smooth curves between 10-minute ephemeris steps.

### `frontend/src/spacecraft/`

`telemetry-poller.js` — Polls the NASA GCS bucket every 1 second. Two-step fetch: metadata (for generation token) then content. Tracks freshness by generation token — only fetches content when data actually changes, and reports true staleness (time since last new generation, not last poll).

`telemetry-parser.js` — Extracts parameters from the JSON. Key discovery: positions are in **feet** (not meters). Converts to km with `× 0.0003048`.

### `frontend/src/chat/`

`chat-ui.js` — Collapsible panel built with pure DOM manipulation (no framework). Handles streaming token display, tool-use indicators, markdown rendering.

`chat-ws.js` — WebSocket connection to the backend. Handles init, message send, screenshot capture/response, and reconnection.

### `backend/graph.py`

The LangGraph agent. Standard ReAct loop: agent → tools_condition → tools → agent. Uses a custom `image_aware_tool_node` that converts `__IMAGE_TOOL_RESULT__` markers into multimodal `ToolMessage` content blocks, so Claude's vision can actually see captured images.

The system prompt is rebuilt every invocation with fresh mission state (current MET, phase, next milestone) from `timeline.py`.

### `backend/tools/`

Eight tools, each a `@tool`-decorated async function:

| Tool | External dependency | What it does |
|------|-------------------|-------------|
| `horizons_query` | JPL Horizons API | Position/velocity vectors for any body at any time |
| `read_telemetry` | NASA GCS bucket | Quick telemetry summary (position, velocity, MET) |
| `inspect_telemetry` | NASA GCS bucket | Full dump of ~78 parameters with labels, by category |
| `web_search` | Tavily API | Web search for mission news |
| `mission_timeline` | Local ephemeris JSON | Computed milestones from trajectory vectors |
| `calculate` | None (local eval) | Math with orbital mechanics constants |
| `analyze_screenshot` | WebSocket round-trip | Captures Three.js canvas, sends to Claude vision |
| `analyze_live_feed` | yt-dlp + ffmpeg | Captures frame from NASA YouTube live stream |

### `backend/main.py`

FastAPI WebSocket server. Each connection gets its own screenshot queue and a fresh LangGraph instance with the screenshot tool bound to that connection's queue. Streams `astream_events` (v2 API) back as JSON messages.

## Invariants

- **Telemetry-first with Horizons fallback for position.** The spacecraft marker and HUD use live telemetry (params 2003-2005, in feet, converted to km) when the GCS data is fresh (< 5 seconds since last generation change). When telemetry goes stale, the system falls back to Horizons ephemeris interpolation. This prevents frozen-craft-with-moving-Moon bugs during telemetry gaps. The trajectory line always comes from Horizons.
- **The system prompt is rebuilt every message.** It always contains the current MET and mission phase, preventing the agent from hallucinating stale state.
- **Image tools use multimodal content blocks.** The `__IMAGE_TOOL_RESULT__` marker is intercepted by `make_image_aware_tool_node` and converted into proper `{"type": "image", "source": {"type": "base64", ...}}` blocks. Without this, Claude would hallucinate image contents.
- **Ephemeris auto-refreshes every 30 minutes.** Both trajectory lines and milestone computations update when new data arrives. The manual refresh button triggers an immediate re-fetch.
- **All API keys stay server-side.** The frontend never sees ANTHROPIC_API_KEY or TAVILY_API_KEY. The Vite proxy forwards `/ws` to the backend.

## Cross-Cutting Concerns

**Coordinate transform**: ICRF (X=vernal equinox, Y=90° equatorial, Z=celestial north) maps to Three.js (X→X, Z→Y, Y→−Z) in `coordinates.js`. All bodies and trajectories go through `icrfToThree()`.

**Scale**: 1 Three.js unit = 1,000 km. Bodies are true scale (Earth radius = 6.371 units). The Orion model is true scale (~5e-6 units). Logarithmic depth buffer handles the 10-order-of-magnitude range.

**Unit discovery**: The telemetry uses imperial units (feet, ft/s). This was discovered by comparing telemetry magnitudes against Horizons vectors at the same timestamp — the feet-to-km conversion factor (0.0003048) produces a ~97% match.
