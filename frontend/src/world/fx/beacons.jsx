import React, { useMemo } from 'react';
import * as THREE from 'three';
import { TOKENS } from '../tokens.js';
import { alertNode } from '../selectors.js';
import { createPrimitiveBox } from '../parts/primitives/box.js';
import { createPrimitiveCylinder } from '../parts/primitives/cylinder.js';
import cityLayout from '../layout/city.json';

const NODE_POS = {};
for (const n of cityLayout.nodes) {
  NODE_POS[n.id] = n.position;
}

/**
 * Anomaly beacon appearing above the affected site when active.
 * Triangle for medium severity, square/diamond for high severity.
 */
export function AnomalyBeacons({ alerts = [], currentIndex = 0 }) {
  const activeAlerts = useMemo(() => {
    return alerts.filter(
      (a) => currentIndex >= a.start_index && currentIndex <= a.end_index
    );
  }, [alerts, currentIndex]);

  if (activeAlerts.length === 0) return null;

  return (
    <group userData={{ part: 'anomaly_beacons', level: 'city', nodeId: 'general', class: 'prop' }}>
      {activeAlerts.map((alert) => {
        const nodeId = alertNode(alert);
        const pos = NODE_POS[nodeId] || [0, 0, 0];
        const isHigh = alert.severity === 'high';

        const markerObj = isHigh
          ? createPrimitiveBox(3.2, 3.2, 0.4, {
              color: TOKENS.alert,
              lineColor: TOKENS.alert,
              opacity: 0.9,
              part: 'alert_box_marker',
              level: 'city',
              nodeId,
              cls: 'prop',
            })
          : createPrimitiveCylinder(2.0, 2.0, 0.4, 3, {
              color: TOKENS.alert,
              lineColor: TOKENS.alert,
              opacity: 0.9,
              part: 'alert_tri_marker',
              level: 'city',
              nodeId,
              cls: 'prop',
            });

        const lineGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, -26, 0),
        ]);
        const lineMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(TOKENS.alert),
          transparent: true,
          opacity: 0.6,
        });
        const leaderLine = new THREE.Line(lineGeom, lineMat);
        leaderLine.userData = { part: 'alert_leader', level: 'city', nodeId, class: 'prop' };

        return (
          <group
            key={alert.id}
            position={[pos[0], 28.0, pos[2]]}
            userData={{ part: 'alert_beacon', level: 'city', nodeId, class: 'prop' }}
          >
            <primitive object={markerObj} />
            <primitive object={leaderLine} />
          </group>
        );
      })}
    </group>
  );
}
