import * as THREE from 'three';
import { createPrimitiveBox } from '../primitives/box.js';
import { createPrimitiveCylinder } from '../primitives/cylinder.js';
import { TOKENS } from '../../tokens.js';

/**
 * Creates a high-voltage substation transformer bay with main tank, cooling radiators, and bushings.
 */
export function createTransformerBay(options = {}) {
  const {
    nodeId = 'hub',
    level = 'site',
    part = 'transformer_bay',
    tankW = 4.2,
    tankH = 3.6,
    tankD = 5.4,
  } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'equipment' };

  // Concrete pad foundation
  const pad = createPrimitiveBox(tankW + 2.5, 0.4, tankD + 2.5, {
    part: 'transformer_pad',
    level,
    nodeId,
    cls: 'structure',
    color: TOKENS.paper,
    opacity: 0.8,
    lineColor: TOKENS.ink,
  });
  pad.position.set(0, 0.2, 0);
  group.add(pad);

  // Main oil tank
  const tank = createPrimitiveBox(tankW, tankH, tankD, {
    part: 'transformer_tank',
    level,
    nodeId,
    cls: 'equipment',
    color: TOKENS.fill,
    opacity: 0.35,
    lineColor: TOKENS.ink,
  });
  tank.position.set(0, 0.4 + tankH / 2, 0);
  group.add(tank);

  // Radiator banks on both sides (fin plates)
  for (const side of [-1, 1]) {
    const radGroup = new THREE.Group();
    radGroup.userData = { part: `radiator_bank_${side > 0 ? 'right' : 'left'}`, level, nodeId, class: 'equipment' };
    const xPos = side * (tankW / 2 + 0.6);

    for (let f = 0; f < 6; f++) {
      const zPos = (f - 2.5) * 0.7;
      const fin = createPrimitiveBox(0.08, tankH * 0.75, 0.5, {
        part: 'radiator_fin',
        level,
        nodeId,
        cls: 'equipment',
        color: TOKENS.paper,
        opacity: 0.7,
        lineColor: TOKENS.line,
      });
      fin.position.set(xPos, 0.4 + tankH / 2, zPos);
      radGroup.add(fin);
    }
    group.add(radGroup);
  }

  // Conservator tank on top
  const conservator = createPrimitiveCylinder(0.5, 0.5, 3.2, 10, {
    part: 'conservator_tank',
    level,
    nodeId,
    cls: 'equipment',
    color: TOKENS.paper,
    opacity: 0.8,
    lineColor: TOKENS.ink,
  });
  conservator.rotation.z = Math.PI / 2;
  conservator.position.set(-0.8, 0.4 + tankH + 0.7, 0);
  group.add(conservator);

  // High voltage bushings (3 porcelain insulators on top)
  for (let b = 0; b < 3; b++) {
    const zPos = (b - 1) * 1.4;
    const bushing = createPrimitiveCylinder(0.12, 0.25, 1.6, 8, {
      part: `bushing_${b + 1}`,
      level,
      nodeId,
      cls: 'equipment',
      color: TOKENS.paper,
      opacity: 0.9,
      lineColor: TOKENS.shortage,
    });
    bushing.position.set(0.8, 0.4 + tankH + 0.8, zPos);
    group.add(bushing);
  }

  return group;
}
