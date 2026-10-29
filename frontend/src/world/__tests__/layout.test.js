import { describe, it, expect } from 'vitest';
import cityLayout from '../layout/city.json';
import { validateCityLayout } from '../layout/validate.js';

describe('City Layout and Topology', () => {
  it('validates city.json against all geometric and topological rules', () => {
    const result = validateCityLayout(cityLayout);
    expect(result.ok, `Layout errors: ${result.errors.join(', ')}`).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('contains all 11 required nodes with valid coordinates and footprints', () => {
    expect(cityLayout.nodes).toHaveLength(11);
    for (const node of cityLayout.nodes) {
      expect(node.id).toBeDefined();
      expect(node.position).toHaveLength(3);
      expect(node.footprint.length).toBeGreaterThanOrEqual(4);
      expect(node.parts).toBeDefined();
    }
  });

  it('fails when an invalid self-intersecting polygon is provided (negative test)', () => {
    const badLayout = JSON.parse(JSON.stringify(cityLayout));
    // Bowtie polygon: self-intersecting
    badLayout.nodes[0].footprint = [
      [0, 0],
      [10, 10],
      [0, 10],
      [10, 0],
    ];
    const result = validateCityLayout(badLayout);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('self-intersecting'))).toBe(true);
  });
});
