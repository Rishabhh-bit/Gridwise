import * as THREE from 'three';

/**
 * Critically damped spring / exponential smoothing helper.
 */
export function damp(current, target, lambda, dt) {
  return target + (current - target) * Math.exp(-lambda * dt);
}

/**
 * Maps continuous depth [0, 2] to camera distance exponentially.
 * Depth 2 (City): 900m (range 650-1300m)
 * Depth 1 (Site): 130m (range 70-220m)
 * Depth 0 (Equipment): 20m (range 8-40m)
 */
export function getCameraDistanceForDepth(depth) {
  const d = Math.max(0, Math.min(2, depth));
  if (d >= 1.0) {
    // Between Site (1) and City (2)
    const t = d - 1.0;
    return 130.0 * Math.pow(900.0 / 130.0, t);
  } else {
    // Between Equipment (0) and Site (1)
    const t = d;
    return 20.0 * Math.pow(130.0 / 20.0, t);
  }
}

/**
 * Gets FOV for given depth. Eases from 22° at City/Site to 35° at Equipment.
 */
export function getFovForDepth(depth) {
  const d = Math.max(0, Math.min(2, depth));
  if (d >= 1.0) {
    return 22.0;
  }
  // d in [0, 1]
  return 35.0 - d * (35.0 - 22.0);
}

/**
 * Gets elevation angle in radians for depth.
 * Eases from 35° (0.61 rad) at City/Site to 25° (0.436 rad) at Equipment.
 */
export function getElevationForDepth(depth) {
  const d = Math.max(0, Math.min(2, depth));
  const deg = d >= 1.0 ? 35.0 : 25.0 + d * 10.0;
  return (deg * Math.PI) / 180;
}

/**
 * Computes camera position looking at target center given distance and depth.
 */
export function computeCameraPosition(target, distance, depth) {
  const elev = getElevationForDepth(depth);
  const azimuth = Math.PI / 4; // 45 degrees isometric angle

  const horizontalDist = distance * Math.cos(elev);
  const y = target.y + distance * Math.sin(elev);
  const x = target.x + horizontalDist * Math.sin(azimuth);
  const z = target.z + horizontalDist * Math.cos(azimuth);

  return new THREE.Vector3(x, y, z);
}
