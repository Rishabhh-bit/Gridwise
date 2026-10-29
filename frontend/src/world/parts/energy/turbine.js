import * as THREE from 'three';
import { createPrimitiveCylinder } from '../primitives/cylinder.js';
import { createPrimitiveBox } from '../primitives/box.js';
import { createExtrudedPolygon } from '../primitives/extrude.js';
import { TOKENS } from '../../tokens.js';

/**
 * Creates a wind turbine with 80m tapered tower, nacelle, hub, and 3 blades.
 */
export function createWindTurbine(options = {}) {
  const {
    nodeId = 'wind',
    level = 'site',
    part = 'wind_turbine',
    hubHeight = 80,
    rotorRadius = 48,
  } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'equipment' };

  // 1. Tapered tower: bottom radius ~2.4m, top radius ~1.4m, height 80m
  const tower = createPrimitiveCylinder(1.4, 2.4, hubHeight, 16, {
    part: 'turbine_tower',
    level,
    nodeId,
    cls: 'equipment',
    color: TOKENS.paper,
    opacity: 0.35,
    lineColor: TOKENS.line,
  });
  tower.position.set(0, hubHeight / 2, 0);
  group.add(tower);

  // 2. Nacelle housing on top
  const nacelle = createPrimitiveBox(3.4, 3.0, 9.0, {
    part: 'turbine_nacelle',
    level,
    nodeId,
    cls: 'equipment',
    color: TOKENS.paper,
    opacity: 0.6,
    lineColor: TOKENS.ink,
  });
  nacelle.position.set(0, hubHeight + 1.5, -1.0);
  group.add(nacelle);

  // 3. Rotor Hub & 3 Blades
  const rotor = new THREE.Group();
  rotor.userData = { part: 'turbine_rotor', level, nodeId, class: 'equipment' };
  rotor.position.set(0, hubHeight + 1.5, 3.8);

  // Hub nose cone
  const hubNose = createPrimitiveCylinder(0.3, 1.2, 2.0, 12, {
    part: 'turbine_hub',
    level,
    nodeId,
    cls: 'equipment',
    color: TOKENS.ink,
    opacity: 0.8,
    lineColor: TOKENS.line,
  });
  hubNose.rotation.x = Math.PI / 2;
  rotor.add(hubNose);

  // 3 Aerofoil Blades at 120-degree intervals
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI) / 3;
    const bladeGroup = new THREE.Group();
    bladeGroup.userData = { part: `turbine_blade_${i + 1}`, level, nodeId, class: 'equipment' };
    bladeGroup.rotation.z = angle;

    // Tapered blade shape
    const bladePoints = [
      [-0.4, 0],
      [0.4, 0],
      [0.8, rotorRadius * 0.25],
      [0.3, rotorRadius * 0.85],
      [0.05, rotorRadius],
      [-0.05, rotorRadius],
      [-0.4, rotorRadius * 0.25],
    ];

    const bladeMesh = createExtrudedPolygon(bladePoints, 0.2, [], {
      part: 'blade_airfoil',
      level,
      nodeId,
      cls: 'equipment',
      color: TOKENS.paper,
      opacity: 0.5,
      lineColor: TOKENS.line,
    });
    bladeMesh.rotation.y = 0.15; // pitch angle
    bladeGroup.add(bladeMesh);
    rotor.add(bladeGroup);
  }

  group.add(rotor);
  group.userData.rotorRef = rotor;

  return group;
}
