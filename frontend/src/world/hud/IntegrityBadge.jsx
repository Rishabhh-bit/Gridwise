import React, { useMemo, useState } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { checkInvariants } from '../invariants.js';

export function IntegrityBadge({ run }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const result = useMemo(() => checkInvariants(run), [run]);

  return (
    <div
      className="integrity-badge-wrap"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`integrity-badge ${result.ok ? 'ok' : 'error'}`}>
        {result.ok ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
        <span>{result.label}</span>
      </div>
      {showTooltip && (
        <div className="integrity-tooltip" role="tooltip">
          <strong>Physics & Scheduling Invariants</strong>
          <p>
            {result.ok
              ? 'All 8 conservation, star balance, capacity, hospital protection, and transfer window laws satisfied.'
              : `${result.failures.length} check(s) failed in this run:`}
          </p>
          {!result.ok && (
            <ul>
              {result.failures.slice(0, 5).map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
