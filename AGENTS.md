# AGENTS.md — Documentation Index

## Architecture

- [ARCHITECTURE.md](ARCHITECTURE.md) — System overview, module map, invariants

## Design Documentation

- [docs/DESIGN.md](docs/DESIGN.md) — Frontend design: Three.js scene, HUD, coordinate transforms
- [docs/BACKEND.md](docs/BACKEND.md) — Backend design: LangGraph agent, tools, WebSocket protocol
- [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) — JPL Horizons, GCS telemetry, DSN, TDRS, NASA textures

## Architecture Decision Records

- [docs/ADRs/index.md](docs/ADRs/index.md) — ADR index
- [docs/ADRs/001-threejs-over-cesium.md](docs/ADRs/001-threejs-over-cesium.md)
- [docs/ADRs/002-feet-not-meters.md](docs/ADRs/002-feet-not-meters.md)
- [docs/ADRs/003-horizons-for-position.md](docs/ADRs/003-horizons-for-position.md)
- [docs/ADRs/004-python-backend.md](docs/ADRs/004-python-backend.md)
- [docs/ADRs/005-image-tool-multimodal.md](docs/ADRs/005-image-tool-multimodal.md)
- [docs/ADRs/006-computed-milestones.md](docs/ADRs/006-computed-milestones.md)
- [docs/ADRs/007-dsn-xml-structure.md](docs/ADRs/007-dsn-xml-structure.md)
- [docs/ADRs/008-telemetry-blending.md](docs/ADRs/008-telemetry-blending.md)

## References

- [docs/references/horizons-api.md](docs/references/horizons-api.md) — JPL Horizons query parameters
- [docs/references/telemetry-params.md](docs/references/telemetry-params.md) — GCS parameter ID labels
- [docs/references/websocket-protocol.md](docs/references/websocket-protocol.md) — Client-server message format

## Product & Operations

- [docs/product-specs/index.md](docs/product-specs/index.md) — Feature specs
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — CI/CD pipeline, Cloud Run, GCP setup
- [docs/RELIABILITY.md](docs/RELIABILITY.md) — Error handling, fallbacks, reconnection
- [docs/SECURITY.md](docs/SECURITY.md) — API key management, eval safety
