/**
 * City Layout Validator
 * Verifies polygon geometry, edge topology, and node coverage.
 */

const EXPECTED_NODE_IDS = new Set([
  'solar',
  'wind',
  'utility',
  'hub',
  'residential',
  'commercial',
  'industrial',
  'ev',
  'water',
  'hvac',
  'hospital',
]);

/**
 * Checks if line segments AB and CD intersect.
 */
function segmentsIntersect(a, b, c, d) {
  function ccw(p1, p2, p3) {
    return (p3[1] - p1[1]) * (p2[0] - p1[0]) > (p2[1] - p1[1]) * (p3[0] - p1[0]);
  }
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

/**
 * Checks if a polygon is self-intersecting.
 */
function isPolygonSelfIntersecting(points) {
  const n = points.length;
  if (n < 3) return true;
  for (let i = 0; i < n; i++) {
    const a1 = points[i];
    const a2 = points[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if ((j + 1) % n === i) continue; // adjacent edge
      const b1 = points[j];
      const b2 = points[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Computes Axis-Aligned Bounding Box for polygon.
 */
function getAABB(points) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

/**
 * Checks if two AABBs overlap with strict margin.
 */
function aabbOverlap(b1, b2, margin = 2.0) {
  return !(
    b1.maxX + margin < b2.minX ||
    b1.minX - margin > b2.maxX ||
    b1.maxZ + margin < b2.minZ ||
    b1.minZ - margin > b2.maxZ
  );
}

/**
 * Validates the city layout.
 */
export function validateCityLayout(layout) {
  const errors = [];

  if (!layout || !layout.nodes) {
    return { ok: false, errors: ['Layout has no nodes'] };
  }

  // 1. Check node IDs
  const nodeIds = new Set(layout.nodes.map((n) => n.id));
  for (const id of EXPECTED_NODE_IDS) {
    if (!nodeIds.has(id)) {
      errors.push(`Missing expected node: ${id}`);
    }
  }
  for (const id of nodeIds) {
    if (!EXPECTED_NODE_IDS.has(id)) {
      errors.push(`Unexpected node id: ${id}`);
    }
  }

  // 2. Validate polygon footprints & non-self-intersection
  const aabbs = new Map();
  for (const node of layout.nodes) {
    if (!node.footprint || node.footprint.length < 3) {
      errors.push(`Node ${node.id} has invalid footprint polygon`);
      continue;
    }
    if (isPolygonSelfIntersecting(node.footprint)) {
      errors.push(`Node ${node.id} footprint is self-intersecting`);
    }
    aabbs.set(node.id, getAABB(node.footprint));
  }

  // 3. Check for overlapping sites
  const nodeList = layout.nodes;
  for (let i = 0; i < nodeList.length; i++) {
    for (let j = i + 1; j < nodeList.length; j++) {
      const b1 = aabbs.get(nodeList[i].id);
      const b2 = aabbs.get(nodeList[j].id);
      if (b1 && b2 && aabbOverlap(b1, b2)) {
        errors.push(`Site overlap detected between ${nodeList[i].id} and ${nodeList[j].id}`);
      }
    }
  }

  // 4. Validate edges
  if (!layout.edges || layout.edges.length === 0) {
    errors.push('Layout has no edges');
  } else {
    for (const edge of layout.edges) {
      if (!nodeIds.has(edge.from)) {
        errors.push(`Edge ${edge.id} has invalid "from": ${edge.from}`);
      }
      if (!nodeIds.has(edge.to)) {
        errors.push(`Edge ${edge.id} has invalid "to": ${edge.to}`);
      }
    }

    // 5. Check every site reaches the hub
    const hubConnected = new Set();
    hubConnected.add('hub');
    for (const edge of layout.edges) {
      if (edge.from === 'hub') hubConnected.add(edge.to);
      if (edge.to === 'hub') hubConnected.add(edge.from);
    }

    for (const id of EXPECTED_NODE_IDS) {
      if (!hubConnected.has(id)) {
        errors.push(`Site ${id} does not have a direct connection to the hub`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
