import * as THREE from 'three';
import { createPVTable } from '../parts/energy/pvTable.js';
import { createMeteringKiosk } from '../parts/grid/busbar.js';

/**
 * Builds the Solar park site.
 * n_tables = round(solar_capacity / 0.75) (Section 7.3)
 */
export function buildSolarSite(config = {}) {
  const cap = config.solar_capacity ?? 9.0;
  const nTables = Math.max(1, Math.round(cap / 0.75));

  const group = new THREE.Group();
  group.userData = { part: 'site_solar', level: 'site', nodeId: 'solar', class: 'structure' };

  // Place PV tables in a grid array
  const cols = Math.min(4, nTables);
  const rows = Math.ceil(nTables / cols);
  const spacingX = 12.0;
  const spacingZ = 8.0;

  for (let i = 0; i < nTables; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = (c - (cols - 1) / 2) * spacingX;
    const z = (r - (rows - 1) / 2) * spacingZ;

    const table = createPVTable(6, {
      nodeId: 'solar',
      level: 'site',
      part: 'pv_table',
    });
    table.position.set(x, 0, z);
    group.add(table);
  }

  // Central inverter pad & kiosk
  const inverter = createMeteringKiosk(6.0, 3.0, 4.0, {
    nodeId: 'solar',
    level: 'site',
    part: 'inverter_pad',
  });
  inverter.position.set(0, 0, rows * (spacingZ / 2) + 4.0);
  group.add(inverter);

  return group;
}
