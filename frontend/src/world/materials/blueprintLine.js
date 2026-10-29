import * as THREE from 'three';
import { TOKENS } from '../tokens.js';

/**
 * Creates blueprint line material with draw-on reveal uniform.
 */
export function createBlueprintLineMaterial(options = {}) {
  const {
    color = TOKENS.line,
    opacity = 0.9,
    transparent = true,
    dashed = false,
    dashSize = 3,
    gapSize = 1.5,
    lineWidth = 1.5,
  } = options;

  if (dashed) {
    return new THREE.LineDashedMaterial({
      color: new THREE.Color(color),
      linewidth: lineWidth,
      scale: 1,
      dashSize,
      gapSize,
      transparent,
      opacity,
      depthWrite: false,
    });
  }

  return new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    linewidth: lineWidth,
    transparent,
    opacity,
    depthWrite: false,
  });
}
