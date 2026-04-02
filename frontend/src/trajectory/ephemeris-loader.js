/**
 * Load pre-fetched ephemeris JSON from public/data/.
 * Expected format:
 * [
 *   { "jd": 2461..., "x": ..., "y": ..., "z": ..., "vx": ..., "vy": ..., "vz": ... },
 *   ...
 * ]
 * Positions in km (ICRF Earth-centered), velocities in km/s.
 */
export async function loadEphemeris(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}
