# ADR 001: Three.js over CesiumJS for 3D rendering

**Status:** Accepted  
**Date:** 2026-04-02

## Context

We needed a WebGL library to render the Earth-Moon system with trajectory lines, body labels, and an interactive camera. CesiumJS is purpose-built for geospatial/space visualization. Three.js is a general-purpose 3D library.

## Decision

Use Three.js.

## Rationale

- **Simplicity**: Three.js has a smaller API surface and no tile-server dependencies. CesiumJS requires terrain/imagery providers and has a steeper setup.
- **Flexibility**: We needed custom coordinate transforms (ICRF → Three.js), true-scale rendering with logarithmic depth buffer, and a vanilla JS chat UI overlaid on the canvas. Three.js gives full control.
- **Bundle size**: Three.js (~600KB) vs CesiumJS (~3MB+ with workers).
- **Familiarity**: More developers know Three.js.

## Consequences

- We handle coordinate transforms ourselves (`coordinates.js`).
- No built-in globe rendering — Earth is a textured sphere, not a tiled ellipsoid.
- No built-in time/animation framework — we manage the animation loop manually.
