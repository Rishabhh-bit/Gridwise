import * as THREE from 'three';
import { createPrimitiveBox } from '../primitives/box.js';
import { createPrimitiveCylinder } from '../primitives/cylinder.js';
import { TOKENS } from '../../tokens.js';

/**
 * Creates an industrial water pump set: motor, volute casing, base skid, and pipe flanges.
 */
export function createPumpSet(options = {}) {
  const {
    nodeId = 'water',
    level = 'site',
    part = 'pump_set',
  } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'equipment' };

  // Steel skid base
  const skid = createPrimitiveBox(3.4, 0.35, 1.6, {
    part: 'pump_skid',
    level,
    nodeId,
    cls: 'equipment',
    color: TOKENS.paper,
    opacity: 0.8,
    lineColor: TOKENS.ink,
  });
  skid.position.set(0, 0.175, 0);
  group.add(skid);

  // Electric motor (cylindrical body)
  const motor = createPrimitiveCylinder(0.45, 0.45, 1.4, 12, {
    part: 'pump_motor',
    level,
    nodeId,
    cls: 'equipment',
    color: TOKENS.fill,
    opacity: 0.4,
    lineColor: TOKENS.line,
  });
  motor.rotation.z = Math.PI / 2;
  motor.position.set(-0.7, 0.8, 0);
  group.add(motor);

  // Volute casing (centrifugal pump spiral housing)
  const volute = createPrimitiveCylinder(0.65, 0.65, 0.6, 16, {
    part: 'pump_volute',
    level,
    nodeId,
    cls: 'equipment',
    color: TOKENS.paper,
    opacity: 0.85,
    lineColor: TOKENS.ink,
  });
  volute.rotation.z = Math.PI / 2;
  volute.position.set(0.6, 0.8, 0);
  group.add(volute);

  // Discharge vertical pipe with flange
  const pipe = createPrimitiveCylinder(0.2, 0.2, 1.2, 10, {
    part: 'discharge_pipe',
    level,
    nodeId,
    cls: 'equipment',
    color: TOKENS.paper,
    opacity: 0.8,
    lineColor: TOKENS.line,
  });
  pipe.position.set(0.6, 1.7, 0);
  group.add(pipe);

  return group;
}
