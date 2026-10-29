import * as THREE from 'three';
import { createExtrudedPolygon } from '../parts/primitives/extrude.js';
import { createCanopy } from '../parts/architecture/canopy.js';
import { createPrimitiveBox } from '../parts/primitives/box.js';
import { TOKENS } from '../tokens.js';

export function buildHospitalSite(config = {}) {
  const group = new THREE.Group();
  group.userData = { part: 'site_hospital', level: 'site', nodeId: 'hospital', class: 'structure' };

  // Hospital two wings (T-shaped / Cruciform footprint)
  const hospitalShape = [
    [-18, -14],
    [18, -14],
    [18, -4],
    [7, -4],
    [7, 14],
    [-7, 14],
    [-7, -4],
    [-18, -4],
  ];

  const wings = createExtrudedPolygon(hospitalShape, 18.0, [], {
    nodeId: 'hospital',
    level: 'site',
    part: 'hospital_wings',
    cls: 'structure',
    color: TOKENS.paper,
    opacity: 0.5,
    lineColor: TOKENS.line,
  });
  wings.rotation.x = -Math.PI / 2;
  group.add(wings);

  // Emergency entrance canopy
  const canopy = createCanopy(9.0, 5.0, 3.8, {
    nodeId: 'hospital',
    level: 'site',
    part: 'hospital_entrance_canopy',
    posts: 4,
  });
  canopy.position.set(0, 0, 16.5);
  group.add(canopy);

  // Red/amber medical cross symbol on facade
  const crossGroup = new THREE.Group();
  crossGroup.userData = { part: 'hospital_cross_symbol', level: 'site', nodeId: 'hospital', class: 'prop' };

  const barV = createPrimitiveBox(1.2, 4.0, 0.3, {
    nodeId: 'hospital',
    level: 'site',
    part: 'cross_v',
    cls: 'prop',
    color: TOKENS.alert,
    opacity: 0.95,
    lineColor: TOKENS.alert,
  });
  const barH = createPrimitiveBox(4.0, 1.2, 0.3, {
    nodeId: 'hospital',
    level: 'site',
    part: 'cross_h',
    cls: 'prop',
    color: TOKENS.alert,
    opacity: 0.95,
    lineColor: TOKENS.alert,
  });
  crossGroup.add(barV);
  crossGroup.add(barH);
  crossGroup.position.set(0, 12, 14.2);
  group.add(crossGroup);

  return group;
}
