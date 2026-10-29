import * as THREE from 'three';
import { createPrimitiveCylinder } from '../parts/primitives/cylinder.js';
import { createExtrudedPolygon } from '../parts/primitives/extrude.js';
import { createPumpSet } from '../parts/energy/pump.js';
import { TOKENS } from '../tokens.js';

export function buildWaterSite(config = {}) {
  const group = new THREE.Group();
  group.userData = { part: 'site_water', level: 'site', nodeId: 'water', class: 'structure' };

  // Large municipal cylindrical water storage tank
  const tank = createPrimitiveCylinder(9.0, 9.0, 14.0, 24, {
    nodeId: 'water',
    level: 'site',
    part: 'water_storage_tank',
    cls: 'equipment',
    color: TOKENS.paper,
    opacity: 0.8,
    lineColor: TOKENS.ink,
  });
  tank.position.set(-10, 7.0, 0);
  group.add(tank);

  // Pump house building
  const houseShape = [
    [-8, -6],
    [8, -6],
    [8, 6],
    [-8, 6],
  ];
  const pumpHouse = createExtrudedPolygon(houseShape, 6.0, [], {
    nodeId: 'water',
    level: 'site',
    part: 'pump_house',
    cls: 'structure',
    color: TOKENS.fill,
    opacity: 0.25,
    lineColor: TOKENS.line,
  });
  pumpHouse.rotation.x = -Math.PI / 2;
  pumpHouse.position.set(12, 0, 0);
  group.add(pumpHouse);

  // External pump manifold set
  const pump = createPumpSet({
    nodeId: 'water',
    level: 'site',
    part: 'water_pump_set',
  });
  pump.position.set(12, 0, 9);
  group.add(pump);

  return group;
}
