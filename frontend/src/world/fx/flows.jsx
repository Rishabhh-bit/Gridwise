import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCatenaryGeometry } from '../parts/grid/catenary.js';
import { createFlowLineMaterial } from '../materials/flowLine.js';
import { TOKENS } from '../tokens.js';
import cityLayout from '../layout/city.json';

const NODE_POS_MAP = {};
for (const n of cityLayout.nodes) {
  NODE_POS_MAP[n.id] = new THREE.Vector3(n.position[0], 6.0, n.position[2]);
}

/**
 * Individual power flow line between two nodes.
 */
function SingleFlowLine({ edge, mw, color, playing, speed = 1 }) {
  const lineRef = useRef();
  const matRef = useRef();

  const geom = useMemo(() => {
    const pFrom = NODE_POS_MAP[edge.from] || new THREE.Vector3(0, 6, 0);
    const pTo = NODE_POS_MAP[edge.to] || new THREE.Vector3(0, 6, 0);
    return createCatenaryGeometry(pFrom, pTo, 3.5, 24);
  }, [edge.from, edge.to]);

  const mat = useMemo(() => {
    return createFlowLineMaterial({ color, dashLength: 8.0, gapLength: 6.0 });
  }, [color]);

  useFrame((state, delta) => {
    if (matRef.current && playing && mw > 0.005) {
      // Dash animation speed formula from Section 6.4: period = max(0.4, 2.5 / (mw + 0.6))
      const period = Math.max(0.4, 2.5 / (mw + 0.6));
      const velocity = (14.0 / period) * speed; // 14 units (dash+gap) per period
      matRef.current.uniforms.uOffset.value += velocity * delta;
    }
  });

  if (mw <= 0.005) return null;

  return (
    <primitive
      object={new THREE.Line(geom, mat)}
      ref={lineRef}
      onUpdate={(self) => {
        matRef.current = mat;
        self.userData = { part: `flow_${edge.id}`, level: 'city', nodeId: edge.to, class: 'cable' };
      }}
    />
  );
}

/**
 * Static baseline catenary cables for all edges.
 */
function StaticCables() {
  const lines = useMemo(() => {
    const group = new THREE.Group();
    group.userData = { part: 'grid_cables', level: 'city', nodeId: 'hub', class: 'cable' };

    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(TOKENS.paperGradEnd),
      linewidth: 1.5,
      transparent: true,
      opacity: 0.6,
    });

    for (const edge of cityLayout.edges) {
      const pFrom = NODE_POS_MAP[edge.from] || new THREE.Vector3(0, 6, 0);
      const pTo = NODE_POS_MAP[edge.to] || new THREE.Vector3(0, 6, 0);
      const geom = createCatenaryGeometry(pFrom, pTo, 3.5, 24);
      const line = new THREE.Line(geom, mat);
      line.userData = { part: `cable_${edge.id}`, level: 'city', nodeId: edge.to, class: 'cable' };
      group.add(line);
    }
    return group;
  }, []);

  return <primitive object={lines} />;
}

export function FlowNetwork({ flows, unmet, playing, speed = 1 }) {
  const edges = cityLayout.edges;

  return (
    <group userData={{ part: 'flow_network', level: 'city', nodeId: 'hub', class: 'cable' }}>
      <StaticCables />
      {edges.map((edge) => {
        let mw = 0;
        let color = TOKENS.line;

        if (edge.from === 'solar') {
          mw = flows.solar || 0;
          color = TOKENS.renewable;
        } else if (edge.from === 'wind') {
          mw = flows.wind || 0;
          color = TOKENS.renewable;
        } else if (edge.from === 'utility') {
          mw = flows.utility || 0;
          color = TOKENS.original;
        } else if (edge.from === 'hub') {
          const loadId = edge.to;
          mw = flows.load?.[loadId] || 0;
          color = unmet > 0.001 && loadId !== 'hospital' ? TOKENS.shortage : TOKENS.line;
        }

        return (
          <SingleFlowLine
            key={edge.id}
            edge={edge}
            mw={mw}
            color={color}
            playing={playing}
            speed={speed}
          />
        );
      })}
    </group>
  );
}
