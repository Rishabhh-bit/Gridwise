import * as THREE from 'three';
import { createExtrudedPolygon } from '../primitives/extrude.js';
import { createPrimitiveBox } from '../primitives/box.js';
import { TOKENS } from '../../tokens.js';

/**
 * Creates an architectural wall with thickness, floor-to-floor height, and window/door openings.
 */
export function createWallWithOpenings(length, height, thickness = 0.25, openings = [], options = {}) {
  const {
    nodeId = 'general',
    part = 'wall',
    level = 'site',
  } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'structure' };

  // 2D elevation shape
  const outer = [
    [0, 0],
    [length, 0],
    [length, height],
    [0, height],
  ];

  // Openings as holes
  const holes = openings.map((op) => [
    [op.x, op.y],
    [op.x + op.w, op.y],
    [op.x + op.w, op.y + op.h],
    [op.x, op.y + op.h],
  ]);

  const wallMesh = createExtrudedPolygon(outer, thickness, holes, {
    part: `${part}_extrude`,
    level,
    nodeId,
    cls: 'structure',
    color: TOKENS.fill,
    opacity: 0.18,
    lineColor: TOKENS.line,
  });

  group.add(wallMesh);

  // Add lintel and sill blueprint lines for architectural feel
  for (const op of openings) {
    if (op.type === 'window') {
      const sill = createPrimitiveBox(op.w + 0.1, 0.08, thickness + 0.04, {
        part: 'window_sill',
        level,
        nodeId,
        cls: 'structure',
        color: TOKENS.paper,
        opacity: 0.8,
        lineColor: TOKENS.ink,
      });
      sill.position.set(op.x + op.w / 2, op.y, thickness / 2);
      group.add(sill);
    }
  }

  return group;
}
