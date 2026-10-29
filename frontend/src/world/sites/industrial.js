import * as THREE from 'three';
import { createSawtoothRoof } from '../parts/architecture/sawtooth.js';
import { createExtrudedPolygon } from '../parts/primitives/extrude.js';
import { createPrimitiveCylinder } from '../parts/primitives/cylinder.js';
import { createTransformerBay } from '../parts/energy/transformerBay.js';
import { createPrimitiveBox } from '../parts/primitives/box.js';
import { TOKENS } from '../tokens.js';

export function buildIndustrialSite(config = {}) {
  const group = new THREE.Group();
  group.userData = { part: 'site_industrial', level: 'site', nodeId: 'industrial', class: 'structure' };

  const hallW = 36;
  const hallD = 24;
  const hallH = 8.5;

  // Industrial hall main body (non-rectangular footprint with recessed loading dock)
  const hallShape = [
    [-hallW / 2, -hallD / 2],
    [hallW / 2 - 8, -hallD / 2],
    [hallW / 2 - 8, -hallD / 2 + 5], // loading dock indent
    [hallW / 2, -hallD / 2 + 5],
    [hallW / 2, hallD / 2],
    [-hallW / 2, hallD / 2],
  ];

  const hall = createExtrudedPolygon(hallShape, hallH, [], {
    nodeId: 'industrial',
    level: 'site',
    part: 'industrial_hall',
    cls: 'structure',
    color: TOKENS.fill,
    opacity: 0.25,
    lineColor: TOKENS.line,
  });
  hall.rotation.x = -Math.PI / 2;
  hall.position.set(0, 0, 0);
  group.add(hall);

  // Sawtooth roof on top
  const sawtooth = createSawtoothRoof(hallW, hallD, 4, 3.8, {
    nodeId: 'industrial',
    level: 'site',
    part: 'industrial_sawtooth',
  });
  sawtooth.position.set(-hallW / 2, hallH, -hallD / 2);
  group.add(sawtooth);

  // Tall industrial exhaust chimney
  const chimney = createPrimitiveCylinder(0.8, 1.4, 28, 12, {
    nodeId: 'industrial',
    level: 'site',
    part: 'industrial_chimney',
    cls: 'equipment',
    color: TOKENS.paper,
    opacity: 0.8,
    lineColor: TOKENS.ink,
  });
  chimney.position.set(-hallW / 2 - 5, 14, -hallD / 2 + 3);
  group.add(chimney);

  // Dedicated industrial transformer yard
  const txYard = createTransformerBay({
    nodeId: 'industrial',
    level: 'site',
    part: 'industrial_transformer_yard',
    tankW: 3.5,
    tankH: 3.0,
    tankD: 4.2,
  });
  txYard.position.set(hallW / 2 + 6, 0, 0);
  group.add(txYard);

  // Loading dock platform
  const dock = createPrimitiveBox(7.5, 1.2, 4.5, {
    nodeId: 'industrial',
    level: 'site',
    part: 'loading_dock',
    cls: 'structure',
    color: TOKENS.paper,
    opacity: 0.7,
    lineColor: TOKENS.line,
  });
  dock.position.set(hallW / 2 - 4, 0.6, -hallD / 2 + 2.5);
  group.add(dock);

  return group;
}
