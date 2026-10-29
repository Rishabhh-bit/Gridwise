import * as THREE from 'three';
import { createPodiumTower } from '../parts/architecture/podiumTower.js';
import { createExtrudedPolygon } from '../parts/primitives/extrude.js';
import { TOKENS } from '../tokens.js';

export function buildCommercialSite(config = {}) {
  const group = new THREE.Group();
  group.userData = { part: 'site_commercial', level: 'site', nodeId: 'commercial', class: 'structure' };

  // Building 1: Major Podium + Tower
  const mainTower = createPodiumTower({
    podiumW: 28,
    podiumD: 22,
    podiumH: 7.0,
    towerW: 18,
    towerD: 14,
    towerH: 28.0,
    nodeId: 'commercial',
    level: 'site',
    part: 'commercial_podium_tower',
  });
  mainTower.position.set(-10, 0, 0);
  group.add(mainTower);

  // Building 2: Secondary commercial mid-rise with chamfered facade
  const midriseShape = [
    [-9, -8],
    [5, -8],
    [9, -4],
    [9, 8],
    [-9, 8],
  ];
  const midrise = createExtrudedPolygon(midriseShape, 16.0, [], {
    nodeId: 'commercial',
    level: 'site',
    part: 'commercial_midrise',
    cls: 'structure',
    color: TOKENS.fill,
    opacity: 0.24,
    lineColor: TOKENS.line,
  });
  midrise.rotation.x = -Math.PI / 2;
  midrise.position.set(18, 0, 4);
  group.add(midrise);

  return group;
}
