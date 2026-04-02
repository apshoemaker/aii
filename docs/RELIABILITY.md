# Reliability

## Fallback Chain

| Component | Primary | Fallback |
|-----------|---------|----------|
| Ephemeris | Live Horizons API (30-min refresh) | Pre-fetched static JSON in `public/data/` |
| Spacecraft position | Live GCS telemetry (1s poll, generation-tracked) | Horizons ephemeris interpolation (when telemetry stale > 5s) |
| Telemetry signal | Live GCS polling (1s) | HUD shows "Awaiting signal" |
| Chat WebSocket | Direct connection | Auto-reconnect after 3s |
| Earth/Moon textures | NASA images from `public/textures/` | Solid colored spheres |
| Orion 3D model | GLB from `public/models/` | White sphere fallback |
| Sun ephemeris | Live Horizons | Static JSON, or default position |

## Error Handling

- **Horizons 503** (rate limiting): Falls back to static JSON. The 30-min refresh interval avoids aggressive polling.
- **GCS fetch failure**: `telemetry-poller.js` logs warning, continues polling. HUD shows stale data age.
- **WebSocket disconnect**: `chat-ws.js` reconnects after 3 seconds. Status dot turns red.
- **Agent tool error**: Caught in `invoke_agent`, sent as `{"type": "error"}` message. The agent can retry with a different tool.
- **Screenshot timeout**: 10-second `asyncio.Queue` timeout returns an error message to the agent.
- **yt-dlp/ffmpeg failure**: Returns descriptive error string (stream unavailable, timeout, etc.).

## Health Checks

- **Backend**: Docker healthcheck pings `GET /docs` every 10s.
- **Frontend**: `depends_on: backend: condition: service_healthy` ensures startup order.
