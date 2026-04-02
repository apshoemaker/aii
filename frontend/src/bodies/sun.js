import * as THREE from 'three';
import { createLabel } from '../utils/labels.js';

/**
 * Create a Sun marker — a glowing sphere placed in the Sun's direction
 * at a fixed visual distance. Also drives the directional light.
 */
export function createSun(sunLight) {
  const group = new THREE.Group();

  // Emissive sphere (self-lit, ignores scene lighting)
  const sphereGeo = new THREE.SphereGeometry(12, 32, 32);
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  group.add(sphere);

  // Inner glow — slightly larger, soft, transparent
  const glowGeo = new THREE.SphereGeometry(18, 32, 32);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffcc22,
    transparent: true,
    opacity: 0.25,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  group.add(glow);

  // Outer halo — even larger, very soft
  const haloGeo = new THREE.SphereGeometry(30, 32, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.08,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  group.add(halo);

  // Label
  const label = createLabel('SUN', { color: '#ffee88', fontSize: '10px', offsetY: 40 });
  group.add(label);

  const VISUAL_DISTANCE = 3500;

  function update(sunIcrf) {
    if (!sunIcrf) return;

    // Sun direction in ICRF → Three.js
    const dir = new THREE.Vector3(sunIcrf.x, sunIcrf.z, -sunIcrf.y).normalize();

    // Place at visual distance in Sun's direction
    group.position.copy(dir.clone().multiplyScalar(VISUAL_DISTANCE));

    // Point the directional light from the Sun's true direction
    if (sunLight) {
      sunLight.position.copy(dir.clone().multiplyScalar(500));
    }
  }

  return { group, update };
}
