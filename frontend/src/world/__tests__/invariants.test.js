import { describe, it, expect } from 'vitest';
import fixtureRun from './fixtures/run-balanced-24h.json';
import { checkInvariants } from '../invariants.js';

describe('Invariants Checker', () => {
  it('passes on valid balanced run fixture', () => {
    const result = checkInvariants(fixtureRun);
    expect(result.ok).toBe(true);
    expect(result.status).toBe('ok');
    expect(result.failures).toHaveLength(0);
  });

  it('fails when a delivered value is corrupted (negative test 1)', () => {
    // Clone and corrupt
    const corrupted = JSON.parse(JSON.stringify(fixtureRun));
    corrupted.series[10].delivered_after.commercial += 0.5;

    const result = checkInvariants(corrupted);
    expect(result.ok).toBe(false);
    expect(result.status).toBe('error');
    expect(result.failures.length).toBeGreaterThan(0);
    const hasDelivFailure = result.failures.some(
      (f) => f.includes('Inv 2') || f.includes('Inv 3')
    );
    expect(hasDelivFailure).toBe(true);
  });

  it('fails when daily energy conservation is violated (negative test 2)', () => {
    const corrupted = JSON.parse(JSON.stringify(fixtureRun));
    corrupted.series[20].loads_after.industrial += 1.2;

    const result = checkInvariants(corrupted);
    expect(result.ok).toBe(false);
    const hasConservationFailure = result.failures.some((f) => f.includes('Inv 6'));
    expect(hasConservationFailure).toBe(true);
  });

  it('fails when hospital load is altered (negative test 3)', () => {
    const corrupted = JSON.parse(JSON.stringify(fixtureRun));
    corrupted.series[5].loads_after.hospital += 0.1;

    const result = checkInvariants(corrupted);
    expect(result.ok).toBe(false);
    const hasHospitalFailure = result.failures.some((f) => f.includes('Inv 5'));
    expect(hasHospitalFailure).toBe(true);
  });
});
