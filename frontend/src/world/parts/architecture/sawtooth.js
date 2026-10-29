import * as THREE from 'three';
import { createExtrudedPolygon } from '../primitives/extrude.js';
import { TOKENS } from '../../tokens.js';

/**
 * Creates an industrial sawtooth roof with sloped sheds and north-facing clerestory glazing.
 */
export function createSawtoothRoof(width, depth, bays = 4, peakHeight = 3.5, options = {}) {
  const { nodeId = 'industrial', level = 'site', part = 'sawtooth_roof' } = options;

  const group = new THREE.Group();
  group.userData = { part, level, nodeId, class: 'structure' };

  const bayWidth = width / bays;
  const profilePoints = [[0, 0]];

  for (let b = 0; b < bays; b++) {
    const x0 = b * bayWidth;
    const xPeak = x0 + bayWidth * 0.75;
    const xNext = (b + 1) * bayWidth;
    profilePoints.push([xPeak, peakHeight]);
    profilePoints.push([xPeak, 0.4]);
    profilePoints.push([xNext, 0]);
  }
  profilePoints.push([width, -0.3]);
  profilePoints.push([0, -0.3]);

  const roofMesh = createExtrudedPolygon(profilePoints, depth, [], {
    part: 'sawtooth_profile',
    level,
    nodeId,
    cls: 'structure',
    color: TOKENS.fill,
    opacity: 0.25,
    lineColor: TOKENS.line,
  });

  group.add(roofMesh);
  return group;
}
