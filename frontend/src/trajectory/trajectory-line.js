import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { icrfToThree } from '../utils/coordinates.js';
import { TRAJECTORY_COLOR } from '../utils/constants.js';

/**
 * Create a Line2 from ephemeris data points showing the full trajectory.
 */
export function createTrajectoryLine(data, { color = TRAJECTORY_COLOR, opacity = 0.7, linewidth = 2 } = {}) {
  const positions = [];

  for (const point of data) {
    const p = icrfToThree(point.x, point.y, point.z);
    positions.push(p.x, p.y, p.z);
  }

  const geometry = new LineGeometry();
  geometry.setPositions(positions);

  const material = new LineMaterial({
    color,
    linewidth,
    worldUnits: false,
    transparent: true,
    opacity,
  });
  material.resolution.set(window.innerWidth, window.innerHeight);

  window.addEventListener('resize', () => {
    material.resolution.set(window.innerWidth, window.innerHeight);
  });

  return new Line2(geometry, material);
}
