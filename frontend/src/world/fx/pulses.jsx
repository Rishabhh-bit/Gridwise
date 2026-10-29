import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TOKENS } from '../tokens.js';

export function SitePulse({ position = [0, 0, 0], active = false, color = TOKENS.line }) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current && active) {
      meshRef.current.scale.x += delta * 1.5;
      meshRef.current.scale.y += delta * 1.5;
      if (meshRef.current.scale.x > 3.0) {
        meshRef.current.scale.set(1.0, 1.0, 1.0);
      }
    }
  });

  if (!active) return null;

  const ringGeom = new THREE.RingGeometry(18, 19, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  return (
    <mesh
      ref={meshRef}
      position={[position[0], 0.2, position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={ringGeom}
      material={ringMat}
      userData={{ part: 'site_pulse', level: 'site', nodeId: 'general', class: 'prop' }}
    />
  );
}
