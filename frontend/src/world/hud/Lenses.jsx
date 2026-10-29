import React from 'react';
import { Layers, Activity, GitCompare, Zap } from 'lucide-react';

export function Lenses({ activeLens, onSelectLens }) {
  const lenses = [
    { id: 'flows', label: 'Flows', icon: Zap },
    { id: 'shifts', label: 'Shifts', icon: Layers },
    { id: 'alerts', label: 'Alerts', icon: Activity },
    { id: 'compare', label: 'Compare', icon: GitCompare },
  ];

  return (
    <div className="blueprint-lenses" role="toolbar" aria-label="3D View Lenses">
      <span className="lenses-label">LENS</span>
      <div className="lenses-group">
        {lenses.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`lens-btn ${activeLens === id ? 'active' : ''}`}
            onClick={() => onSelectLens(id)}
            title={`Activate ${label} lens`}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
