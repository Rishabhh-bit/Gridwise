import * as THREE from 'three';
import { createPrimitiveBox } from '../primitives/box.js';
import { createPrimitiveCylinder } from '../primitives/cylinder.js';
import { TOKENS } from '../../tokens.js';

/**
 * Creates substation busbar gantries and metering kiosk.
 */
export function createBusbarGantry(span = 24, height = 9, options = {}) {
  const {
    nodeId = 'hub',
    level = 'site',
    part = 'busbar_gantry',
  } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'structure' };

  // Two vertical gantry posts
  for (const x of [-span / 2, span / 2]) {
    const post = createPrimitiveCylinder(0.2, 0.25, height, 8, {
      part: 'gantry_column',
      level,
      nodeId,
      cls: 'structure',
      color: TOKENS.paper,
      opacity: 0.85,
      lineColor: TOKENS.ink,
    });
    post.position.set(x, height / 2, 0);
    group.add(post);
  }

  // Horizontal lattice beam
  const beam = createPrimitiveBox(span + 1.0, 0.6, 0.8, {
    part: 'gantry_beam',
    level,
    nodeId,
    cls: 'structure',
    color: TOKENS.paper,
    opacity: 0.85,
    lineColor: TOKENS.ink,
  });
  beam.position.set(0, height, 0);
  group.add(beam);

  // 3 high voltage busbar lines across the beam
  for (let phase = -1; phase <= 1; phase++) {
    const bar = createPrimitiveCylinder(0.04, 0.04, span + 4.0, 6, {
      part: `busbar_phase_${phase + 2}`,
      level,
      nodeId,
      cls: 'cable',
      color: TOKENS.line,
      opacity: 0.95,
      lineColor: TOKENS.line,
    });
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, height + 0.5, phase * 1.2);
    group.add(bar);
  }

  return group;
}

export function createMeteringKiosk(w = 5, h = 3.2, d = 3.5, options = {}) {
  const {
    nodeId = 'general',
    level = 'site',
    part = 'metering_kiosk',
  } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'structure' };

  const kiosk = createPrimitiveBox(w, h, d, {
    part: 'kiosk_box',
    level,
    nodeId,
    cls: 'structure',
    color: TOKENS.fill,
    opacity: 0.3,
    lineColor: TOKENS.ink,
  });
  kiosk.position.set(0, h / 2, 0);
  group.add(kiosk);

  return group;
}
