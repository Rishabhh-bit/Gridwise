import * as THREE from 'three';
import { createPrimitiveBox } from '../primitives/box.js';
import { createPrimitiveCylinder } from '../primitives/cylinder.js';
import { TOKENS } from '../../tokens.js';

/**
 * Creates an architectural canopy supported by posts with cantilever roof.
 */
export function createCanopy(width, depth, height = 3.6, options = {}) {
  const {
    nodeId = 'general',
    level = 'site',
    part = 'canopy',
    posts = 4,
    tiltDeg = 0,
  } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'structure' };

  // Posts
  const postRadius = 0.12;
  const xs = [-width / 2 + 0.5, width / 2 - 0.5];
  const zs = posts >= 4 ? [-depth / 2 + 0.5, depth / 2 - 0.5] : [0];

  for (const x of xs) {
    for (const z of zs) {
      const post = createPrimitiveCylinder(postRadius, postRadius, height, 8, {
        part: 'canopy_post',
        level,
        nodeId,
        cls: 'structure',
        color: TOKENS.paper,
        opacity: 0.9,
        lineColor: TOKENS.ink,
      });
      post.position.set(x, height / 2, z);
      group.add(post);
    }
  }

  // Canopy roof slab
  const roof = createPrimitiveBox(width, 0.2, depth, {
    part: 'canopy_roof',
    level,
    nodeId,
    cls: 'structure',
    color: TOKENS.fill,
    opacity: 0.35,
    lineColor: TOKENS.line,
  });
  roof.position.set(0, height, 0);
  if (tiltDeg !== 0) {
    roof.rotation.x = (tiltDeg * Math.PI) / 180;
  }
  group.add(roof);

  return group;
}
