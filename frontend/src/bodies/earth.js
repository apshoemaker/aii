import * as THREE from 'three';
import { EARTH_RADIUS, EARTH_TILT } from '../utils/constants.js';
import { createLabel } from '../utils/labels.js';

/**
 * Compute Greenwich Mean Sidereal Time in radians for a given JS Date.
 * Based on the IAU formula using Julian centuries from J2000.0.
 */
function gmst(date) {
  // Julian Date
  const jd = date.getTime() / 86400000 + 2440587.5;
  // Julian centuries from J2000.0 (Jan 1, 2000 12:00 TT)
  const T = (jd - 2451545.0) / 36525.0;
  // GMST in seconds of time (IAU 1982 formula)
  const gmstSec = 67310.54841
    + (876600 * 3600 + 8640184.812866) * T
    + 0.093104 * T * T
    - 6.2e-6 * T * T * T;
  // Convert to radians (mod 2π)
  const gmstRad = (gmstSec % 86400) / 86400 * Math.PI * 2;
  return gmstRad;
}

export function createEarth() {
  const geo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);

  const loader = new THREE.TextureLoader();
  const mat = new THREE.MeshPhongMaterial({ color: 0x2244aa });

  loader.load(
    '/textures/earth_blue_marble.jpg',
    (tex) => {
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    },
    undefined,
    () => console.warn('Earth texture not found, using fallback color')
  );

  const mesh = new THREE.Mesh(geo, mat);

  // In ICRF, Earth's rotation axis is approximately the Z-axis (celestial north pole).
  // After our ICRF→Three.js transform (Z→Y), Earth's spin axis is the Y-axis.
  // The axial tilt (23.44°) is the angle between the rotation axis and the ecliptic pole.
  // In ICRF, the rotation axis IS the reference, so tilt is already accounted for.
  // We only need to apply tilt if we want to show Earth's equator tilted relative to
  // the ecliptic — but since ICRF is equatorial, Earth's equator is the XY plane.
  // So no tilt needed in ICRF frame — the texture just needs to rotate around Y.

  // Label
  const label = createLabel('EARTH', { color: '#4fc3f7', fontSize: '11px', offsetY: EARTH_RADIUS + 2 });
  mesh.add(label);

  function update() {
    // Compute real rotation angle from GMST
    const angle = gmst(new Date());
    mesh.rotation.y = angle;
  }

  return { mesh, update };
}
