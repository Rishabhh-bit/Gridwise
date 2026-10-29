import * as THREE from 'three';
import { createPrimitiveBox } from '../primitives/box.js';
import { createPrimitiveCylinder } from '../primitives/cylinder.js';
import { TOKENS } from '../../tokens.js';

/**
 * Creates 8 EV charging bays with charger pedestals and vehicles.
 * Real dimensions: bay 2.7 x 5.0 m.
 */
export function createEVChargingBays(options = {}) {
  const {
    nodeId = 'ev',
    level = 'site',
    part = 'ev_charging_bays',
    baysCount = 8,
  } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'structure' };

  const bayW = 2.7;
  const bayL = 5.0;

  for (let i = 0; i < baysCount; i++) {
    const bayGroup = new THREE.Group();
    bayGroup.userData = { part: 'ev_bay', level, nodeId, class: 'structure' };

    const xPos = (i - (baysCount - 1) / 2) * (bayW + 0.3);

    // Striped parking bay surface marking
    const bayPad = createPrimitiveBox(bayW, 0.05, bayL, {
      part: 'ev_bay_pad',
      level,
      nodeId,
      cls: 'structure',
      color: TOKENS.paper,
      opacity: 0.6,
      lineColor: TOKENS.line,
    });
    bayGroup.add(bayPad);

    // Charger pedestal at head of bay
    const pedestal = createPrimitiveBox(0.4, 1.4, 0.3, {
      part: 'ev_charger_pedestal',
      level,
      nodeId,
      cls: 'equipment',
      color: TOKENS.fill,
      opacity: 0.8,
      lineColor: TOKENS.ink,
    });
    pedestal.position.set(0, 0.7, -bayL / 2 + 0.3);
    bayGroup.add(pedestal);

    // Stylized EV car at even bays
    if (i % 2 === 0 || i === 1 || i === 7) {
      const car = new THREE.Group();
      car.userData = { part: 'ev_car', level, nodeId, class: 'prop' };

      const body = createPrimitiveBox(1.8, 0.9, 4.0, {
        part: 'car_chassis',
        level,
        nodeId,
        cls: 'prop',
        color: TOKENS.paper,
        opacity: 0.8,
        lineColor: TOKENS.line,
      });
      body.position.set(0, 0.5, 0.2);
      car.add(body);

      const cabin = createPrimitiveBox(1.5, 0.65, 2.2, {
        part: 'car_cabin',
        level,
        nodeId,
        cls: 'prop',
        color: TOKENS.fill,
        opacity: 0.4,
        lineColor: TOKENS.ink,
      });
      cabin.position.set(0, 1.25, 0.0);
      car.add(cabin);

      bayGroup.add(car);
    }

    bayGroup.position.set(xPos, 0, 0);
    group.add(bayGroup);
  }

  return group;
}
