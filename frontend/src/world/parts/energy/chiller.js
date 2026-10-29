import * as THREE from 'three';
import { createPrimitiveBox } from '../primitives/box.js';
import { createPrimitiveCylinder } from '../primitives/cylinder.js';
import { TOKENS } from '../../tokens.js';

/**
 * Creates HVAC plant building with 2 cooling tower cells on top.
 */
export function createChillerPlant(options = {}) {
  const {
    nodeId = 'hvac',
    level = 'site',
    part = 'chiller_plant',
    width = 24,
    depth = 16,
    height = 7,
  } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'structure' };

  // Main plant building
  const plantBuilding = createPrimitiveBox(width, height, depth, {
    part: 'chiller_building',
    level,
    nodeId,
    cls: 'structure',
    color: TOKENS.fill,
    opacity: 0.22,
    lineColor: TOKENS.line,
  });
  plantBuilding.position.set(0, height / 2, 0);
  group.add(plantBuilding);

  // Two cooling tower cells on rooftop
  for (let c = 0; c < 2; c++) {
    const xPos = (c - 0.5) * 8.0;
    const towerCell = new THREE.Group();
    towerCell.userData = { part: `cooling_tower_cell_${c + 1}`, level, nodeId, class: 'equipment' };

    const body = createPrimitiveBox(5.5, 4.0, 5.5, {
      part: 'cooling_tower_box',
      level,
      nodeId,
      cls: 'equipment',
      color: TOKENS.paper,
      opacity: 0.65,
      lineColor: TOKENS.ink,
    });
    body.position.set(0, 2.0, 0);
    towerCell.add(body);

    // Fan shroud on top
    const fanShroud = createPrimitiveCylinder(1.6, 1.8, 1.2, 12, {
      part: 'fan_shroud',
      level,
      nodeId,
      cls: 'equipment',
      color: TOKENS.paper,
      opacity: 0.85,
      lineColor: TOKENS.line,
    });
    fanShroud.position.set(0, 4.6, 0);
    towerCell.add(fanShroud);

    towerCell.position.set(xPos, height, 0);
    group.add(towerCell);
  }

  return group;
}
