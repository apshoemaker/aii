import { Vector3 } from 'three';
import { SCALE } from './constants.js';

/**
 * Convert ICRF Earth-centered coordinates (km) to Three.js coordinates.
 * ICRF: X=vernal equinox, Y=90° in equatorial plane, Z=celestial north pole
 * Three.js: X=right, Y=up, Z=toward camera
 * Mapping: X→X, Z→Y (up), Y→-Z
 */
export function icrfToThree(x, y, z) {
  return new Vector3(
    x * SCALE,
    z * SCALE,
    -y * SCALE
  );
}

/**
 * Convert ICRF velocity (m/s) to Three.js (keeping as m/s, no spatial scaling).
 */
export function icrfVelToThree(vx, vy, vz) {
  return new Vector3(vx, vz, -vy);
}
