import React, { useMemo } from 'react';
import * as THREE from 'three';
import cityLayout from '../layout/city.json';
import { ShiftRibbons } from '../fx/shiftRibbons.jsx';
import { shiftsFor } from '../selectors.js';
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
import { TOKENS } from '../tokens.js';

const SITE_BUILDERS = {
  solar: buildSolarSite,
  wind: buildWindSite,
  utility: buildUtilitySite,
  hub: buildHubSite,
  residential: buildResidentialSite,
  commercial: buildCommercialSite,
  industrial: buildIndustrialSite,
  ev: buildEVSite,
  water: buildWaterSite,
  hvac: buildHVACSite,
  hospital: buildHospitalSite,
};

export function SiteScene({
  run,
  row,
  selected,
  depth,
  onOpenEquipment,
}) {
  const config = run?.config || {};
  const activeNode = cityLayout.nodes.find((n) => n.id === selected) || cityLayout.nodes[0];
  const shiftsData = useMemo(() => shiftsFor(run, selected), [run, selected]);

  // Build the focused site in full detail
  const focusedSite = useMemo(() => {
    const builder = SITE_BUILDERS[selected];
    const group = builder ? builder(config) : new THREE.Group();
    group.position.set(activeNode.position[0], 0, activeNode.position[2]);
    if (activeNode.orientation) {
      group.rotation.y = (activeNode.orientation * Math.PI) / 180;
    }
    return group;
  }, [selected, config, activeNode]);

  // Other sites rendered as ghost footprint outlines
  const ghostOutlines = useMemo(() => {
    const group = new THREE.Group();
    group.userData = { part: 'ghost_outlines', level: 'site', nodeId: 'other', class: 'structure' };

    const ghostMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(TOKENS.paperGradEnd),
      transparent: true,
      opacity: 0.35,
    });

    for (const node of cityLayout.nodes) {
      if (node.id === selected) continue;
      const pts = node.footprint.map(([x, z]) => new THREE.Vector3(x, 0.1, z));
      pts.push(pts[0]);
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geom, ghostMat);
      line.userData = { part: `ghost_${node.id}`, level: 'site', nodeId: node.id, class: 'structure' };
      group.add(line);
    }
    return group;
  }, [selected]);

  return (
    <group
      userData={{ part: 'site_level_scene', level: 'site', nodeId: selected, class: 'structure' }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onOpenEquipment) onOpenEquipment();
      }}
    >
      <primitive object={focusedSite} />
      <primitive object={ghostOutlines} />

      {/* Shift ribbons for transfers */}
      {shiftsData && shiftsData.transfers && (
        <ShiftRibbons
          transfers={shiftsData.transfers}
          sitePosition={activeNode.position}
        />
      )}
    </group>
  );
}
