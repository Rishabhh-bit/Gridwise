import React, { useMemo } from 'react';
import * as THREE from 'three';
import { TOKENS } from '../tokens.js';

/**
 * Curved 3D ribbons visualizing load shifting transfers.
 * Connects the 'from' slot to the 'to' slot with arch height proportional to shift distance.
 */
export function ShiftRibbons({ transfers = [], sitePosition = [0, 0, 0], slotWidth = 0.8 }) {
  const ribbonsGroup = useMemo(() => {
    const group = new THREE.Group();
    group.userData = { part: 'shift_ribbons', level: 'site', nodeId: 'general', class: 'cable' };

    if (!transfers || transfers.length === 0) return group;

    const [sx, sy, sz] = sitePosition;
    const ribbonMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(TOKENS.optimized),
      transparent: true,
      opacity: 0.75,
      linewidth: 1.5,
    });

    for (let i = 0; i < transfers.length; i++) {
      const t = transfers[i];
      const slotDiff = t.to_index - t.from_index;
      if (slotDiff === 0) continue;

      const xFrom = (t.from_index - 48) * slotWidth;
      const xTo = (t.to_index - 48) * slotWidth;

      const p1 = new THREE.Vector3(sx + xFrom, sy + 0.5, sz + 25);
      const p2 = new THREE.Vector3(sx + xTo, sy + 0.5, sz + 25);

      const archHeight = Math.min(18, 3.0 + Math.abs(slotDiff) * 0.4);
      const midX = (p1.x + p2.x) / 2;
      const ctrl1 = new THREE.Vector3(p1.x + (midX - p1.x) * 0.5, sy + archHeight, sz + 25);
      const ctrl2 = new THREE.Vector3(p2.x + (midX - p2.x) * 0.5, sy + archHeight, sz + 25);

      const curve = new THREE.CubicBezierCurve3(p1, ctrl1, ctrl2, p2);
      const pts = curve.getPoints(24);
      const geom = new THREE.BufferGeometry().setFromPoints(pts);

      const line = new THREE.Line(geom, ribbonMat);
      line.userData = { part: `transfer_ribbon_${i + 1}`, level: 'site', nodeId: t.load, class: 'cable' };
      group.add(line);
    }

    return group;
  }, [transfers, sitePosition, slotWidth]);

  return <primitive object={ribbonsGroup} />;
}
