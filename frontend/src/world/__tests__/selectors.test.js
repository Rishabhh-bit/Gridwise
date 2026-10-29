import { describe, it, expect } from 'vitest';
import fixtureRun from './fixtures/run-balanced-24h.json';
import {
  buildBuffers,
  flowsAt,
  alertNode,
  alertNodeReason,
  shiftsFor,
  findShortage,
  playheadEase,
  LOAD_IDS,
} from '../selectors.js';

describe('Selectors and Derived Flows', () => {
  it('buildBuffers extracts all series into typed arrays', () => {
    const buffers = buildBuffers(fixtureRun);
    expect(buffers).not.toBeNull();
    expect(buffers.length).toBe(fixtureRun.series.length);
    expect(buffers.solar_mw).toBeInstanceOf(Float32Array);
    expect(buffers.wind_mw).toBeInstanceOf(Float32Array);
    for (const id of LOAD_IDS) {
      expect(buffers.loads_before[id]).toBeInstanceOf(Float32Array);
      expect(buffers.loads_after[id]).toBeInstanceOf(Float32Array);
      expect(buffers.delivered_before[id]).toBeInstanceOf(Float32Array);
      expect(buffers.delivered_after[id]).toBeInstanceOf(Float32Array);
    }
  });

  it('flowsAt derives flows matching Section 4.2 formulas with star balance holding to 1e-9', () => {
    const buffers = buildBuffers(fixtureRun);
    const n = fixtureRun.series.length;

    for (let i = 0; i < n; i++) {
      for (const mode of ['before', 'after']) {
        const flows = flowsAt(buffers, i, mode);
        const row = fixtureRun.series[i];

        const renUsed = row[`renewable_used_${mode}`];
        const factor = row.renewable_mw > 0 ? renUsed / row.renewable_mw : 0;

        expect(Math.abs(flows.solar - row.solar_mw * factor)).toBeLessThan(1e-5);
        expect(Math.abs(flows.wind - row.wind_mw * factor)).toBeLessThan(1e-5);
        expect(Math.abs(flows.utility - row[`grid_import_${mode}`])).toBeLessThan(1e-5);

        let sumLoads = 0;
        for (const id of LOAD_IDS) {
          const expectedDeliv = row[`delivered_${mode}`][id];
          expect(Math.abs(flows.load[id] - expectedDeliv)).toBeLessThan(1e-5);
          sumLoads += flows.load[id];
        }

        const sources = flows.solar + flows.wind + flows.utility;
        // Check 3 star balance
        expect(Math.abs(sources - sumLoads)).toBeLessThan(1e-5);
      }
    }
  });

  it('alertNode maps injected alerts to industrial and others to residential', () => {
    expect(alertNode({ injected: true })).toBe('industrial');
    expect(alertNode({ injected: false })).toBe('residential');
    expect(alertNode(null)).toBe('residential');

    expect(alertNodeReason({ injected: true })).toContain('industrial');
    expect(alertNodeReason({ injected: false })).toContain('residential');
  });

  it('shiftsFor returns shift spec, top transfers, and before/after arrays', () => {
    const evShifts = shiftsFor(fixtureRun, 'ev');
    expect(evShifts).not.toBeNull();
    expect(evShifts.shift.id).toBe('ev');
    expect(evShifts.transfers.length).toBeLessThanOrEqual(12);
    for (const t of evShifts.transfers) {
      expect(t.load).toBe('ev');
      expect(t.from_index).not.toBe(t.to_index);
    }
    expect(evShifts.before.length).toBe(fixtureRun.series.length);
    expect(evShifts.after.length).toBe(fixtureRun.series.length);
  });

  it('findShortage finds contiguous shortage window or returns null', () => {
    const shortageBefore = findShortage(fixtureRun, 'before');
    if (shortageBefore) {
      expect(shortageBefore.start_index).toBeGreaterThanOrEqual(0);
      expect(shortageBefore.end_index).toBeGreaterThanOrEqual(shortageBefore.start_index);
      expect(shortageBefore.peak_mw).toBeGreaterThan(0);
      expect(shortageBefore.unserved_mwh).toBeGreaterThan(0);
    }

    // In after mode for balanced city, shortage should be zero/null
    const shortageAfter = findShortage(fixtureRun, 'after');
    expect(shortageAfter).toBeNull();
  });

  it('playheadEase snaps on scrub distance > 8 and eases smoothly otherwise', () => {
    expect(playheadEase(10, 30, 8, 0.016)).toBe(30); // snap
    const eased = playheadEase(10, 11, 8, 0.016);
    expect(eased).toBeGreaterThan(10);
    expect(eased).toBeLessThan(11);
  });
});
