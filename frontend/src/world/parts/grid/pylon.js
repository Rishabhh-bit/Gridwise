import * as THREE from 'three';
import { createPrimitiveCylinder } from '../primitives/cylinder.js';
import { createPrimitiveBox } from '../primitives/box.js';
import { TOKENS } from '../../tokens.js';

/**
 * Creates a transmission pylon with lattice legs, crossarms, and hanging disc insulators.
 */
export function createPylon(height = 30, options = {}) {
  const {
    nodeId = 'utility',
    level = 'site',
    part = 'transmission_pylon',
  } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'structure' };

  // 4 corner lattice legs (tapered towards top)
  const baseW = 6.0;
  const topW = 2.0;

  const legCorners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];

  for (const [cx, cz] of legCorners) {
    const p1 = new THREE.Vector3(cx * (baseW / 2), 0, cz * (baseW / 2));
    const p2 = new THREE.Vector3(cx * (topW / 2), height, cz * (topW / 2));
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const legLen = dir.length();

    const leg = createPrimitiveCylinder(0.12, 0.18, legLen, 6, {
      part: 'pylon_leg',
      level,
      nodeId,
      cls: 'structure',
      color: TOKENS.paper,
      opacity: 0.8,
      lineColor: TOKENS.line,
    });

    leg.position.copy(p1).addScaledVector(dir, 0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    group.add(leg);
  }

  // Crossarms at 75% and 90% of height
  const crossarmHeights = [height * 0.72, height * 0.88];
  const armSpans = [12.0, 9.0];

  for (let a = 0; a < 2; a++) {
    const y = crossarmHeights[a];
    const span = armSpans[a];

    const arm = createPrimitiveBox(span, 0.5, 1.2, {
      part: `crossarm_${a + 1}`,
      level,
      nodeId,
      cls: 'structure',
      color: TOKENS.paper,
      opacity: 0.85,
      lineColor: TOKENS.ink,
    });
    arm.position.set(0, y, 0);
    group.add(arm);

    // Hanging insulators at tips
    for (const tip of [-span / 2 + 0.5, span / 2 - 0.5]) {
      const insulator = createPrimitiveCylinder(0.1, 0.1, 1.8, 6, {
        part: 'insulator_string',
        level,
        nodeId,
        cls: 'equipment',
        color: TOKENS.shortage,
        opacity: 0.9,
        lineColor: TOKENS.shortage,
      });
      insulator.position.set(tip, y - 0.9, 0);
      group.add(insulator);
    }
  }

  return group;
}
