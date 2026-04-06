import * as THREE from 'three';
import { SCALE, EARTH_SOI, MOON_SOI } from '../utils/constants.js';

// Mass ratios for Hill sphere computation
const MOON_EARTH_MASS_RATIO = 0.01230;   // m_moon / m_earth
const EARTH_SUN_MASS_RATIO = 3.003e-6;   // m_earth / m_sun

// Earth–Sun mean distance for Earth's Hill sphere (km)
const EARTH_SUN_DIST_KM = 149_597_870.7;

// Hill sphere radius: r_H = a × (m / 3M)^(1/3)
// For Earth around Sun (static — Earth's orbital distance doesn't change much)
const EARTH_HILL_KM = EARTH_SUN_DIST_KM * Math.cbrt(EARTH_SUN_MASS_RATIO / 3);
const EARTH_HILL = EARTH_HILL_KM * SCALE;

/**
 * Create a sphere visualization (wireframe + transparent fill).
 */
function createSphere(radius, color, wireOpacity = 0.06, fillOpacity = 0.02) {
  const group = new THREE.Group();

  const wireGeo = new THREE.SphereGeometry(radius, 48, 24);
  const wireMat = new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity: wireOpacity,
    depthWrite: false,
  });
  group.add(new THREE.Mesh(wireGeo, wireMat));

  const fillGeo = new THREE.SphereGeometry(radius, 48, 24);
  const fillMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: fillOpacity,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  group.add(new THREE.Mesh(fillGeo, fillMat));

  return group;
}

/**
 * Create a Hill sphere that can be rescaled dynamically.
 * The Moon's Hill sphere radius depends on its actual distance from Earth,
 * so we update the scale each frame rather than using a fixed geometry.
 */
function createHillSphere(color) {
  // Unit sphere — scaled dynamically via group.scale
  const group = createSphere(1, color, 0.15, 0.04);
  return group;
}

export function createSOIVisuals() {
  // Laplace SOI spheres (patched-conic approximation)
  const earthSOI = createSphere(EARTH_SOI, 0x4fc3f7);
  const moonSOI = createSphere(MOON_SOI, 0xaaaaaa);
  earthSOI.position.set(0, 0, 0);

  // Hill spheres (three-body gravitational dominance)
  const moonHill = createHillSphere(0xffaa44);
  const earthHill = createSphere(EARTH_HILL, 0x44aaff, 0.08, 0.02);
  earthHill.position.set(0, 0, 0);

  // Container
  const allSOI = new THREE.Group();
  allSOI.add(earthSOI);
  allSOI.add(moonSOI);
  allSOI.add(moonHill);
  allSOI.add(earthHill);
  allSOI.visible = false;

  let visible = false;

  function toggle() {
    visible = !visible;
    allSOI.visible = visible;
    return visible;
  }

  /**
   * Update Moon SOI + Hill sphere position and scale.
   * Hill radius = d × (m_moon / 3 m_earth)^(1/3)
   * where d is the current Earth-Moon distance.
   */
  function updateMoonSOI(moonMesh, moonIcrf) {
    moonSOI.position.copy(moonMesh.position);
    moonHill.position.copy(moonMesh.position);

    if (moonIcrf) {
      // Compute current Earth-Moon distance from ICRF coordinates
      const d = Math.sqrt(moonIcrf.x ** 2 + moonIcrf.y ** 2 + moonIcrf.z ** 2);
      // Hill sphere radius in Three.js units
      const hillRadius = d * Math.cbrt(MOON_EARTH_MASS_RATIO / 3) * SCALE;
      moonHill.scale.setScalar(hillRadius);
    }
  }

  return {
    group: allSOI,
    toggle,
    updateMoonSOI,
    isVisible: () => visible,
  };
}
