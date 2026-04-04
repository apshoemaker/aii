import * as THREE from 'three';
import { MOON_RADIUS } from '../utils/constants.js';
import { createLabel } from '../utils/labels.js';
import { icrfToThree } from '../utils/coordinates.js';

export function createMoon() {
  const geo = new THREE.SphereGeometry(MOON_RADIUS, 32, 32);

  const loader = new THREE.TextureLoader();
  const mat = new THREE.MeshPhongMaterial({ color: 0x888888 });

  loader.load(
    '/textures/moon_lroc.jpg',
    (tex) => {
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    },
    undefined,
    () => console.warn('Moon texture not found, using fallback color')
  );

  const mesh = new THREE.Mesh(geo, mat);

  // Label
  const label = createLabel('MOON', { color: '#aaaaaa', fontSize: '11px', offsetY: MOON_RADIUS + 1 });
  mesh.add(label);

  // Default position — will be overridden by ephemeris
  mesh.position.set(384, 0, 0);

  // Reusable vectors for orientation computation
  const _pos = new THREE.Vector3();
  const _vel = new THREE.Vector3();
  const _up = new THREE.Vector3();

  /**
   * Update Moon position and orientation from ICRF ephemeris state.
   * The Moon is tidally locked — its near side (texture 0° longitude)
   * always faces Earth. We compute orientation from:
   *   - Position vector (Earth → Moon direction for lookAt)
   *   - Velocity vector (orbital motion defines the "up" axis via
   *     angular momentum L = r × v, which approximates the Moon's
   *     north pole direction)
   */
  function update(moonIcrf) {
    if (!moonIcrf) return;

    // Set position
    const p = icrfToThree(moonIcrf.x, moonIcrf.y, moonIcrf.z);
    mesh.position.copy(p);

    // Compute orbital angular momentum direction (r × v) in ICRF
    // This gives us the Moon's approximate north pole direction
    _pos.set(moonIcrf.x, moonIcrf.y, moonIcrf.z);
    _vel.set(moonIcrf.vx, moonIcrf.vy, moonIcrf.vz);
    const Lx = _pos.y * _vel.z - _pos.z * _vel.y;
    const Ly = _pos.z * _vel.x - _pos.x * _vel.z;
    const Lz = _pos.x * _vel.y - _pos.y * _vel.x;

    // Convert angular momentum to Three.js coords for "up"
    _up.set(Lx, Lz, -Ly).normalize();

    // lookAt Earth (origin) — SphereGeometry's default UV mapping puts
    // the texture center at -Z in local space, and lookAt points -Z at
    // the target, so this naturally puts the texture center (near side)
    // facing Earth.
    mesh.up.copy(_up);
    mesh.lookAt(0, 0, 0);
  }

  return { mesh, update };
}
