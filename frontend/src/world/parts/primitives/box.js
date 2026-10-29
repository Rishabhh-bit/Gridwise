import * as THREE from 'three';
import { TOKENS } from '../../tokens.js';

/**
 * Creates a primitive solid box with edges for sub-parts.
 * ONLY place in the project where BoxGeometry is instantiated.
 */
export function createPrimitiveBox(w, h, d, options = {}) {
  const {
    color = TOKENS.fill,
    opacity = 0.25,
    lineColor = TOKENS.line,
    part = 'box_part',
    level = 'site',
    nodeId = 'general',
    cls = 'structure',
  } = options;

  const geom = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.userData = { part, level, nodeId, class: cls };

  const edgesGeom = new THREE.EdgesGeometry(geom);
  const edgesMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(lineColor),
    linewidth: 1,
    transparent: true,
    opacity: 0.85,
  });
  const edges = new THREE.LineSegments(edgesGeom, edgesMat);
  edges.userData = { part: `${part}_edges`, level, nodeId, class: cls };
  mesh.add(edges);

  return mesh;
}

/**
 * Creates an edges-only wireframe box.
 */
export function createLineBox(w, h, d, options = {}) {
  const {
    lineColor = TOKENS.line,
    part = 'wire_box',
    level = 'site',
    nodeId = 'general',
    cls = 'structure',
  } = options;

  const geom = new THREE.BoxGeometry(w, h, d);
  const edgesGeom = new THREE.EdgesGeometry(geom);
  geom.dispose();

  const edgesMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(lineColor),
    linewidth: 1,
    transparent: true,
    opacity: 0.9,
  });

  const edges = new THREE.LineSegments(edgesGeom, edgesMat);
  edges.userData = { part, level, nodeId, class: cls };
  return edges;
}
