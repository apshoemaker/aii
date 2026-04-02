# ADR 004: Python/FastAPI backend over Node.js

**Status:** Accepted  
**Date:** 2026-04-02

## Context

The AI agent needs a server-side runtime to protect API keys and run LangGraph. Options were Python (FastAPI + LangGraph) or JavaScript (Express + LangGraph.js).

## Decision

Use Python with FastAPI.

## Rationale

- The user had an existing LangGraphPy-x-ReactJS reference project with a working FastAPI + WebSocket pattern.
- LangGraph's Python ecosystem is more mature than LangGraph.js (more tools, better docs, larger community).
- `httpx` (Python) and `yt-dlp` (Python) provide robust async HTTP and media handling.
- Two-language stack (JS frontend + Python backend) is a common, well-understood pattern.

## Consequences

- Requires Python 3.12+ in the backend Docker container.
- Backend and frontend are fully decoupled — communicate only via WebSocket.
- Tests use pytest + pytest-asyncio.
