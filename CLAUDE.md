# CLAUDE.md

Real-time 3D Artemis II trajectory viewer with AI mission assistant.

## Quick Reference

- **Frontend**: `cd frontend && npm run dev` (Vite + Three.js, port 5199)
- **Backend**: `cd backend && uvicorn main:app --port 8000` (FastAPI + LangGraph)
- **Docker**: `docker-compose up --build`
- **Tests**: `cd backend && pytest tests/ -v`

## Key Constraints

- Telemetry positions (params 2003-2005) are in **feet**, not meters. Convert with `× 0.0003048` for km.
- Horizons API has no CORS — frontend proxies via Vite, backend calls directly.
- Never hardcode API keys. They live in `.env` (gitignored).

## Documentation

See [AGENTS.md](AGENTS.md) for the full documentation index.
