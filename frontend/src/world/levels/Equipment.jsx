import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createWindTurbine } from '../parts/energy/turbine.js';
import { createPVTable } from '../parts/energy/pvTable.js';
import { createTransformerBay } from '../parts/energy/transformerBay.js';
import { createEVChargingBays } from '../parts/site/parkingBays.js';
import { createPumpSet } from '../parts/energy/pump.js';
import { createChillerPlant } from '../parts/energy/chiller.js';
import { createPodiumTower } from '../parts/architecture/podiumTower.js';
import { TOKENS } from '../tokens.js';
import cityLayout from '../layout/city.json';

export function EquipmentScene({
  selected,
  run,
  row,
  playing,
  onCloseEquipment,
}) {
  const activeNode = cityLayout.nodes.find((n) => n.id === selected) || cityLayout.nodes[0];
  const windSpeed = row?.wind_ms || 0;
  const isCutIn = windSpeed >= 3.0 && windSpeed <= 25.0;
  const rotorRef = useRef();

  useFrame((state, delta) => {
    if (rotorRef.current && playing && isCutIn) {
      // Symbolic blade angular speed from wind_mw / capacity
      const cap = run?.config?.wind_capacity || 5.0;
      const speed = Math.max(0.4, ((row?.wind_mw || 0) / cap) * 3.5);
      rotorRef.current.rotation.z += speed * delta;
    }
  });

  const equipmentObject = useMemo(() => {
    const group = new THREE.Group();
    group.userData = { part: 'exploded_equipment', level: 'equipment', nodeId: selected, class: 'equipment' };

    if (selected === 'wind') {
      const turbine = createWindTurbine({
        nodeId: 'wind',
        level: 'equipment',
        part: 'wind_turbine_exploded',
        hubHeight: 25, // scaled down height for intimate equipment inspection
        rotorRadius: 18,
      });
      rotorRef.current = turbine.userData.rotorRef;
      group.add(turbine);
    } else if (selected === 'solar') {
      const table = createPVTable(8, {
        nodeId: 'solar',
        level: 'equipment',
        part: 'pv_table_exploded',
        tiltDeg: 22,
      });
      group.add(table);
    } else if (selected === 'hub' || selected === 'utility') {
      const tx = createTransformerBay({
        nodeId: selected,
        level: 'equipment',
        part: 'substation_transformer_exploded',
        tankW: 5.5,
        tankH: 4.8,
        tankD: 7.0,
      });
      group.add(tx);
    } else if (selected === 'ev') {
      const bays = createEVChargingBays({
        nodeId: 'ev',
        level: 'equipment',
        part: 'ev_exploded_bay',
        baysCount: 2,
      });
      group.add(bays);
    } else if (selected === 'water') {
      const pump = createPumpSet({
        nodeId: 'water',
        level: 'equipment',
        part: 'water_pump_exploded',
      });
      group.add(pump);
    } else if (selected === 'hvac') {
      const chiller = createChillerPlant({
        nodeId: 'hvac',
        level: 'equipment',
        part: 'chiller_plant_exploded',
        width: 18,
        depth: 12,
        height: 6,
      });
      group.add(chiller);
    } else {
      // Default illustrative structure
      const placeholder = createTransformerBay({
        nodeId: selected,
        level: 'equipment',
        part: 'equipment_asset',
      });
      group.add(placeholder);
    }

    return group;
  }, [selected]);

  return (
    <group
      position={[activeNode.position[0], 0, activeNode.position[2]]}
      userData={{ part: 'equipment_scene', level: 'equipment', nodeId: selected, class: 'equipment' }}
    >
      <primitive object={equipmentObject} />
    </group>
  );
}
