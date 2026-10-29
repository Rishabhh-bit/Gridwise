import * as THREE from 'three';
import { createExtrudedPolygon } from '../primitives/extrude.js';
import { createPrimitiveBox } from '../primitives/box.js';
import { TOKENS } from '../../tokens.js';

/**
 * Creates a commercial building with 2-storey retail podium and set-back office tower.
 */
export function createPodiumTower(options = {}) {
  const {
    podiumW = 32,
    podiumD = 24,
    podiumH = 7.5,
    towerW = 20,
    towerD = 16,
    towerH = 26,
    nodeId = 'commercial',
    level = 'site',
    part = 'podium_tower',
  } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'structure' };

  // Podium base footprint
  const podiumFootprint = [
    [-podiumW / 2, -podiumD / 2],
    [podiumW / 2, -podiumD / 2],
    [podiumW / 2, podiumD / 2],
    [-podiumW / 2, podiumD / 2],
  ];

  const podium = createExtrudedPolygon(podiumFootprint, podiumH, [], {
    part: 'podium',
    level,
    nodeId,
    cls: 'structure',
    color: TOKENS.fill,
    opacity: 0.22,
    lineColor: TOKENS.line,
  });
  // rotate so extrusion goes vertical (Y)
  podium.rotation.x = -Math.PI / 2;
  group.add(podium);

  // Tower setback footprint
  const towerFootprint = [
    [-towerW / 2, -towerD / 2],
    [towerW / 2, -towerD / 2],
    [towerW / 2, towerD / 2],
    [-towerW / 2, towerD / 2],
  ];

  const tower = createExtrudedPolygon(towerFootprint, towerH, [], {
    part: 'tower',
    level,
    nodeId,
    cls: 'structure',
    color: TOKENS.fill,
    opacity: 0.26,
    lineColor: TOKENS.line,
  });
  tower.rotation.x = -Math.PI / 2;
  tower.position.y = podiumH;
  group.add(tower);

  // Rooftop equipment penthouse
  const penthouse = createPrimitiveBox(8, 2.5, 6, {
    part: 'rooftop_penthouse',
    level,
    nodeId,
    cls: 'structure',
    color: TOKENS.paper,
    opacity: 0.6,
    lineColor: TOKENS.ink,
  });
  penthouse.position.set(0, podiumH + towerH + 1.25, 0);
  group.add(penthouse);

  return group;
}
