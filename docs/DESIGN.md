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

## Animation Loop

Runs at requestAnimationFrame (~60fps):

1. `earth.update()` — compute GMST, set rotation
2. Interpolate Moon, Sun positions from ephemeris at `Date.now()`
3. Interpolate Artemis state (position + velocity) from ephemeris
4. Update spacecraft marker position and orientation (velocity-aligned)
5. `updateHUD()` — distances, velocity, MET from ephemeris
6. `renderTimeline()` — every 1 second, recompute milestone status
7. `renderer.render()` + `labelRenderer.render()`
