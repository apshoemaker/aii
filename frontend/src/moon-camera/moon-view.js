import * as THREE from 'three';
import { MOON_RADIUS } from '../utils/constants.js';
import { icrfToThree } from '../utils/coordinates.js';

const FOV = 25;
const ASPECT = 220 / 124;
const CAMERA_DIST = MOON_RADIUS / Math.tan((FOV / 2) * (Math.PI / 180) * 0.5);

export function createMoonView(canvas, moonMesh) {
  const scene = new THREE.Scene();

  // Share geometry and material with main moon (no duplicate texture load)
  const moonClone = new THREE.Mesh(moonMesh.geometry, moonMesh.material);
  scene.add(moonClone);

  // Directional light from sun direction, updated each frame
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
  scene.add(sunLight);

  const ambient = new THREE.AmbientLight(0x222233, 0.05);
  scene.add(ambient);

  // Starfield background
  const starGeo = new THREE.BufferGeometry();
  const starVerts = new Float32Array(1000 * 3);
  for (let i = 0; i < 1000; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 200;
    starVerts[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starVerts[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starVerts[i * 3 + 2] = r * Math.cos(phi);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starVerts, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.4 }));
  scene.add(stars);

  // Camera
  const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 0.001, 500);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(220, 124);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  let frameCount = 0;
  const _dir = new THREE.Vector3();
  const _sunDir = new THREE.Vector3();

  function update(craftIcrf, moonIcrf, sunIcrf) {
    frameCount++;
    if (frameCount % 3 !== 0) return;
    if (!craftIcrf || !moonIcrf) return;

    // Camera: from Orion's position looking toward moon
    _dir.copy(icrfToThree(
      craftIcrf.x - moonIcrf.x,
      craftIcrf.y - moonIcrf.y,
      craftIcrf.z - moonIcrf.z,
    )).normalize().multiplyScalar(CAMERA_DIST);
    camera.position.copy(_dir);
    camera.lookAt(0, 0, 0);

    // Sun direction relative to moon
    if (sunIcrf) {
      _sunDir.copy(icrfToThree(
        sunIcrf.x - moonIcrf.x,
        sunIcrf.y - moonIcrf.y,
        sunIcrf.z - moonIcrf.z,
      )).normalize().multiplyScalar(500);
      sunLight.position.copy(_sunDir);
    }

    // Sync rotation with main moon mesh (tidal locking)
    moonClone.quaternion.copy(moonMesh.quaternion);

    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
    starGeo.dispose();
  }

  return { update, dispose };
}
