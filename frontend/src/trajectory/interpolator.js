import { dateToJd } from '../utils/time.js';

/**
 * Create an interpolator from ephemeris data points.
 * Uses Hermite interpolation with position and velocity for smooth curves.
 */
export function createInterpolator(data) {
  // data is sorted by jd
  const jds = data.map(d => d.jd);

  function findSegment(jd) {
    if (jd <= jds[0]) return 0;
    if (jd >= jds[jds.length - 1]) return jds.length - 2;
    for (let i = 0; i < jds.length - 1; i++) {
      if (jd >= jds[i] && jd < jds[i + 1]) return i;
    }
    return jds.length - 2;
  }

  function hermite(p0, v0, p1, v1, t, dt) {
    // dt is the interval in days, convert velocity from km/s to km/day for consistency
    const vScale = dt * 86400; // seconds in the interval
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return h00 * p0 + h10 * v0 * vScale + h01 * p1 + h11 * v1 * vScale;
  }

  function stateAt(date) {
    const jd = dateToJd(date);
    const i = findSegment(jd);
    const d0 = data[i];
    const d1 = data[Math.min(i + 1, data.length - 1)];
    const dt = d1.jd - d0.jd;
    if (dt === 0) return { x: d0.x, y: d0.y, z: d0.z, vx: d0.vx, vy: d0.vy, vz: d0.vz };

    const t = (jd - d0.jd) / dt;
    // Linear interpolation for velocity (good enough at 10-min steps)
    return {
      x: hermite(d0.x, d0.vx, d1.x, d1.vx, t, dt),
      y: hermite(d0.y, d0.vy, d1.y, d1.vy, t, dt),
      z: hermite(d0.z, d0.vz, d1.z, d1.vz, t, dt),
      vx: d0.vx + (d1.vx - d0.vx) * t,
      vy: d0.vy + (d1.vy - d0.vy) * t,
      vz: d0.vz + (d1.vz - d0.vz) * t,
    };
  }

  // Backwards compat
  function positionAt(date) { return stateAt(date); }

  return { positionAt, stateAt };
}
