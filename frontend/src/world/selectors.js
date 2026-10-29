/**
 * Data Selectors and Derived Flows
 * Efficient extraction of simulation series into typed arrays and derived physics.
 */

export const LOAD_IDS = [
  'residential',
  'commercial',
  'industrial',
  'ev',
  'water',
  'hvac',
  'hospital',
];

export const SOURCE_IDS = ['solar', 'wind', 'utility'];
export const ALL_SITE_IDS = [...SOURCE_IDS, 'hub', ...LOAD_IDS];

const bufferCache = new WeakMap();
const bufferIdCache = new Map();

/**
 * Builds Float32Arrays for all time-series fields of a run.
 * Caches by run object or run.id.
 */
export function buildBuffers(run) {
  if (!run || !run.series || !run.series.length) {
    return null;
  }

  if (bufferCache.has(run)) {
    return bufferCache.get(run);
  }
  if (run.id && bufferIdCache.has(run.id)) {
    return bufferIdCache.get(run.id);
  }

  const n = run.series.length;
  const series = run.series;

  const buffers = {
    length: n,
    runId: run.id,
    config: run.config || {},
    shiftsMap: {},
    solar_mw: new Float32Array(n),
    wind_mw: new Float32Array(n),
    renewable_mw: new Float32Array(n),
    irradiance_wm2: new Float32Array(n),
    wind_ms: new Float32Array(n),
    temperature_c: new Float32Array(n),
    supply_capacity_mw: new Float32Array(n),
    tariff_inr_kwh: new Float32Array(n),
    demand_before: new Float32Array(n),
    demand_after: new Float32Array(n),
    renewable_used_before: new Float32Array(n),
    renewable_used_after: new Float32Array(n),
    grid_import_before: new Float32Array(n),
    grid_import_after: new Float32Array(n),
    unmet_before: new Float32Array(n),
    unmet_after: new Float32Array(n),
    surplus_before: new Float32Array(n),
    surplus_after: new Float32Array(n),
    anomaly_score: new Float32Array(n),
    injected_extra_mw: new Float32Array(n),
    loads_before: {},
    loads_after: {},
    delivered_before: {},
    delivered_after: {},
  };

  if (run.optimization?.shifts) {
    for (const s of run.optimization.shifts) {
      buffers.shiftsMap[s.id] = s;
    }
  }

  for (const id of LOAD_IDS) {
    buffers.loads_before[id] = new Float32Array(n);
    buffers.loads_after[id] = new Float32Array(n);
    buffers.delivered_before[id] = new Float32Array(n);
    buffers.delivered_after[id] = new Float32Array(n);
  }

  for (let i = 0; i < n; i++) {
    const r = series[i];
    buffers.solar_mw[i] = r.solar_mw || 0;
    buffers.wind_mw[i] = r.wind_mw || 0;
    buffers.renewable_mw[i] = r.renewable_mw || 0;
    buffers.irradiance_wm2[i] = r.irradiance_wm2 || 0;
    buffers.wind_ms[i] = r.wind_ms || 0;
    buffers.temperature_c[i] = r.temperature_c || 0;
    buffers.supply_capacity_mw[i] = r.supply_capacity_mw || 0;
    buffers.tariff_inr_kwh[i] = r.tariff_inr_kwh || 0;
    buffers.demand_before[i] = r.demand_before || 0;
    buffers.demand_after[i] = r.demand_after || 0;
    buffers.renewable_used_before[i] = r.renewable_used_before || 0;
    buffers.renewable_used_after[i] = r.renewable_used_after || 0;
    buffers.grid_import_before[i] = r.grid_import_before || 0;
    buffers.grid_import_after[i] = r.grid_import_after || 0;
    buffers.unmet_before[i] = r.unmet_before || 0;
    buffers.unmet_after[i] = r.unmet_after || 0;
    buffers.surplus_before[i] = r.surplus_before || 0;
    buffers.surplus_after[i] = r.surplus_after || 0;
    buffers.anomaly_score[i] = r.anomaly_score ?? 0;
    buffers.injected_extra_mw[i] = r.injected_extra_mw || 0;

    for (const id of LOAD_IDS) {
      buffers.loads_before[id][i] = r.loads_before?.[id] || 0;
      buffers.loads_after[id][i] = r.loads_after?.[id] || 0;
      buffers.delivered_before[id][i] = r.delivered_before?.[id] || 0;
      buffers.delivered_after[id][i] = r.delivered_after?.[id] || 0;
    }
  }

  bufferCache.set(run, buffers);
  if (run.id) {
    bufferIdCache.set(run.id, buffers);
  }
  return buffers;
}

/**
 * Linearly interpolates a buffer array at continuous time t.
 */
function lerp(arr, t, n) {
  if (t <= 0) return arr[0];
  if (t >= n - 1) return arr[n - 1];
  const i = Math.floor(t);
  const frac = t - i;
  return arr[i] * (1 - frac) + arr[i + 1] * frac;
}

/**
 * Calculates derived flows and physical states at slot / playhead t.
 * @param {Object} buffers Result from buildBuffers
 * @param {number} t Continuous playhead index
 * @param {'before' | 'after'} mode
 */
export function flowsAt(buffers, t, mode = 'after') {
  if (!buffers || buffers.length === 0) {
    return {
      solar: 0,
      wind: 0,
      utility: 0,
      load: {},
      curtailedSolar: 0,
      curtailedWind: 0,
      served: {},
      heat: {},
      gridUse: 0,
      balance: 0,
    };
  }

  const n = buffers.length;
  const clampedT = Math.max(0, Math.min(n - 1, t));

  const solar_mw = lerp(buffers.solar_mw, clampedT, n);
  const wind_mw = lerp(buffers.wind_mw, clampedT, n);
  const renewable_mw = lerp(buffers.renewable_mw, clampedT, n);

  const renewable_used = lerp(
    mode === 'after' ? buffers.renewable_used_after : buffers.renewable_used_before,
    clampedT,
    n
  );
  const grid_import = lerp(
    mode === 'after' ? buffers.grid_import_after : buffers.grid_import_before,
    clampedT,
    n
  );

  const usedFactor = renewable_mw > 0 ? renewable_used / renewable_mw : 0;
  const solarFlow = solar_mw * usedFactor;
  const windFlow = wind_mw * usedFactor;
  const utilityFlow = grid_import;

  const curtailedSolar = Math.max(0, solar_mw - solarFlow);
  const curtailedWind = Math.max(0, wind_mw - windFlow);

  const loadFlows = {};
  const served = {};
  const heat = {};
  let totalDelivered = 0;

  for (const id of LOAD_IDS) {
    const loadsArr = mode === 'after' ? buffers.loads_after[id] : buffers.loads_before[id];
    const delivArr = mode === 'after' ? buffers.delivered_after[id] : buffers.delivered_before[id];
    const loadVal = lerp(loadsArr, clampedT, n);
    const delivVal = lerp(delivArr, clampedT, n);

    loadFlows[id] = delivVal;
    totalDelivered += delivVal;
    served[id] = loadVal > 1e-6 ? delivVal / loadVal : 1.0;

    const cap = buffers.shiftsMap[id]?.capacity_mw || 0;
    heat[id] = cap > 1e-6 ? loadVal / cap : 0;
  }

  const gridCap = buffers.config.grid_capacity || 7.0;
  const gridUse = gridCap > 1e-6 ? grid_import / gridCap : 0;
  const totalSources = solarFlow + windFlow + utilityFlow;
  const balance = totalSources - totalDelivered;

  return {
    solar: solarFlow,
    wind: windFlow,
    utility: utilityFlow,
    load: loadFlows,
    curtailedSolar,
    curtailedWind,
    served,
    heat,
    gridUse,
    balance,
  };
}

/**
 * Returns which node an alert maps to.
 * Rule: industrial if injected, otherwise residential.
 */
export function alertNode(alert) {
  if (!alert) return 'residential';
  return alert.injected ? 'industrial' : 'residential';
}

/**
 * Returns reason why alert was assigned to this node.
 */
export function alertNodeReason(alert) {
  if (!alert) return '';
  if (alert.injected) {
    return 'Injected surge is added to the industrial feeder.';
  }
  return 'Alert detected by household model driving the residential profile.';
}

/**
 * Retrieves shift information and top transfers for a given load.
 */
export function shiftsFor(run, id) {
  if (!run) return null;
  const shiftRecord = run.optimization?.shifts?.find((s) => s.id === id) || null;
  const allTransfers = run.optimization?.transfers || [];

  const loadTransfers = allTransfers
    .filter((t) => t.load === id && t.from_index !== t.to_index)
    .sort((a, b) => (b.energy_mwh || 0) - (a.energy_mwh || 0))
    .slice(0, 12);

  const series = run.series || [];
  const before = series.map((r) => r.loads_before?.[id] || 0);
  const after = series.map((r) => r.loads_after?.[id] || 0);

  return {
    shift: shiftRecord,
    transfers: loadTransfers,
    before,
    after,
  };
}

/**
 * Finds the first contiguous shortage window in a run.
 */
export function findShortage(run, mode = 'before') {
  if (!run || !run.series) return null;
  const key = `unmet_${mode}`;
  const series = run.series;
  const n = series.length;

  let start = -1;
  let end = -1;
  let peakMw = 0;
  let unservedMwh = 0;

  for (let i = 0; i < n; i++) {
    const val = series[i][key] || 0;
    if (val > 1e-6) {
      if (start === -1) {
        start = i;
      }
      end = i;
      if (val > peakMw) peakMw = val;
      unservedMwh += val * 0.25; // 15-min slots: 0.25h
    } else if (start !== -1) {
      // First contiguous window completed
      break;
    }
  }

  if (start === -1) return null;

  return {
    start_index: start,
    end_index: end,
    start_time: series[start].timestamp,
    end_time: series[end].timestamp,
    peak_mw: peakMw,
    unserved_mwh: unservedMwh,
  };
}

/**
 * Playhead easing with snap for large scrub distance (> 8 slots).
 */
export function playheadEase(current, target, lambda = 8, dt = 1 / 60) {
  if (Math.abs(target - current) > 8) {
    return target;
  }
  return target + (current - target) * Math.exp(-lambda * dt);
}
