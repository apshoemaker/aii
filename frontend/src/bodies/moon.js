import * as THREE from 'three';
import { MOON_RADIUS } from '../utils/constants.js';
import { createLabel } from '../utils/labels.js';

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

  return { mesh };
}
