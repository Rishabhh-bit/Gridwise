import React, { useMemo } from 'react';
import { findShortage } from '../selectors.js';
import { clock, fmt } from '../../api.js';

export function TimelineStrip({
  run,
  row,
  index,
  setIndex,
  setPlaying,
  selected,
  optimized,
}) {
  const series = run?.series || [];
  const n = series.length;
  const mode = optimized ? 'after' : 'before';

  const shortage = useMemo(() => findShortage(run, mode), [run, mode]);
  const stats = run?.statistics?.[mode];

  // Peak marker slot
  const peakSlot = useMemo(() => {
    if (!stats || !stats.peak_at) return -1;
    return series.findIndex((r) => r.timestamp === stats.peak_at);
  }, [series, stats]);

  // Load shift hollow/solid values when site selected
  const siteBars = useMemo(() => {
    if (!selected || !['residential', 'commercial', 'industrial', 'ev', 'water', 'hvac', 'hospital'].includes(selected)) {
      return null;
    }
    const maxVal = Math.max(
      ...series.map((r) => Math.max(r.loads_before?.[selected] || 0, r.loads_after?.[selected] || 0)),
      0.01
    );
    return series.map((r) => ({
      before: ((r.loads_before?.[selected] || 0) / maxVal) * 100,
      after: ((r.loads_after?.[selected] || 0) / maxVal) * 100,
      rawBefore: r.loads_before?.[selected] || 0,
      rawAfter: r.loads_after?.[selected] || 0,
    }));
  }, [series, selected]);

  if (n === 0) return null;

  return (
    <div className="timeline-strip-container">
      <div className="timeline-strip-track">
        {/* Tariff bands background */}
        {series.map((r, i) => {
          const tariff = r.tariff_inr_kwh || 5;
          const tariffClass = tariff >= 12 ? 'tariff-peak' : tariff >= 8 ? 'tariff-mid' : 'tariff-off';
          const isShortage = shortage && i >= shortage.start_index && i <= shortage.end_index;

          return (
            <div
              key={i}
              className={`timeline-slot ${tariffClass} ${isShortage ? 'is-shortage' : ''} ${i === index ? 'is-current' : ''}`}
              style={{ width: `${100 / n}%` }}
              onClick={() => {
                setIndex(i);
                setPlaying(false);
              }}
              title={`${clock(r.timestamp)} IST · ₹${tariff}/kWh ${isShortage ? '· SHORTAGE' : ''}`}
            >
              {/* Hollow vs Solid Bars for selected load */}
              {siteBars && (
                <div className="site-load-bars">
                  <div
                    className="bar-hollow"
                    style={{ height: `${siteBars[i].before}%` }}
                    title={`Before: ${fmt(siteBars[i].rawBefore)} MW`}
                  />
                  <div
                    className="bar-solid"
                    style={{ height: `${siteBars[i].after}%` }}
                    title={`After: ${fmt(siteBars[i].rawAfter)} MW`}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Current playhead cursor indicator */}
        <div
          className="timeline-playhead-indicator"
          style={{ left: `${(index / Math.max(1, n - 1)) * 100}%` }}
        />

        {/* Peak marker flag */}
        {peakSlot >= 0 && (
          <div
            className="timeline-peak-flag"
            style={{ left: `${(peakSlot / (n - 1)) * 100}%` }}
            title={`Peak Demand: ${fmt(stats.peak_mw)} MW at ${clock(stats.peak_at)} IST`}
          >
            <span>PEAK</span>
          </div>
        )}
      </div>

      <div className="timeline-strip-legend">
        <span><i className="strip-dot off" />₹5 Off-peak</span>
        <span><i className="strip-dot mid" />₹8 Normal</span>
        <span><i className="strip-dot peak" />₹12 Peak</span>
        {shortage && (
          <span className="shortage-label">
            <i className="strip-dot shortage" />Shortage ({fmt(shortage.peak_mw)} MW unmet)
          </span>
        )}
        {selected && siteBars && (
          <span className="shift-legend">
            <i className="strip-bar-icon hollow" />Original
            <i className="strip-bar-icon solid" />Optimized
          </span>
        )}
      </div>
    </div>
  );
}
