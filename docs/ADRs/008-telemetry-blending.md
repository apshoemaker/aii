# ADR 008: Blend live telemetry with Horizons ephemeris for position

**Status:** Accepted  
**Date:** 2026-04-02

## Context

Two sources provide spacecraft position: live GCS telemetry (1-second updates, in feet) and JPL Horizons ephemeris (predicted trajectory, 10-minute resolution). The telemetry gives real spacecraft data but has gaps when the GCS file stops updating. During gaps, the Moon position (from Horizons) would continue moving while the craft position stayed frozen, causing incorrect distance calculations.

## Decision

Use live telemetry for spacecraft position when fresh (< 5 seconds since last GCS generation change). Fall back to Horizons ephemeris interpolation when telemetry is stale.

## Implementation

- `telemetry-poller.js` tracks freshness by GCS `generation` token, not fetch time
- Skips redundant content fetches when generation hasn't changed
- `main.js` blending logic: `if (telem.age < 5000 && telem.position) use telemetry; else use ephemeris`
- The trajectory line always comes from Horizons (predicted path)
- The HUD shows both distance-from-center and altitude-above-surface

## Consequences

- Seamless transitions during telemetry gaps — no visible jumps
- Real spacecraft position when stream is active (matches AROW)
- Consistent craft-to-Moon distance calculations (both sources update together)
- ~3-6% deviation between telemetry and Horizons is expected and acceptable
