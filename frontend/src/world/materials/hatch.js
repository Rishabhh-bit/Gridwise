import * as THREE from 'three';
import { TOKENS } from '../tokens.js';

export function createHatchMaterial(options = {}) {
  const {
    color = TOKENS.line,
    bgColor = TOKENS.fill,
    spacing = 8.0,
    lineWidth = 1.2,
    opacity = 0.35,
  } = options;

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uBgColor: { value: new THREE.Color(bgColor) },
      uSpacing: { value: spacing },
      uLineWidth: { value: lineWidth },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uBgColor;
      uniform float uSpacing;
      uniform float uLineWidth;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        vec2 coord = gl_FragCoord.xy;
        float diag = coord.x + coord.y;
        float pattern = abs(fract(diag / uSpacing - 0.5) - 0.5) / (fwidth(diag / uSpacing) * uLineWidth);
        float line = 1.0 - min(pattern, 1.0);
        vec3 col = mix(uBgColor, uColor, line);
        gl_FragColor = vec4(col, uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}
