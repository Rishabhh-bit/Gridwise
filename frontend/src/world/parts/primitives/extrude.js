import * as THREE from 'three';
import { TOKENS } from '../../tokens.js';

/**
 * Creates an extruded shape with optional cutouts (holes) and blueprint linework.
 */
export function createExtrudedPolygon(points, depth, holes = [], options = {}) {
  const {
    color = TOKENS.fill,
    opacity = 0.22,
    lineColor = TOKENS.line,
    bevelEnabled = false,
    part = 'extrusion',
    level = 'site',
    nodeId = 'general',
    cls = 'structure',
  } = options;

  const shape = new THREE.Shape();
  if (points.length < 3) {
    return new THREE.Group();
  }

  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  // Add door/window holes
  for (const holePoints of holes) {
    if (holePoints.length >= 3) {
      const holePath = new THREE.Path();
      holePath.moveTo(holePoints[0][0], holePoints[0][1]);
      for (let j = 1; j < holePoints.length; j++) {
        holePath.lineTo(holePoints[j][0], holePoints[j][1]);
      }
      holePath.closePath();
      shape.holes.push(holePath);
    }
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled,
  });

  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.userData = { part, level, nodeId, class: cls };

  const edgesGeom = new THREE.EdgesGeometry(geom, 25);
  const edgesMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(lineColor),
    transparent: true,
    opacity: 0.88,
  });
  const edges = new THREE.LineSegments(edgesGeom, edgesMat);
  edges.userData = { part: `${part}_edges`, level, nodeId, class: cls };
  mesh.add(edges);

  return mesh;
}
