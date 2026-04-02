# Product Specs

## Core Features

1. **3D Trajectory Viewer** — Interactive Earth-Moon-Sun scene with full Artemis II flight path
2. **Real-Time Tracking** — Spacecraft position from JPL Horizons ephemeris, updated every 30 min
3. **Live Telemetry** — Signal status and parameter monitoring from NASA GCS, polled every 2s
4. **AI Mission Assistant** — Claude-powered agent with 8 tools for querying data and analyzing the mission
5. **Mission Timeline** — Auto-computed milestones from trajectory vectors
6. **NASA Live Feed** — Embedded YouTube stream with collapsible panel
7. **HUD Overlay** — MET, distances, velocity, signal status with full precision

## Future Ideas

- Trajectory playback / time scrubber
- Earth atmosphere glow shader
- Additional celestial bodies (planets visible from Orion)
- Mobile-responsive layout
- Production build with static file serving (Nginx)
- Authentication for WebSocket endpoint
- Persistent conversation history (database)
- Multiple camera presets (Earth view, Moon view, spacecraft chase)
