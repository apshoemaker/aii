import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { icrfToThree, icrfVelToThree } from '../utils/coordinates.js';
import { createLabel } from '../utils/labels.js';

/**
 * Build a procedural service module + solar panels to attach below the capsule.
 */
function buildServiceModule() {
  const group = new THREE.Group();
  const smMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 60 });
  const darkMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
  const panelMat = new THREE.MeshPhongMaterial({
    color: 0x1a237e,
    shininess: 80,
    specular: 0x333366,
  });

  // Service module cylinder
  const smGeo = new THREE.CylinderGeometry(3.8, 3.8, 7, 32);
  const sm = new THREE.Mesh(smGeo, smMat);
  sm.position.y = -6;
  group.add(sm);

  // Engine nozzle
  const nozzleGeo = new THREE.CylinderGeometry(1.2, 2.0, 2.5, 16);
  const nozzle = new THREE.Mesh(nozzleGeo, darkMat);
  nozzle.position.y = -11;
  group.add(nozzle);

  // Solar panel wings (4 panels in X configuration)
  const panelGeo = new THREE.BoxGeometry(14, 0.15, 3);
  for (let i = 0; i < 4; i++) {
    const panel = new THREE.Mesh(panelGeo, panelMat);
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    panel.position.set(
      Math.cos(angle) * 10,
      -6,
      Math.sin(angle) * 10
    );
    panel.rotation.y = -angle;
    group.add(panel);
  }

  return group;
}

// Reusable vectors for orientation
const _vel = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();

/**
 * Spacecraft marker: Orion 3D model oriented along velocity vector.
 */
export function createSpacecraftMarker() {
  const group = new THREE.Group();

  // Container for the full spacecraft model
  const modelContainer = new THREE.Group();
  modelContainer.visible = false;
  group.add(modelContainer);

  // Inner group for the model geometry (offset so rotation pivot is at center)
  const modelInner = new THREE.Group();
  modelContainer.add(modelInner);

  // True scale: STL spans ~16 units ≈ Orion's ~5m diameter
  // 1 Three.js unit = 1000 km, so 5m = 0.000005 units
  // scaleFactor = 0.000005 / 16 ≈ 3.1e-7
  // Logarithmic depth buffer allows rendering at this extreme scale
  const scaleFactor = 3.1e-7;
  let modelLoaded = false;

  // Load NASA Orion capsule GLB
  const loader = new GLTFLoader();
  loader.load(
    '/models/orion_capsule.glb',
    (gltf) => {
      const capsule = gltf.scene;
      capsule.scale.setScalar(scaleFactor);
      // The STL capsule has Y-up with nose at +Y
      modelInner.add(capsule);

      // Add procedural service module
      const sm = buildServiceModule();
      sm.scale.setScalar(scaleFactor);
      modelInner.add(sm);

      modelLoaded = true;
      console.log('Orion 3D model loaded');
    },
    undefined,
    (err) => {
      console.warn('Failed to load Orion model, using fallback:', err);
      const geo = new THREE.SphereGeometry(2, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      modelInner.add(new THREE.Mesh(geo, mat));
      modelLoaded = true;
    }
  );

  // Label
  // Label offset is in Three.js units — 0.00002 ≈ 20m above the craft
  const label = createLabel('ORION', { color: '#ffffff', fontSize: '11px', offsetY: 0.00002 });
  modelContainer.add(label);

  /**
   * Update position and orientation from Horizons ephemeris.
   * Orion flies with its engine (service module) facing retrograde,
   * so the capsule nose points prograde (along velocity).
   */
  function updateFromEphemeris(state) {
    if (!state) {
      modelContainer.visible = false;
      return;
    }

    // Position
    const p = icrfToThree(state.x, state.y, state.z);
    modelContainer.position.copy(p);
    modelContainer.visible = true;

    // Orient along velocity vector
    if (state.vx != null && modelLoaded) {
      const vel = icrfVelToThree(state.vx, state.vy, state.vz);
      vel.normalize();

      // The model's "nose" is +Y in local space
      // Build a rotation that aligns local +Y with the velocity direction
      _vel.copy(vel);

      // Use lookAt-style orientation: model Y axis -> velocity direction
      // We need a quaternion that rotates (0,1,0) to vel
      const dot = _up.dot(_vel);
      if (Math.abs(dot) > 0.999) {
        // Nearly parallel — use a different up reference
        _mat4.lookAt(new THREE.Vector3(), _vel, new THREE.Vector3(1, 0, 0));
      } else {
        _mat4.lookAt(new THREE.Vector3(), _vel, _up);
      }
      _quat.setFromRotationMatrix(_mat4);

      // lookAt aligns -Z with the target direction; we want +Y aligned
      // So rotate 90° around X to convert -Z forward to +Y forward
      const correction = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0), Math.PI / 2
      );
      modelContainer.quaternion.copy(_quat).multiply(correction);
    }
  }

  return { group, updateFromEphemeris };
}
