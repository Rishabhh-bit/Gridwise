import * as THREE from 'three';
import { createWindTurbine } from '../parts/energy/turbine.js';

/**
 * Builds the Wind farm site.
 * n_turbines = ceil(wind_capacity / 2.5) on a ridge line (Section 7.3)
 */
export function buildWindSite(config = {}) {
  const cap = config.wind_capacity ?? 5.0;
  const nTurbines = cap > 0.05 ? Math.ceil(cap / 2.5) : 0;

  const group = new THREE.Group();
  group.userData = { part: 'site_wind', level: 'site', nodeId: 'wind', class: 'structure' };

  if (nTurbines === 0) {
    // 0 MW installed
    return group;
  }

  const spacingX = 45.0;
  for (let i = 0; i < nTurbines; i++) {
    const x = (i - (nTurbines - 1) / 2) * spacingX;
    // Slight curvature along ridge line
    const z = -Math.abs(x) * 0.1;

    const turbine = createWindTurbine({
      nodeId: 'wind',
      level: 'site',
      part: 'wind_turbine',
      hubHeight: 80,
      rotorRadius: 48,
    });
    turbine.position.set(x, 0, z);
    group.add(turbine);
  }

  return group;
}
