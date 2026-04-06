import * as THREE from 'three';
import { SCALE, EARTH_SOI, MOON_SOI } from '../utils/constants.js';

// Mass ratios for Roche lobe computation
const MOON_EARTH_MASS_RATIO = 0.01230;   // m_moon / m_earth
const EARTH_SUN_MASS_RATIO = 3.003e-6;   // m_earth / m_sun

// Earth–Moon mean distance (km) and Earth–Sun distance (km)
const EARTH_MOON_DIST_KM = 384_400;
const EARTH_SUN_DIST_KM = 149_597_870.7;

/**
 * Compute Roche lobe surface points for the secondary body in a two-body system.
 * Uses the effective potential of the Circular Restricted Three-Body Problem (CR3BP).
 *
 * The Roche lobe is the zero-velocity surface passing through the L1 point.
 * We find L1, compute the Jacobi constant there, then trace the equipotential
 * surface around the secondary body.
 */
function computeRocheLobe(massRatio, separation, segments = 64, rings = 32) {
  const q = massRatio; // m_secondary / m_primary
  const mu = q / (1 + q); // CR3BP mass parameter

  // Find L1 (between primary and secondary) using Newton's method
  // L1 is at x = 1 - r_L1 from secondary (in normalized coords where separation = 1)
  // Approximate: r_L1 ≈ (mu/3)^(1/3)  (Hill sphere radius)
  let rL1 = Math.pow(mu / 3, 1 / 3);
  for (let i = 0; i < 20; i++) {
    const x = 1 - mu - rL1;
    // Gradient of effective potential along x-axis (rotating frame)
    const dOmega = x - (1 - mu) * (x + mu) / Math.pow(Math.abs(x + mu), 3)
                     - mu * (x - 1 + mu) / Math.pow(Math.abs(x - 1 + mu), 3);
    // Second derivative
    const d2Omega = 1 + 2 * (1 - mu) / Math.pow(Math.abs(x + mu), 3)
                      + 2 * mu / Math.pow(Math.abs(x - 1 + mu), 3);
    const delta = dOmega / d2Omega;
    rL1 += delta;
    if (Math.abs(delta) < 1e-12) break;
  }

  // Jacobi constant at L1
  const xL1 = 1 - mu - rL1;
  const CJ = effectivePotential(xL1, 0, mu);

  // Trace the Roche lobe surface around the secondary (at x=1-mu, y=0, z=0 in rotating frame)
  // For each direction from the secondary, find the radius where Omega = CJ
  const vertices = [];
  const cx = 1 - mu; // secondary center in rotating frame

  for (let j = 0; j <= rings; j++) {
    const phi = (j / rings) * Math.PI; // polar angle 0..π
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2; // azimuthal 0..2π

      // Direction from secondary center
      const dx = Math.sin(phi) * Math.cos(theta);
      const dy = Math.sin(phi) * Math.sin(theta);
      const dz = Math.cos(phi);

      // Binary search for radius where Omega(cx+r*dx, r*dy, r*dz) = CJ
      let rMin = 0.001 * rL1;
      let rMax = 3 * rL1;
      let r = rL1;

      for (let iter = 0; iter < 50; iter++) {
        r = (rMin + rMax) / 2;
        const px = cx + r * dx;
        const py = r * dy;
        const pz = r * dz;
        const omega = effectivePotential(px, py, mu, pz);

        if (omega > CJ) {
          rMin = r; // inside the lobe, go farther
        } else {
          rMax = r; // outside, come closer
        }
        if (rMax - rMin < 1e-8 * rL1) break;
      }

      // Convert from normalized rotating frame to physical distance (km), then to Three.js units
      const physR = r * separation;
      vertices.push(
        physR * dx * SCALE,
        physR * dz * SCALE,  // z→y in Three.js
        -physR * dy * SCALE  // y→-z in Three.js
      );
    }
  }

  // Build indexed geometry
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  const indices = [];
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}

/**
 * Effective potential in the CR3BP rotating frame.
 * Primary at (-mu, 0), secondary at (1-mu, 0), normalized separation = 1.
 */
function effectivePotential(x, y, mu, z = 0) {
  const r1 = Math.sqrt((x + mu) ** 2 + y ** 2 + z ** 2);
  const r2 = Math.sqrt((x - 1 + mu) ** 2 + y ** 2 + z ** 2);
  return 0.5 * (x * x + y * y) + (1 - mu) / r1 + mu / r2;
}

/**
 * Create an SOI sphere (wireframe + fill).
 */
function createSOISphere(radius, color) {
  const group = new THREE.Group();

  const wireGeo = new THREE.SphereGeometry(radius, 48, 24);
  const wireMat = new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
  });
  group.add(new THREE.Mesh(wireGeo, wireMat));

  const fillGeo = new THREE.SphereGeometry(radius, 48, 24);
  const fillMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.02,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  group.add(new THREE.Mesh(fillGeo, fillMat));

  return group;
}

/**
 * Create a Roche lobe mesh for a body.
 */
function createRocheLobe(massRatio, separation, color) {
  const geo = computeRocheLobe(massRatio, separation, 64, 32);
  const group = new THREE.Group();

  const wireMat = new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
  });
  group.add(new THREE.Mesh(geo, wireMat));

  const fillMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.05,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  group.add(new THREE.Mesh(geo.clone(), fillMat));

  return group;
}

export function createSOIVisuals() {
  // SOI spheres (approximation)
  const earthSOI = createSOISphere(EARTH_SOI, 0x4fc3f7);
  const moonSOI = createSOISphere(MOON_SOI, 0xaaaaaa);
  earthSOI.position.set(0, 0, 0);

  // Roche lobes (true CR3BP zero-velocity surfaces)
  const moonRoche = createRocheLobe(MOON_EARTH_MASS_RATIO, EARTH_MOON_DIST_KM, 0xffaa44);
  const earthRoche = createRocheLobe(EARTH_SUN_MASS_RATIO, EARTH_SUN_DIST_KM, 0x44aaff);
  earthRoche.position.set(0, 0, 0);

  // Container groups
  const allSOI = new THREE.Group();
  allSOI.add(earthSOI);
  allSOI.add(moonSOI);
  allSOI.add(moonRoche);
  allSOI.add(earthRoche);
  allSOI.visible = false;

  let visible = false;

  // Reusable vectors for orientation
  const _moonPos = new THREE.Vector3();
  const _toEarth = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0);

  function toggle() {
    visible = !visible;
    allSOI.visible = visible;
    return visible;
  }

  /**
   * Update Moon SOI + Roche lobe position and orientation.
   * The Roche lobe must be oriented so its L1 neck points toward Earth (origin).
   */
  function updateMoonSOI(moonMesh, moonIcrf) {
    // Position both at Moon
    moonSOI.position.copy(moonMesh.position);
    moonRoche.position.copy(moonMesh.position);

    // Orient Roche lobe: the lobe geometry has L1 along -X (toward primary).
    // We need -X to point toward Earth (origin).
    if (moonIcrf) {
      _moonPos.copy(moonMesh.position);
      _toEarth.set(0, 0, 0).sub(_moonPos).normalize();

      // Compute orbital angular momentum for up vector
      const Lx = moonIcrf.y * moonIcrf.vz - moonIcrf.z * moonIcrf.vy;
      const Ly = moonIcrf.z * moonIcrf.vx - moonIcrf.x * moonIcrf.vz;
      const Lz = moonIcrf.x * moonIcrf.vy - moonIcrf.y * moonIcrf.vx;
      _up.set(Lx, Lz, -Ly).normalize();

      // Build rotation matrix: -X toward Earth, Y up (orbital north)
      const m = new THREE.Matrix4();
      const xAxis = _toEarth.clone().negate(); // +X = away from Earth (L2 direction)
      const zAxis = new THREE.Vector3().crossVectors(xAxis, _up).normalize();
      const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();

      m.makeBasis(xAxis, yAxis, zAxis);
      moonRoche.setRotationFromMatrix(m);
    }
  }

  return {
    group: allSOI,
    toggle,
    updateMoonSOI,
    isVisible: () => visible,
  };
}
