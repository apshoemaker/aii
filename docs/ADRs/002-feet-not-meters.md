# ADR 002: Telemetry positions are in feet, not meters

**Status:** Accepted  
**Date:** 2026-04-02

## Context

The NASA GCS telemetry stream (bucket `p-2-cen1`, file `October_105_1.txt`) provides position parameters (2003-2005) and velocity parameters (2009-2011) with no published documentation on units or reference frame.

Initially we assumed meters (position) and m/s (velocity) based on magnitude analysis. This produced positions ~3.2x farther from Earth than JPL Horizons showed for the same timestamp.

## Decision

Parameters 2003-2005 are position in **feet** (Earth-centered ICRF). Parameters 2009-2011 are velocity in **feet per second**. Convert with `× 0.0003048` to get km and km/s.

## Evidence

At 2026-04-02 17:35 UTC:
- Telemetry raw magnitude: 207,479,646 (unknown unit)
- Horizons distance: 65,018 km
- `207,479,646 × 0.0003048 = 63,240 km` — matches Horizons within 3%
- Velocity ratio confirms: `5693.6 ft/s × 0.0003048 = 1.735 km/s` vs Horizons `1.634 km/s` (~6% match)

NASA mission operations historically use imperial units (feet, ft/s, nautical miles).

## Consequences

- All telemetry parsing code (`telemetry-parser.js`, `telemetry.py`) converts from feet.
- Position/velocity from telemetry should be treated as approximate (~3-6% error vs Horizons).
- Horizons remains the authoritative source for precise navigation.
