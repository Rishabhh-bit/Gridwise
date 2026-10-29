import React from 'react';
import { ChevronRight } from 'lucide-react';
import cityLayout from '../layout/city.json';

const NODE_NAMES = {};
for (const n of cityLayout.nodes) {
  NODE_NAMES[n.id] = n.name;
}

export function WorldBreadcrumb({ level, selected, onGoCity, onGoSite, equipmentOpen }) {
  const siteName = selected ? NODE_NAMES[selected] || selected : null;

  return (
    <nav className="world-breadcrumb" aria-label="3D simulation level navigation">
      <button
        className={`wb-item ${level === 2 ? 'active' : ''}`}
        onClick={onGoCity}
      >
        Pune Microgrid
      </button>
      {siteName && (
        <>
          <ChevronRight size={12} className="wb-sep" />
          <button
            className={`wb-item ${level === 1 && !equipmentOpen ? 'active' : ''}`}
            onClick={onGoSite}
          >
            {siteName}
          </button>
        </>
      )}
      {equipmentOpen && (
        <>
          <ChevronRight size={12} className="wb-sep" />
          <span className="wb-item active">Equipment Detail</span>
        </>
      )}
    </nav>
  );
}
