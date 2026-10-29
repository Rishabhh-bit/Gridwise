import { findShortage } from '../selectors.js';
import { clock, fmt } from '../../api.js';

/**
 * Builds the guided tour steps and runtime generated narrative from the real run data.
 */
export function buildShortageTour(run) {
  if (!run || !run.series) return null;

  const shortage = findShortage(run, 'before');
  const shifts = run.optimization?.shifts || [];
  const stats = run.statistics || {};
  const config = run.config || {};

  // Find load with largest shifted MWh
  const sortedShifts = [...shifts].sort((a, b) => (b.shifted_mwh || 0) - (a.shifted_mwh || 0));
  const topLoad = sortedShifts[0] || { id: 'ev', name: 'EV charging', shifted_mwh: 0 };
  const secondLoad = sortedShifts[1];

  let caption = '';
  if (shortage) {
    const startTime = clock(shortage.start_time);
    const endTime = clock(shortage.end_time);
    const gridCap = fmt(config.grid_capacity || 7.0, 1);
    const peakGap = fmt(shortage.peak_mw);
    const unserved = fmt(shortage.unserved_mwh);
    const totalShifted = fmt(stats.shifted_mwh || 0);
    const topLoadShift = fmt(topLoad.shifted_mwh || 0);
    const peakBefore = fmt(stats.before?.peak_mw || 0);
    const peakAfter = fmt(stats.after?.peak_mw || 0);

    caption = `${startTime} to ${endTime}: requested demand exceeds renewable output plus ${gridCap} MW of grid import by up to ${peakGap} MW (${unserved} MWh unserved). The optimiser moved ${totalShifted} MWh of flexible load, most of it ${topLoad.name} (${topLoadShift} MWh)${
      secondLoad ? ` and ${secondLoad.name} (${fmt(secondLoad.shifted_mwh)} MWh)` : ''
    }. After dispatch, unserved energy is ${fmt(stats.after?.unserved_mwh || 0)} MWh and the peak falls from ${peakBefore} to ${peakAfter} MW.`;
  } else {
    caption = `No grid shortage in this scenario. The optimiser moved ${fmt(stats.shifted_mwh || 0)} MWh of flexible load (led by ${topLoad.name} with ${fmt(topLoad.shifted_mwh || 0)} MWh) to minimize import costs and flatten peak demand from ${fmt(stats.before?.peak_mw || 0)} to ${fmt(stats.after?.peak_mw || 0)} MW.`;
  }

  const steps = [
    {
      title: 'City Demand & Shortage Window',
      description: shortage
        ? `Identified grid shortfall between ${clock(shortage.start_time)} and ${clock(shortage.end_time)} IST.`
        : 'Analyzing city-wide renewable and grid import distribution.',
      level: 2,
      targetNode: null,
      slotIndex: shortage ? shortage.start_index : 36,
      optimized: false,
    },
    {
      title: 'Central Substation Yard',
      description: 'Grid import operates at capacity ceiling while renewable gap persists.',
      level: 1,
      targetNode: 'hub',
      slotIndex: shortage ? shortage.start_index : 36,
      optimized: false,
    },
    {
      title: `Flexibility at ${topLoad.name}`,
      description: `${topLoad.name} rescheduled ${fmt(topLoad.shifted_mwh)} MWh within allowed windows.`,
      level: 1,
      targetNode: topLoad.id,
      slotIndex: shortage ? shortage.start_index : 36,
      optimized: true,
    },
    {
      title: 'Equipment Allocation',
      description: 'Reviewing physical asset shares under the optimized schedule.',
      level: 0,
      targetNode: topLoad.id,
      slotIndex: shortage ? shortage.start_index : 36,
      optimized: true,
    },
    {
      title: 'Restored Grid Balance',
      description: 'City demand flattened, unserved energy eliminated, critical loads protected.',
      level: 2,
      targetNode: null,
      slotIndex: shortage ? shortage.start_index : 36,
      optimized: true,
    },
  ];

  return { caption, steps };
}
