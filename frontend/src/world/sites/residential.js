import * as THREE from 'three';
import { createExtrudedPolygon } from '../parts/primitives/extrude.js';
import { createMeteringKiosk } from '../parts/grid/busbar.js';
import { TOKENS } from '../tokens.js';

export function buildResidentialSite(config = {}) {
  const group = new THREE.Group();
  group.userData = { part: 'site_residential', level: 'site', nodeId: 'residential', class: 'structure' };

  // 1. Non-rectangular L-shaped apartment block
  const lShape = [
    [-12, -10],
    [6, -10],
    [6, -2],
    [-4, -2],
    [-4, 10],
    [-12, 10],
  ];
  const bldgL = createExtrudedPolygon(lShape, 12, [], {
    nodeId: 'residential',
    level: 'site',
    part: 'residential_l_shape',
    cls: 'structure',
    color: TOKENS.fill,
    opacity: 0.28,
    lineColor: TOKENS.line,
  });
  bldgL.rotation.x = -Math.PI / 2;
  bldgL.position.set(-16, 0, -6);
  group.add(bldgL);

  // 2. Non-rectangular Courtyard / U-shaped residential block
  const uShape = [
    [-10, -8],
    [10, -8],
    [10, 8],
    [4, 8],
    [4, -2],
    [-4, -2],
    [-4, 8],
    [-10, 8],
  ];
  const bldgU = createExtrudedPolygon(uShape, 9.5, [], {
    nodeId: 'residential',
    level: 'site',
    part: 'residential_courtyard',
    cls: 'structure',
    color: TOKENS.fill,
    opacity: 0.25,
    lineColor: TOKENS.line,
  });
  bldgU.rotation.x = -Math.PI / 2;
  bldgU.position.set(16, 0, 10);
  group.add(bldgU);

  // 3. Compact residential townhouse block
  const rectShape = [
    [-8, -6],
    [8, -6],
    [8, 6],
    [-8, 6],
  ];
  const bldgRect = createExtrudedPolygon(rectShape, 8, [], {
    nodeId: 'residential',
    level: 'site',
    part: 'residential_block',
    cls: 'structure',
    color: TOKENS.fill,
    opacity: 0.22,
    lineColor: TOKENS.line,
  });
  bldgRect.rotation.x = -Math.PI / 2;
  bldgRect.position.set(14, 0, -12);
  group.add(bldgRect);

  // Meter kiosk
  const kiosk = createMeteringKiosk(4, 2.5, 3, {
    nodeId: 'residential',
    level: 'site',
    part: 'meter_kiosk',
  });
  kiosk.position.set(-4, 0, 18);
  group.add(kiosk);

  return group;
}
