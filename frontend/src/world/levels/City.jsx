import React, { useMemo } from 'react';
import * as THREE from 'three';
import cityLayout from '../layout/city.json';
import { createRoadNetwork } from '../parts/site/roads.js';
import { FlowNetwork } from '../fx/flows.jsx';
import { AnomalyBeacons } from '../fx/beacons.jsx';
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

export function CityScene({
  run,
  row,
  flows,
  unmet,
  playing,
  speed,
  selected,
  onSelectSite,
  depth,
}) {
  const config = run?.config || {};
  const isPaused = !playing;

  const sites = useMemo(() => {
    return cityLayout.nodes.map((node) => {
      const builder = SITE_BUILDERS[node.id];
      const siteGroup = builder ? builder(config) : new THREE.Group();
      siteGroup.position.set(node.position[0], 0, node.position[2]);
      if (node.orientation) {
        siteGroup.rotation.y = (node.orientation * Math.PI) / 180;
      }
      return { id: node.id, name: node.name, object: siteGroup, pos: node.position };
    });
  }, [config]);

  // Sun glow brightness based on irradiance / 1000
  const irradiance = row?.irradiance_wm2 || 0;
  const sunIntensity = Math.min(1.0, Math.max(0.05, irradiance / 1000));

  return (
    <group userData={{ part: 'city_scene', level: 'city', nodeId: 'all', class: 'structure' }}>
      {/* Schematic Road Loop and Spurs */}
      <primitive object={useMemo(() => createRoadNetwork(), [])} />

      {/* Sun ambient directional tint */}
      <ambientLight intensity={0.4 + sunIntensity * 0.4} />
      <directionalLight
        position={[200, 400, 200]}
        intensity={0.6 + sunIntensity * 0.6}
        color={TOKENS.paper}
      />

      {/* 11 Sites */}
      {sites.map((s) => {
        const isSelected = selected === s.id;
        return (
          <group
            key={s.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSite(s.id);
            }}
          >
            <primitive object={s.object} />
            {/* Selection highlight ring */}
            {isSelected && (
              <mesh
                position={[s.pos[0], 0.15, s.pos[2]]}
                rotation={[-Math.PI / 2, 0, 0]}
                userData={{ part: 'selection_ring', level: 'city', nodeId: s.id, class: 'prop' }}
              >
                <ringGeometry args={[26, 28, 32]} />
                <meshBasicMaterial
                  color={new THREE.Color(TOKENS.ink)}
                  transparent
                  opacity={0.85}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Power Flow Network */}
      <FlowNetwork
        flows={flows}
        unmet={unmet}
        playing={!isPaused}
        speed={speed}
      />

      {/* Anomaly Beacons */}
      <AnomalyBeacons alerts={run?.alerts || []} currentIndex={row?.index || 0} />
    </group>
  );
}
