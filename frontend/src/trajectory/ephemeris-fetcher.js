/**
 * Live ephemeris fetcher — pulls data from Horizons API via Vite proxy,
 * falls back to pre-fetched static JSON files.
 * Auto-refreshes every 30 minutes.
 */

const REFRESH_MS = 30 * 60 * 1000; // 30 minutes

// Mission window
const START = '2026-04-02 02:00';
const STOP = '2026-04-11 00:00';
const STEP = '10 min';

/**
 * Build Horizons API query params for a vector ephemeris.
 */
function buildParams(command) {
  return new URLSearchParams({
    format: 'text',
    COMMAND: `'${command}'`,
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    CENTER: "'500@399'",
    REF_PLANE: 'FRAME',
    REF_SYSTEM: 'ICRF',
    VEC_TABLE: '2',
    VEC_LABELS: 'NO',
    CSV_FORMAT: 'YES',
    START_TIME: `'${START}'`,
    STOP_TIME: `'${STOP}'`,
    STEP_SIZE: `'${STEP}'`,
  });
}

/**
 * Parse Horizons CSV vector output into array of {jd, x, y, z, vx, vy, vz}.
 */
function parseVectors(text) {
  const lines = text.split('\n');
  const soeIdx = lines.findIndex(l => l.trim() === '$$SOE');
  const eoeIdx = lines.findIndex(l => l.trim() === '$$EOE');
  if (soeIdx === -1 || eoeIdx === -1) return null;

  const data = [];
  for (let i = soeIdx + 1; i < eoeIdx; i++) {
    const parts = lines[i].split(',').map(s => s.trim());
    if (parts.length < 8) continue;
    const jd = parseFloat(parts[0]);
    if (isNaN(jd)) continue;
    data.push({
      jd,
      x: parseFloat(parts[2]),
      y: parseFloat(parts[3]),
      z: parseFloat(parts[4]),
      vx: parseFloat(parts[5]),
      vy: parseFloat(parts[6]),
      vz: parseFloat(parts[7]),
    });
  }
  return data.length > 0 ? data : null;
}

/**
 * Fetch ephemeris from Horizons via proxy.
 */
async function fetchFromHorizons(command, label) {
  const params = buildParams(command);
  const res = await fetch(`/api/horizons?${params}`);
  if (!res.ok) throw new Error(`Horizons ${res.status}`);
  const text = await res.text();
  const data = parseVectors(text);
  if (!data) throw new Error(`No vector data parsed for ${label}`);
  console.log(`[Ephemeris] Fetched ${data.length} points for ${label} from Horizons`);
  return data;
}

/**
 * Fetch from pre-built static JSON (fallback).
 */
async function fetchFromStatic(path, label) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Static file ${res.status}`);
  const data = await res.json();
  console.log(`[Ephemeris] Loaded ${data.length} points for ${label} from static file`);
  return data;
}

/**
 * Compute mission milestones from ephemeris data.
 */
export function computeMilestones(artemisData, moonData) {
  if (!artemisData || !moonData) return null;

  const LAUNCH = Date.parse('2026-04-01T22:35:12Z');
  function jdToMs(jd) { return (jd - 2440587.5) * 86400000; }
  function jdToMet(jd) { return (jdToMs(jd) - LAUNCH) / 1000; }

  // Find closest moon point for each artemis point
  function moonAt(jd) {
    let best = 0;
    for (let i = 1; i < moonData.length; i++) {
      if (Math.abs(moonData[i].jd - jd) < Math.abs(moonData[best].jd - jd)) best = i;
    }
    return moonData[best];
  }

  // Find key trajectory events from the data
  let maxEarthDist = 0, maxEarthJd = 0;
  let minMoonDist = Infinity, minMoonJd = 0;

  // Find first orbit apogee (first speed minimum)
  let apogeeIdx = 0, apogeeSpeed = Infinity;
  for (let i = 0; i < Math.min(200, artemisData.length); i++) {
    const s = Math.sqrt(artemisData[i].vx ** 2 + artemisData[i].vy ** 2 + artemisData[i].vz ** 2);
    if (s < apogeeSpeed) { apogeeSpeed = s; apogeeIdx = i; }
    else if (s > apogeeSpeed * 1.1) break; // speed increasing, past apogee
  }

  // Find perigee (closest Earth approach after apogee)
  let perigeeIdx = apogeeIdx, perigeeDist = Infinity;
  for (let i = apogeeIdx; i < Math.min(apogeeIdx + 200, artemisData.length); i++) {
    const d = Math.sqrt(artemisData[i].x ** 2 + artemisData[i].y ** 2 + artemisData[i].z ** 2);
    if (d < perigeeDist) { perigeeDist = d; perigeeIdx = i; }
    else if (d > perigeeDist + 5000) break; // past perigee
  }

  // Find lunar flyby, max earth dist, and return
  const mid = artemisData[Math.floor(artemisData.length / 2)].jd;
  let minEarthReturn = Infinity, minEarthReturnJd = 0;

  for (const p of artemisData) {
    const earthDist = Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2);
    const m = moonAt(p.jd);
    const moonDist = Math.sqrt((p.x - m.x) ** 2 + (p.y - m.y) ** 2 + (p.z - m.z) ** 2);

    if (earthDist > maxEarthDist) { maxEarthDist = earthDist; maxEarthJd = p.jd; }
    if (moonDist < minMoonDist) { minMoonDist = moonDist; minMoonJd = p.jd; }
    if (p.jd > mid && earthDist < minEarthReturn) {
      minEarthReturn = earthDist;
      minEarthReturnJd = p.jd;
    }
  }

  return [
    { label: 'Launch', met: 0, icon: '●' },
    { label: 'First Orbit', met: jdToMet(artemisData[0].jd), icon: '○' },
    {
      label: `Apogee (${Math.round(Math.sqrt(artemisData[apogeeIdx].x**2 + artemisData[apogeeIdx].y**2 + artemisData[apogeeIdx].z**2)).toLocaleString()} km)`,
      met: jdToMet(artemisData[apogeeIdx].jd),
      icon: '△',
    },
    {
      label: `Perigee / TLI (${Math.round(perigeeDist).toLocaleString()} km)`,
      met: jdToMet(artemisData[perigeeIdx].jd),
      icon: '▽',
    },
    { label: 'Translunar Coast', met: jdToMet(artemisData[perigeeIdx].jd) + 10000, icon: '→' },
    {
      label: `Lunar Flyby (${Math.round(minMoonDist).toLocaleString()} km)`,
      met: jdToMet(minMoonJd),
      icon: '◐',
    },
    {
      label: `Max Earth Dist (${Math.round(maxEarthDist).toLocaleString()} km)`,
      met: jdToMet(maxEarthJd),
      icon: '◇',
    },
    { label: 'Return Coast', met: jdToMet(maxEarthJd) + 18000, icon: '←' },
    { label: 'Entry & Splashdown', met: jdToMet(minEarthReturnJd), icon: '▼' },
  ];
}

/**
 * Create an auto-refreshing ephemeris source.
 * Returns an object with .getData() that resolves to {moon, artemis, milestones}.
 * Refreshes from Horizons every 30 minutes.
 */
export function createEphemerisSource() {
  let moonData = null;
  let artemisData = null;
  let sunData = null;
  let milestones = null;
  let listeners = [];
  let lastFetch = 0;

  async function refresh() {
    try {
      const [moon, artemis, sun] = await Promise.all([
        fetchFromHorizons('301', 'Moon'),
        fetchFromHorizons('-1024', 'Artemis II'),
        fetchFromHorizons('10', 'Sun'),
      ]);
      moonData = moon;
      artemisData = artemis;
      sunData = sun;
      milestones = computeMilestones(artemisData, moonData);
      lastFetch = Date.now();
      console.log(`[Ephemeris] Refreshed from Horizons at ${new Date().toISOString()}`);
      listeners.forEach(fn => fn({ moon: moonData, artemis: artemisData, sun: sunData, milestones }));
    } catch (e) {
      console.warn('[Ephemeris] Horizons fetch failed, trying static fallback:', e.message);
      try {
        if (!moonData) moonData = await fetchFromStatic('/data/ephemeris-moon.json', 'Moon');
        if (!artemisData) artemisData = await fetchFromStatic('/data/ephemeris-artemis.json', 'Artemis II');
        if (!sunData) try { sunData = await fetchFromStatic('/data/ephemeris-sun.json', 'Sun'); } catch {};
        milestones = computeMilestones(artemisData, moonData);
        listeners.forEach(fn => fn({ moon: moonData, artemis: artemisData, sun: sunData, milestones }));
      } catch (e2) {
        console.error('[Ephemeris] Static fallback also failed:', e2.message);
      }
    }
  }

  // Initial fetch
  refresh();
  // Auto-refresh
  setInterval(refresh, REFRESH_MS);

  return {
    getData() {
      return { moon: moonData, artemis: artemisData, sun: sunData, milestones };
    },
    onUpdate(fn) {
      listeners.push(fn);
    },
    refresh,
  };
}
