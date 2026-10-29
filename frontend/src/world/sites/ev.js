import * as THREE from 'three';
import { createEVChargingBays } from '../parts/site/parkingBays.js';
import { createCanopy } from '../parts/architecture/canopy.js';
import { createTransformerBay } from '../parts/energy/transformerBay.js';

export function buildEVSite(config = {}) {
  const group = new THREE.Group();
  group.userData = { part: 'site_ev', level: 'site', nodeId: 'ev', class: 'structure' };

  // Exactly 8 EV bays with charger pedestals & cars
  const bays = createEVChargingBays({
    nodeId: 'ev',
    level: 'site',
    part: 'ev_charging_bays',
    baysCount: 8,
  });
  group.add(bays);

  // Large canopy over all 8 bays (8 bays * 3m ≈ 24m)
  const canopy = createCanopy(26, 7.5, 4.2, {
    nodeId: 'ev',
    level: 'site',
    part: 'ev_canopy',
    posts: 6,
    tiltDeg: -3,
  });
  canopy.position.set(0, 0, 0);
  group.add(canopy);

  // Step-down fast-charging transformer
  const tx = createTransformerBay({
    nodeId: 'ev',
    level: 'site',
    part: 'ev_transformer',
    tankW: 2.8,
    tankH: 2.4,
    tankD: 3.2,
  });
  tx.position.set(16, 0, -2);
  group.add(tx);

  return group;
}
