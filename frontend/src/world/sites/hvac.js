import * as THREE from 'three';
import { createChillerPlant } from '../parts/energy/chiller.js';

export function buildHVACSite(config = {}) {
  const group = new THREE.Group();
  group.userData = { part: 'site_hvac', level: 'site', nodeId: 'hvac', class: 'structure' };

  const plant = createChillerPlant({
    nodeId: 'hvac',
    level: 'site',
    part: 'hvac_chiller_plant',
    width: 26,
    depth: 18,
    height: 7.5,
  });
  group.add(plant);

  return group;
}
