import { describe, it, expect } from 'vitest';
import { buildSolarSite } from '../sites/solar.js';
import { buildWindSite } from '../sites/wind.js';
import { buildUtilitySite } from '../sites/utility.js';
import { buildHubSite } from '../sites/hub.js';
import { buildResidentialSite } from '../sites/residential.js';
import { buildCommercialSite } from '../sites/commercial.js';
import { buildIndustrialSite } from '../sites/industrial.js';
import { buildEVSite } from '../sites/ev.js';
import { buildWaterSite } from '../sites/water.js';
import { buildHVACSite } from '../sites/hvac.js';
import { buildHospitalSite } from '../sites/hospital.js';

describe('Site Builders and Part Counts', () => {
  it('EV site has exactly 8 charging bays', () => {
    const evSite = buildEVSite();
    let bayCount = 0;
    evSite.traverse((obj) => {
      if (obj.userData?.part === 'ev_bay') bayCount++;
    });
    expect(bayCount).toBe(8);
  });

  it('Wind site has ceil(capacity / 2.5) turbines', () => {
    const wind5 = buildWindSite({ wind_capacity: 5.0 });
    let count5 = 0;
    wind5.traverse((obj) => {
      if (obj.userData?.part === 'wind_turbine') count5++;
    });
    expect(count5).toBe(2);

    const wind10 = buildWindSite({ wind_capacity: 10.0 });
    let count10 = 0;
    wind10.traverse((obj) => {
      if (obj.userData?.part === 'wind_turbine') count10++;
    });
    expect(count10).toBe(4);
  });

  it('Solar site has round(capacity / 0.75) PV tables', () => {
    const solar9 = buildSolarSite({ solar_capacity: 9.0 });
    let count9 = 0;
    solar9.traverse((obj) => {
      if (obj.userData?.part === 'pv_table') count9++;
    });
    expect(count9).toBe(12);
  });

  it('All site meshes have valid userData tagging', () => {
    const builders = [
      buildSolarSite,
      buildWindSite,
      buildUtilitySite,
      buildHubSite,
      buildResidentialSite,
      buildCommercialSite,
      buildIndustrialSite,
      buildEVSite,
      buildWaterSite,
      buildHVACSite,
      buildHospitalSite,
    ];

    for (const builder of builders) {
      const site = builder({ solar_capacity: 9, wind_capacity: 5 });
      site.traverse((child) => {
        if (child.isMesh || child.isLine) {
          expect(child.userData).toBeDefined();
          expect(child.userData.part).toBeDefined();
          expect(child.userData.level).toBeDefined();
          expect(child.userData.nodeId).toBeDefined();
          expect(['structure', 'equipment', 'cable', 'prop']).toContain(child.userData.class);
        }
      });
    }
  });
});
