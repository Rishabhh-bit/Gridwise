import * as THREE from 'three';
import { TOKENS } from '../../tokens.js';

export function createPrimitiveCylinder(radiusTop, radiusBottom, height, radialSegments = 16, options = {}) {
  const {
    color = TOKENS.fill,
    opacity = 0.25,
    lineColor = TOKENS.line,
    part = 'cylinder_part',
    level = 'site',
    nodeId = 'general',
    cls = 'equipment',
  } = options;

  const geom = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.userData = { part, level, nodeId, class: cls };

  const edgesGeom = new THREE.EdgesGeometry(geom, 24);
  const edgesMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(lineColor),
    transparent: true,
    opacity: 0.85,
  });
  const edges = new THREE.LineSegments(edgesGeom, edgesMat);
  edges.userData = { part: `${part}_edges`, level, nodeId, class: cls };
  mesh.add(edges);

  return mesh;
}
