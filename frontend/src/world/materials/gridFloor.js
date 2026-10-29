import * as THREE from 'three';
import { TOKENS } from '../tokens.js';

export function createGridFloorMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColorMinor: { value: new THREE.Color(TOKENS.ink) },
      uColorMajor: { value: new THREE.Color(TOKENS.ink) },
      uBgColor1: { value: new THREE.Color(TOKENS.paper) },
      uBgColor2: { value: new THREE.Color(TOKENS.paperGradEnd) },
      uMinorSpacing: { value: 25.0 },
      uMajorSpacing: { value: 100.0 },
      uMinorOpacity: { value: 0.05 },
      uMajorOpacity: { value: 0.12 },
      uFadeRadius: { value: 450.0 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColorMinor;
      uniform vec3 uColorMajor;
      uniform vec3 uBgColor1;
      uniform vec3 uBgColor2;
      uniform float uMinorSpacing;
      uniform float uMajorSpacing;
      uniform float uMinorOpacity;
      uniform float uMajorOpacity;
      uniform float uFadeRadius;

      varying vec3 vWorldPosition;
      varying vec2 vUv;

      float grid(vec2 coord, float spacing, float width) {
        vec2 grid = abs(fract(coord / spacing - 0.5) - 0.5) / (fwidth(coord / spacing) * width);
        float line = min(grid.x, grid.y);
        return 1.0 - min(line, 1.0);
      }

      void main() {
        vec2 pos = vWorldPosition.xz;
        float d = length(pos);
        float fade = clamp(1.0 - d / uFadeRadius, 0.0, 1.0);

        // Radial paper background gradient
        vec3 bg = mix(uBgColor1, uBgColor2, clamp(d / uFadeRadius, 0.0, 1.0));

        float minor = grid(pos, uMinorSpacing, 1.0) * uMinorOpacity;
        float major = grid(pos, uMajorSpacing, 1.5) * uMajorOpacity;

        vec3 color = bg;
        color = mix(color, uColorMinor, minor * fade);
        color = mix(color, uColorMajor, major * fade);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
    depthWrite: false,
  });
}
