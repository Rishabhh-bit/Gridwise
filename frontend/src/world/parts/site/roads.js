import * as THREE from 'three';
import { TOKENS } from '../../tokens.js';
import cityLayout from '../../layout/city.json';

/**
 * Creates the schematic road network matching the SVG diagram rhombus and spurs.
 */
export function createRoadNetwork() {
  const group = new THREE.Group();
  group.userData = { part: 'road_network', level: 'city', nodeId: 'general', class: 'structure' };

  const loop = cityLayout.roadLoop;
  const loopPts = loop.map(([x, z]) => new THREE.Vector3(x, 0.05, z));
  loopPts.push(loopPts[0]); // close loop

  // Road edge lines
  const loopGeom = new THREE.BufferGeometry().setFromPoints(loopPts);
  const roadMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(TOKENS.paperGradEnd),
    linewidth: 2,
    transparent: true,
    opacity: 0.7,
  });

  const roadLine = new THREE.Line(loopGeom, roadMat);
  roadLine.userData = { part: 'road_loop', level: 'city', nodeId: 'general', class: 'structure' };
  group.add(roadLine);

  // Dashed centerlines
  const centerMat = new THREE.LineDashedMaterial({
    color: new THREE.Color(TOKENS.line),
    dashSize: 6,
    gapSize: 4,
    linewidth: 1,
    transparent: true,
    opacity: 0.45,
  });
  const centerLine = new THREE.Line(loopGeom, centerMat);
  centerLine.computeLineDistances();
  centerLine.position.y = 0.08;
  centerLine.userData = { part: 'road_centerline', level: 'city', nodeId: 'general', class: 'structure' };
  group.add(centerLine);

  // Road spurs
  for (let s = 0; s < cityLayout.roadSpurs.length; s++) {
    const spur = cityLayout.roadSpurs[s];
    const spurPts = spur.map(([x, z]) => new THREE.Vector3(x, 0.05, z));
    const spurGeom = new THREE.BufferGeometry().setFromPoints(spurPts);
    const spurLine = new THREE.Line(spurGeom, roadMat);
    spurLine.userData = { part: `road_spur_${s + 1}`, level: 'city', nodeId: 'general', class: 'structure' };
    group.add(spurLine);
  }

  return group;
}
