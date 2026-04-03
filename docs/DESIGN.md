# Frontend Design

## Scene Graph

The Three.js scene contains:

- **Earth** — `SphereGeometry(6.371)` with Blue Marble texture, GMST rotation
- **Moon** — `SphereGeometry(1.737)` with LROC texture, positioned from ephemeris
- **Sun** — Emissive sphere at 3500 units in Sun's ICRF direction, drives directional light
- **Trajectory lines** — `Line2` with `LineGeometry` for Artemis (cyan) and Moon (gray) paths
- **Spacecraft marker** — Orion GLB model at true scale (3.1e-7 scale factor), oriented along velocity vector
- **Starfield** — 8000 random points in a shell from 2000-4000 units
- **CSS2D Labels** — "EARTH", "MOON", "SUN", "ORION" always face camera

## Coordinate System

ICRF (International Celestial Reference Frame) to Three.js:

```
ICRF X (vernal equinox) → Three.js X
ICRF Z (celestial north) → Three.js Y (up)
ICRF Y (90° equatorial)  → Three.js -Z
```

Scale: 1 Three.js unit = 1,000 km. Applied in `icrfToThree()`.

## HUD Layout

```
┌─────────────────────────────────────────────┐
│ ARTEMIS II           │          NASA LIVE ▽ │
│ MET  0d 18:25:08     │     [YouTube embed]  │
│ EARTH 41,867 mi      │                      │
│ MOON  235,824 mi     │                      │
│ VEL   2,920 mph      │                      │
│ ● Live — MIS         │                      │
│                       ├──────────────────────┤
│                       │  Mission Assistant   │
│                       │  [chat messages]     │
│                       │  [input] [send]      │
│                       ├──────────────────────┤
│ MISSION TIMELINE      │                 [⟳] │
│ ● Launch        T+0  │                 [💬] │
│ △ Apogee    T+13h    │                      │
│ ▽ TLI       T+25h    │                      │
│ ...                   │                      │
└─────────────────────────────────────────────┘
```

## Mission Clock & Playback Bar

The viewer supports time scrubbing via a virtual clock (`utils/mission-clock.js`) that decouples simulation time from wall time.

**Modes:**
- **Live** — `now()` returns real wall-clock time; live telemetry overrides ephemeris
- **Playback** — `now()` returns virtual time, advanced by `tick()` at a configurable rate (1x/100x/1000x/10000x)

**UI** (`hud/playback-bar.js`, positioned fixed bottom-center):
- LIVE button (green glow when active) — returns to real-time
- Play/Pause toggle
- Range slider spanning the ephemeris window (Apr 2–10, 2026)
- Speed dropdown: 1x, 100x, 1000x, 10000x
- MET time label

**Key behaviors:**
- Dragging the slider auto-pauses, resumes on release
- Auto-pauses at ephemeris boundaries
- Rate > 1 auto-enters playback mode; returning to 1x near real time auto-restores live mode
- HUD status dot shows cyan "Ephemeris playback" when not live

## Telemetry Panel

Collapsible panel below the HUD (`hud/telemetry-panel.js`) that displays all raw telemetry parameters grouped by category.

- Collapsed by default — "TELEMETRY ▼" button, same width as HUD
- Expands to show ~78 parameters in 13 categories (position, velocity, attitude, angular rates, thermal, solar arrays, orbital geometry, direction vectors, propulsion, sensors, pointing, status codes, time)
- Only shows parameters with `Good` status from the GCS feed
- Re-renders at most once per second when expanded
- Parameter labels mirror the backend `PARAM_LABELS` dictionary in `backend/tools/telemetry.py`
- The frontend parser (`spacecraft/telemetry-parser.js`) now returns `allParams` — all Good-status parameters from the raw telemetry JSON

## Animation Loop

Runs at requestAnimationFrame (~60fps):

1. `missionClock.tick()` — advance virtual time if in playback mode
2. `earth.update(now)` — compute GMST, set rotation
3. Interpolate Moon, Sun positions from ephemeris at `missionClock.now()`
4. Interpolate Artemis state — live telemetry (if live mode + fresh) or ephemeris
5. `updateHUD()` — distances, velocity, MET from virtual clock
6. `updateTelemetryPanel()` — update raw params if expanded
7. `renderTimeline()` — every 1 second, recompute milestone status
8. `updatePlaybackBar()` — sync slider position and time label
9. `renderer.render()` + `labelRenderer.render()`
