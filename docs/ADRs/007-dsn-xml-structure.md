# ADR 007: DSN XML has dishes as siblings, not children of stations

**Status:** Accepted  
**Date:** 2026-04-02

## Context

The NASA DSN real-time XML feed (`https://eyes.nasa.gov/dsn/data/dsn.xml`) was initially parsed assuming `<dish>` elements were nested inside `<station>` elements. This produced empty results — no dishes found.

## Decision

Parse `<station>` and `<dish>` as siblings under `<dsn>`. Dishes belong to the most recently seen station.

## Evidence

The actual XML structure is:
```xml
<dsn>
  <station name="gdscc" friendlyName="Goldstone" .../>  <!-- self-closing -->
  <dish name="DSS14" ...>                                <!-- sibling, not child -->
    <target name="EM2" .../>
  </dish>
  <station name="cdscc" friendlyName="Canberra" .../>
  <dish name="DSS43" ...>
    ...
  </dish>
</dsn>
```

Additionally, Artemis II is labeled **"EM2"** (Exploration Mission 2) with spacecraft ID -24, not "Orion" or "Artemis".

## Consequences

- The parser iterates through all children of `<dsn>` and tracks the current station context.
- Artemis II detection matches: `em2`, `em-2`, `orion`, `artemis`.
