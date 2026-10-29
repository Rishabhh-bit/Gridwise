import * as THREE from 'three';

/**
 * Computes 3D points along a hanging catenary curve between start and end.
 * @param {THREE.Vector3} p1 Start point
 * @param {THREE.Vector3} p2 End point
 * @param {number} sag Maximum sag in metres (default 4m)
 * @param {number} segments Number of line segments (default 24)
 * @returns {THREE.Vector3[]}
 */
export function generateCatenaryPoints(p1, p2, sag = 4.0, segments = 24) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Linear interpolation
    const x = p1.x * (1 - t) + p2.x * t;
    const z = p1.z * (1 - t) + p2.z * t;
    const yStraight = p1.y * (1 - t) + p2.y * t;
    // Parabolic sag approximation to catenary: 4 * sag * t * (1 - t)
    const ySag = 4.0 * sag * t * (1.0 - t);
    points.push(new THREE.Vector3(x, yStraight - ySag, z));
  }
  return points;
}

/**
 * Creates a Line geometry with lineDistance attribute precomputed for dashed flow shaders.
 */
export function createCatenaryGeometry(p1, p2, sag = 4.0, segments = 24) {
  const pts = generateCatenaryPoints(p1, p2, sag, segments);
  const geom = new THREE.BufferGeometry().setFromPoints(pts);

  // Compute line distances for dash shader
  const distances = new Float32Array(pts.length);
  let totalDist = 0;
  distances[0] = 0;
  for (let i = 1; i < pts.length; i++) {
    totalDist += pts[i].distanceTo(pts[i - 1]);
    distances[i] = totalDist;
  }
  geom.setAttribute('lineDistance', new THREE.BufferAttribute(distances, 1));
  geom.userData = { totalLength: totalDist };
  return geom;
}
