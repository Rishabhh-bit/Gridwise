import * as THREE from 'three';
import { createPrimitiveBox } from '../primitives/box.js';
import { createPrimitiveCylinder } from '../primitives/cylinder.js';
import { TOKENS } from '../../tokens.js';

/**
 * Creates a tilted PV table with 2xN module arrangement and support frame.
 * Tilt 22°, module size ~1.7 x 1.0 m.
 */
export function createPVTable(cols = 6, options = {}) {
  const {
    nodeId = 'solar',
    level = 'site',
    part = 'pv_table',
    tiltDeg = 22,
  } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'equipment' };

  const modW = 1.0;
  const modL = 1.7;
  const tableW = cols * (modW + 0.05);
  const tableL = 2 * (modL + 0.05);

  // Support posts
  const postHFront = 0.8;
  const postHBack = postHFront + Math.sin((tiltDeg * Math.PI) / 180) * tableL;

  const postPositions = [
    [-tableW / 2 + 0.6, -tableL / 2 + 0.3, postHBack],
    [tableW / 2 - 0.6, -tableL / 2 + 0.3, postHBack],
    [-tableW / 2 + 0.6, tableL / 2 - 0.3, postHFront],
    [tableW / 2 - 0.6, tableL / 2 - 0.3, postHFront],
  ];

  for (const [x, z, h] of postPositions) {
    const post = createPrimitiveCylinder(0.06, 0.06, h, 8, {
      part: 'pv_post',
      level,
      nodeId,
      cls: 'equipment',
      color: TOKENS.paper,
      opacity: 0.8,
      lineColor: TOKENS.ink,
    });
    post.position.set(x, h / 2, z);
    group.add(post);
  }

  // Tilted table rack
  const rack = new THREE.Group();
  rack.position.set(0, (postHFront + postHBack) / 2, 0);
  rack.rotation.x = (tiltDeg * Math.PI) / 180;

  // Individual PV modules (2 rows x cols)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < cols; c++) {
      const mx = (c - (cols - 1) / 2) * (modW + 0.04);
      const mz = (r - 0.5) * (modL + 0.04);

      const mod = createPrimitiveBox(modW, 0.04, modL, {
        part: 'pv_module',
        level,
        nodeId,
        cls: 'equipment',
        color: TOKENS.renewable,
        opacity: 0.45,
        lineColor: TOKENS.line,
      });
      mod.position.set(mx, 0, mz);
      rack.add(mod);
    }
  }

  group.add(rack);
  return group;
}
