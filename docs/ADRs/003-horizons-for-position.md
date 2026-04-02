# ADR 003: Use Horizons as authoritative position source

**Status:** Accepted  
**Date:** 2026-04-02

## Context

Two data sources provide spacecraft position: JPL Horizons (predicted ephemeris) and the live GCS telemetry stream. They don't agree — telemetry is ~3-6% off after unit correction, and the telemetry reference frame is unverified.

## Decision

Use JPL Horizons ephemeris as the authoritative source for spacecraft position, Moon position, and Sun position. Use telemetry for supplementary data (signal status, thermal sensors, attitude quaternion, solar array angles).

## Rationale

- Horizons vectors are in a known frame (ICRF, Earth-centered) with documented units (km, km/s).
- Telemetry position units were unknown until we reverse-engineered them as feet.
- The ~3-6% discrepancy may be due to different reference frames, propagation methods, or timing offsets.
- Horizons is updated with navigation solutions from JSC, which are the same solutions used for mission planning.

## Consequences

- The 3D scene positions all bodies from Horizons interpolation, not telemetry.
- The agent's system prompt directs it to use `horizons_query` for position questions.
- Telemetry position is labeled with caution warnings in `inspect_telemetry`.
