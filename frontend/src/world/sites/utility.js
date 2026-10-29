import * as THREE from 'three';
import { createPylon } from '../parts/grid/pylon.js';
import { createMeteringKiosk } from '../parts/grid/busbar.js';

export function buildUtilitySite(config = {}) {
  const group = new THREE.Group();
  group.userData = { part: 'site_utility', level: 'site', nodeId: 'utility', class: 'structure' };

  // Transmission pylon
  const pylon = createPylon(32, {
    nodeId: 'utility',
    level: 'site',
    part: 'transmission_pylon',
  });
  pylon.position.set(0, 0, 0);
  group.add(pylon);

  // Metering and step-down kiosk
  const kiosk = createMeteringKiosk(6.5, 3.5, 4.5, {
    nodeId: 'utility',
    level: 'site',
    part: 'metering_kiosk',
  });
  kiosk.position.set(12, 0, 8);
  group.add(kiosk);

  return group;
}
