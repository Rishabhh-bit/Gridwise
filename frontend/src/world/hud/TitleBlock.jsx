import React from 'react';
import { clock, dateLabel } from '../../api.js';

export function TitleBlock({ run, row, level, selected, optimized, distance }) {
  const levelNames = ['EQUIPMENT', 'SITE', 'CITY'];
  const levelName = levelNames[level] || 'CITY';
  const sheetNum = level === 2 ? '01' : level === 1 ? '02' : '03';

  // Compute nominal engineering scale from camera distance
  const scaleRatio = Math.round(distance * 4.5);
  const runIdShort = (run?.id || 'sim').slice(0, 6);
  const timeStr = row?.timestamp ? `${dateLabel(row.timestamp)} ${clock(row.timestamp)} IST` : 'LIVE';

  return (
    <div className="blueprint-title-block">
      <div className="title-block-grid">
        <div className="title-block-cell brand-cell">
          <strong>GRIDWISE</strong>
          <span>DIGITAL TWIN · DWG-01</span>
        </div>
        <div className="title-block-cell">
          <span className="tb-label">SHEET</span>
          <strong>{sheetNum} OF 03</strong>
        </div>
        <div className="title-block-cell">
          <span className="tb-label">LEVEL</span>
          <strong>{levelName}</strong>
        </div>
        <div className="title-block-cell">
          <span className="tb-label">NODE</span>
          <strong>{selected ? selected.toUpperCase() : 'ALL (HUB)'}</strong>
        </div>
        <div className="title-block-cell">
          <span className="tb-label">NOMINAL SCALE</span>
          <strong>~1:{scaleRatio}</strong>
        </div>
        <div className="title-block-cell">
          <span className="tb-label">SIMULATION TIME</span>
          <strong>{timeStr}</strong>
        </div>
        <div className="title-block-cell">
          <span className="tb-label">RUN HASH</span>
          <strong>{runIdShort}…</strong>
        </div>
        <div className="title-block-cell">
          <span className="tb-label">DISPATCH</span>
          <strong className={optimized ? 'opt-text' : ''}>
            {optimized ? 'OPTIMIZED' : 'ORIGINAL'}
          </strong>
        </div>
      </div>
      <div className="title-block-legend">
        <span className="tb-badge" title="Predicted household forecast">P PREDICTED</span>
        <span className="tb-badge" title="Weather engineering estimate">E ESTIMATED</span>
        <span className="tb-badge" title="Simulated city baseline">S SIMULATED</span>
        <span className="tb-badge opt" title="Constrained LP optimal dispatch">O OPTIMIZED</span>
      </div>
    </div>
  );
}
