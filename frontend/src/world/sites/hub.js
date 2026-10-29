import * as THREE from 'three';
import { createTransformerBay } from '../parts/energy/transformerBay.js';
import { createBusbarGantry, createMeteringKiosk } from '../parts/grid/busbar.js';
import { createPerimeterFence } from '../parts/site/fence.js';

export function buildHubSite(config = {}) {
  const group = new THREE.Group();
  group.userData = { part: 'site_hub', level: 'site', nodeId: 'hub', class: 'structure' };

  // Yard perimeter fence
  const fence = createPerimeterFence(70, 55, 2.6, {
    nodeId: 'hub',
    level: 'site',
    part: 'perimeter_fence',
  });
  group.add(fence);

  // 2 Transformer bays
  for (let i = 0; i < 2; i++) {
    const bay = createTransformerBay({
      nodeId: 'hub',
      level: 'site',
      part: `transformer_bay_${i + 1}`,
    });
    bay.position.set((i - 0.5) * 22, 0, -8);
    group.add(bay);
  }

  // Busbar gantry connecting bays
  const gantry = createBusbarGantry(45, 10, {
    nodeId: 'hub',
    level: 'site',
    part: 'busbar_gantry',
  });
  gantry.position.set(0, 0, 5);
  group.add(gantry);

  // Control house
  const controlHouse = createMeteringKiosk(18, 4.5, 10, {
    nodeId: 'hub',
    level: 'site',
    part: 'control_house',
  });
  controlHouse.position.set(0, 0, 20);
  group.add(controlHouse);

  return group;
}
