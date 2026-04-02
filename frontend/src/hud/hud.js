import { icrfToThree } from '../utils/coordinates.js';
import { formatMET, kmToMilesStr, kmsToMphStr } from '../utils/time.js';
import { SCALE } from '../utils/constants.js';

const metEl = document.getElementById('met-value');
const earthDistEl = document.getElementById('earth-dist');
const moonDistEl = document.getElementById('moon-dist');
const velocityEl = document.getElementById('velocity-value');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

// Artemis II launch time (Apr 1, 2026 22:35:12 UTC)
const LAUNCH_EPOCH = new Date('2026-04-01T22:35:12Z');

/**
 * Update the HUD overlay.
 * @param {object|null} craftState - Ephemeris state {x,y,z,vx,vy,vz} in ICRF km, km/s
 * @param {object|null} telem - Live telemetry data (for status indicator)
 * @param {Vector3} moonThreePos - Moon position in Three.js coordinates
 */
export function updateHUD(craftState, telem, moonThreePos) {
  // Telemetry signal status
  if (telem) {
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

  // MET from wall clock
  const metSeconds = (Date.now() - LAUNCH_EPOCH.getTime()) / 1000;
  metEl.textContent = formatMET(metSeconds);

  // Distances and velocity from ephemeris
  if (craftState) {
    const { x, y, z } = craftState;
    const distEarthKm = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
    earthDistEl.textContent = kmToMilesStr(distEarthKm);

    if (moonThreePos) {
      const craftThree = icrfToThree(x, y, z);
      const distMoonUnits = craftThree.distanceTo(moonThreePos);
      const distMoonKm = distMoonUnits / SCALE;
      moonDistEl.textContent = kmToMilesStr(distMoonKm);
    }

    // Velocity from ephemeris (km/s → mph)
    if (craftState.vx != null) {
      const speedKmS = Math.sqrt(craftState.vx ** 2 + craftState.vy ** 2 + craftState.vz ** 2);
      velocityEl.textContent = kmsToMphStr(speedKmS);
    }
  }
}
