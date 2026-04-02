# ADR 006: Compute milestones from ephemeris, not hardcode

**Status:** Accepted  
**Date:** 2026-04-02

## Context

The mission timeline needs milestone events (apogee, TLI, lunar flyby, max distance, splashdown). Initially these were hardcoded with guessed times. This led to inaccurate phase reporting — the agent said "outbound coast" when Orion was actually in its high elliptical orbit checkout phase.

## Decision

Compute all trajectory-derived milestones automatically from JPL Horizons ephemeris vectors at server startup. Supplement with NASA press kit information for events not derivable from vectors (burn durations, crew activities).

## Method

- **Apogee**: first speed minimum in the trajectory data
- **Perigee/TLI**: distance minimum after apogee
- **Lunar flyby**: minimum distance between Artemis and Moon vectors
- **Max Earth distance**: maximum distance from origin
- **Splashdown**: last data point (closest Earth approach in second half)

## Consequences

- Milestones automatically update when Horizons publishes new navigation solutions.
- The 30-minute auto-refresh cycle picks up trajectory changes (mid-course corrections).
- No manual timeline maintenance needed.
- Computed values are tagged as `[COMPUTED]` and include exact distances/speeds.
