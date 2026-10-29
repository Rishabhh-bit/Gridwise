import { describe, it, expect } from 'vitest';
import { TOKENS } from '../tokens.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Token synchronization', () => {
  it('every hex in TOKENS exists in styles.css or POWER_LINES', () => {
    const stylesPath = path.resolve(__dirname, '../../styles.css');
    const chartsPath = path.resolve(__dirname, '../../components/Charts.jsx');
    const stylesContent = fs.readFileSync(stylesPath, 'utf8').toLowerCase();
    const chartsContent = fs.readFileSync(chartsPath, 'utf8').toLowerCase();

    for (const [key, hex] of Object.entries(TOKENS)) {
      const lowerHex = hex.toLowerCase();
      const inStyles = stylesContent.includes(lowerHex);
      const inCharts = chartsContent.includes(lowerHex);
      expect(
        inStyles || inCharts,
        `Token "${key}" with color "${hex}" must exist in styles.css or POWER_LINES in Charts.jsx`
      ).toBe(true);
    }
  });
});
