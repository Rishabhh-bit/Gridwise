import * as THREE from 'three';
import { createPrimitiveCylinder } from '../primitives/cylinder.js';
import { TOKENS } from '../../tokens.js';

/**
 * Creates perimeter chain-link fence lines with posts.
 */
export function createPerimeterFence(width, depth, height = 2.4, options = {}) {
  const {
    nodeId = 'hub',
    level = 'site',
    part = 'perimeter_fence',
    postSpacing = 6.0,
  } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'structure' };

  const corners = [
    [-width / 2, -depth / 2],
    [width / 2, -depth / 2],
    [width / 2, depth / 2],
    [-width / 2, depth / 2],
  ];

  // Top and bottom rail lines
  for (let c = 0; c < 4; c++) {
    const [x1, z1] = corners[c];
    const [x2, z2] = corners[(c + 1) % 4];

    // Exclude entrance opening on south side
    if (c === 2) {
      // gate opening
      continue;
    }

    const ptsBottom = [new THREE.Vector3(x1, 0.2, z1), new THREE.Vector3(x2, 0.2, z2)];
    const ptsTop = [new THREE.Vector3(x1, height, z1), new THREE.Vector3(x2, height, z2)];

    const geomBottom = new THREE.BufferGeometry().setFromPoints(ptsBottom);
    const geomTop = new THREE.BufferGeometry().setFromPoints(ptsTop);

    const railMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(TOKENS.line),
      transparent: true,
      opacity: 0.6,
    });

    const railB = new THREE.Line(geomBottom, railMat);
    railB.userData = { part: 'fence_rail_bottom', level, nodeId, class: 'structure' };
    const railT = new THREE.Line(geomTop, railMat);
    railT.userData = { part: 'fence_rail_top', level, nodeId, class: 'structure' };

    group.add(railB);
    group.add(railT);
  }

  // Corner and intermediate posts
  for (let c = 0; c < 4; c++) {
    const [x, z] = corners[c];
    const post = createPrimitiveCylinder(0.06, 0.06, height, 6, {
      part: 'fence_post',
      level,
      nodeId,
      cls: 'structure',
      color: TOKENS.ink,
      opacity: 0.8,
      lineColor: TOKENS.ink,
    });
    post.position.set(x, height / 2, z);
    group.add(post);
  }

  return group;
}
