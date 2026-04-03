import { formatMET, kmToMilesStr, kmsToMphStr } from '../utils/time.js';

const metEl = document.getElementById('met-value');
const earthDistEl = document.getElementById('earth-dist');
const earthAltEl = document.getElementById('earth-alt');
const moonDistEl = document.getElementById('moon-dist');
const velocityEl = document.getElementById('velocity-value');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

// Artemis II launch time (Apr 1, 2026 22:35:12 UTC)
const LAUNCH_EPOCH = new Date('2026-04-01T22:35:12Z');

/**
 * Update the HUD overlay.
 * @param {object|null} craftState - Position {x,y,z} and velocity {vx,vy,vz} in ICRF km, km/s
 * @param {object|null} telem - Live telemetry data (for status indicator)
 * @param {object|null} moonIcrf - Moon position {x,y,z} in ICRF km
 * @param {number} nowMs - Current simulation time in ms
 * @param {boolean} isLive - Whether the clock is in live mode
 */
export function updateHUD(craftState, telem, moonIcrf, nowMs = Date.now(), isLive = true) {
  // Telemetry signal status
  if (!isLive) {
    statusDot.className = 'playback';
    statusText.textContent = 'Ephemeris playback';
  } else if (telem) {
    if (telem.age < 5000) {
      statusDot.className = 'live';
      statusText.textContent = `Live — ${telem.activity}`;
    } else if (telem.age < 30000) {
      statusDot.className = 'stale';
      statusText.textContent = 'Signal delay...';
    } else {
      statusDot.className = 'offline';
      statusText.textContent = 'Awaiting signal';
    }
  } else {
    statusDot.className = 'offline';
    statusText.textContent = 'Connecting...';
  }

  // MET from virtual clock
  const metSeconds = (nowMs - LAUNCH_EPOCH.getTime()) / 1000;
  metEl.textContent = formatMET(metSeconds);

  // Distances and velocity
  if (craftState) {
    const { x, y, z } = craftState;

    // Distance from Earth center + altitude above surface
    const distEarthKm = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
    earthDistEl.textContent = kmToMilesStr(distEarthKm);
    earthAltEl.textContent = kmToMilesStr(distEarthKm - 6371);

    // Distance to Moon (direct ICRF vector subtraction — no coordinate transform needed)
    if (moonIcrf) {
      const dx = x - moonIcrf.x;
      const dy = y - moonIcrf.y;
      const dz = z - moonIcrf.z;
      const distMoonKm = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
      moonDistEl.textContent = kmToMilesStr(distMoonKm);
    }

    // Velocity
    if (craftState.vx != null) {
      const speedKmS = Math.sqrt(craftState.vx ** 2 + craftState.vy ** 2 + craftState.vz ** 2);
      velocityEl.textContent = kmsToMphStr(speedKmS);
    }
  }
}
