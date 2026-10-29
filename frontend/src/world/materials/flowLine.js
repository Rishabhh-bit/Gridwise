import * as THREE from 'three';
import { TOKENS } from '../tokens.js';

export function createFlowLineMaterial(options = {}) {
  const { color = TOKENS.line, dashLength = 8.0, gapLength = 6.0 } = options;

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOffset: { value: 0.0 },
      uDashLength: { value: dashLength },
      uGapLength: { value: gapLength },
      uOpacity: { value: 0.95 },
    },
    vertexShader: `
      attribute float lineDistance;
      varying float vLineDistance;
      void main() {
        vLineDistance = lineDistance;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOffset;
      uniform float uDashLength;
      uniform float uGapLength;
      uniform float uOpacity;
      varying float vLineDistance;

      void main() {
        float total = uDashLength + uGapLength;
        float dist = mod(vLineDistance + uOffset, total);
        if (dist > uDashLength) {
          discard;
        }
        gl_FragColor = vec4(uColor, uOpacity);
      }
    `,
    transparent: true,
  });
}
