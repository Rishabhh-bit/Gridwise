/**
 * Integrity Invariant Verifier
 * Validates runs against physical conservation and scheduling laws in the browser.
 */

import { LOAD_IDS } from './selectors.js';

const TOLERANCE_POINT = 1e-6;
const TOLERANCE_SUM = 1e-5;

/**
 * Checks all 8 invariants on a loaded run.
 * @param {Object} run The complete run object
 * @returns {{ ok: boolean, status: 'ok' | 'warning' | 'error', label: string, failures: string[] }}
 */
export function checkInvariants(run) {
  if (!run || !run.series || !run.series.length) {
    return {
      ok: false,
      status: 'warning',
      label: 'No run data',
      failures: ['Run has no series data'],
    };
  }

  const series = run.series;
  const config = run.config || {};
  const shifts = run.optimization?.shifts || [];
  const transfers = run.optimization?.transfers || [];
  const failures = [];

  const shiftsMap = {};
  for (const s of shifts) {
    shiftsMap[s.id] = s;
  }

  const gridCapacity = (config.grid_capacity || 7.0) + TOLERANCE_POINT;

  // Day grouping for daily conservation check
  const days = {};

  for (let i = 0; i < series.length; i++) {
    const r = series[i];
    const dayKey = (r.timestamp || '').slice(0, 10);
    if (!days[dayKey]) {
      days[dayKey] = { before: {}, after: {} };
      for (const id of LOAD_IDS) {
        days[dayKey].before[id] = 0;
        days[dayKey].after[id] = 0;
      }
    }

    // Accumulate daily totals
    for (const id of LOAD_IDS) {
      days[dayKey].before[id] += r.loads_before?.[id] || 0;
      days[dayKey].after[id] += r.loads_after?.[id] || 0;
    }

    // Invariant 1: demand = renewable_used + grid_import + unmet (both before and after)
    for (const mode of ['before', 'after']) {
      const demand = r[`demand_${mode}`] || 0;
      const renUsed = r[`renewable_used_${mode}`] || 0;
      const gridImp = r[`grid_import_${mode}`] || 0;
      const unmet = r[`unmet_${mode}`] || 0;
      const sum = renUsed + gridImp + unmet;
      if (Math.abs(demand - sum) > TOLERANCE_POINT) {
        failures.push(
          `Inv 1 (demand balance ${mode}) failed at slot ${i}: demand=${demand.toFixed(4)}, sum=${sum.toFixed(4)}`
        );
      }
    }

    // Invariant 2: sum(delivered) + unmet = demand
    for (const mode of ['before', 'after']) {
      const demand = r[`demand_${mode}`] || 0;
      const unmet = r[`unmet_${mode}`] || 0;
      let sumDelivered = 0;
      for (const id of LOAD_IDS) {
        sumDelivered += r[`delivered_${mode}`]?.[id] || 0;
      }
      if (Math.abs(sumDelivered + unmet - demand) > TOLERANCE_SUM) {
        failures.push(
          `Inv 2 (delivered balance ${mode}) failed at slot ${i}: sumDeliv+unmet=${(sumDelivered + unmet).toFixed(4)}, demand=${demand.toFixed(4)}`
        );
      }
    }

    // Invariant 3: Star balance: solar_flow + wind_flow + grid_import = sum(delivered)
    for (const mode of ['before', 'after']) {
      const renMw = r.renewable_mw || 0;
      const renUsed = r[`renewable_used_${mode}`] || 0;
      const factor = renMw > 0 ? renUsed / renMw : 0;
      const solarFlow = (r.solar_mw || 0) * factor;
      const windFlow = (r.wind_mw || 0) * factor;
      const gridFlow = r[`grid_import_${mode}`] || 0;
      const totalSources = solarFlow + windFlow + gridFlow;

      let sumDelivered = 0;
      for (const id of LOAD_IDS) {
        sumDelivered += r[`delivered_${mode}`]?.[id] || 0;
      }
      if (Math.abs(totalSources - sumDelivered) > TOLERANCE_SUM) {
        failures.push(
          `Inv 3 (star balance ${mode}) failed at slot ${i}: sources=${totalSources.toFixed(4)}, delivered=${sumDelivered.toFixed(4)}`
        );
      }
    }

    // Invariant 4: grid_import <= config.grid_capacity
    for (const mode of ['before', 'after']) {
      const gridImp = r[`grid_import_${mode}`] || 0;
      if (gridImp > gridCapacity) {
        failures.push(
          `Inv 4 (grid import limit ${mode}) failed at slot ${i}: import=${gridImp.toFixed(4)} > cap=${gridCapacity.toFixed(4)}`
        );
      }
    }

    // Invariant 5: loads_after.hospital == loads_before.hospital
    const hospBefore = r.loads_before?.hospital || 0;
    const hospAfter = r.loads_after?.hospital || 0;
    if (Math.abs(hospBefore - hospAfter) > TOLERANCE_POINT) {
      failures.push(
        `Inv 5 (hospital protected) failed at slot ${i}: before=${hospBefore.toFixed(4)}, after=${hospAfter.toFixed(4)}`
      );
    }
  }

  // Invariant 6: sum(loads_after[id]) == sum(loads_before[id]) for every load and every calendar day
  for (const [dayKey, dayData] of Object.entries(days)) {
    for (const id of LOAD_IDS) {
      const diff = Math.abs(dayData.before[id] - dayData.after[id]);
      if (diff > TOLERANCE_SUM) {
        failures.push(
          `Inv 6 (daily energy conservation) failed for ${id} on ${dayKey}: before=${dayData.before[id].toFixed(4)}, after=${dayData.after[id].toFixed(4)}`
        );
      }
    }
  }

  // Invariant 7: optimization.status == 'optimal' and abs(energy_error_mwh) < 1e-6
  if (run.optimization) {
    if (run.optimization.status && run.optimization.status !== 'optimal') {
      failures.push(
        `Inv 7 (solver status) failed: status="${run.optimization.status}" (expected "optimal")`
      );
    }
    const errMwh = Math.abs(run.optimization.energy_error_mwh || 0);
    if (errMwh > TOLERANCE_POINT) {
      failures.push(
        `Inv 7 (energy error) failed: energy_error_mwh=${errMwh.toExponential(4)}`
      );
    }
  }

  // Invariant 8: transfers validation
  for (let j = 0; j < transfers.length; j++) {
    const t = transfers[j];
    const shiftSpec = shiftsMap[t.load];
    if (!shiftSpec) continue;

    // Check shift hours
    const shiftHours = Math.abs(t.from_index - t.to_index) * 0.25;
    const maxShift = (shiftSpec.max_shift_hours || 0) + TOLERANCE_POINT;
    if (shiftHours > maxShift) {
      failures.push(
        `Inv 8 (max shift exceeded) transfer ${j} for ${t.load}: ${shiftHours}h > ${maxShift}h`
      );
    }

    // Check same calendar day
    const fromRow = series[t.from_index];
    const toRow = series[t.to_index];
    if (fromRow && toRow) {
      const fromDay = (fromRow.timestamp || '').slice(0, 10);
      const toDay = (toRow.timestamp || '').slice(0, 10);
      if (fromDay !== toDay) {
        failures.push(
          `Inv 8 (cross-day transfer) transfer ${j} for ${t.load}: from ${fromDay} to ${toDay}`
        );
      }
    }

    // Check destination window
    if (toRow && shiftSpec.operating_window) {
      const match = shiftSpec.operating_window.match(/(\d\d):(\d\d)[–-](\d\d):(\d\d)/);
      if (match) {
        const destHour = parseInt((toRow.timestamp || '').slice(11, 13), 10);
        const startH = parseInt(match[1], 10);
        const endH = parseInt(match[3], 10);
        // Destination hour check
        if (destHour < startH || destHour >= endH) {
          failures.push(
            `Inv 8 (destination out of window) transfer ${j} for ${t.load}: slot ${toRow.timestamp} outside ${shiftSpec.operating_window}`
          );
        }
      }
    }
  }

  const ok = failures.length === 0;
  return {
    ok,
    status: ok ? 'ok' : 'error',
    label: ok ? 'Energy conserved · balance OK' : `${failures.length} integrity check(s) failed`,
    failures,
  };
}
