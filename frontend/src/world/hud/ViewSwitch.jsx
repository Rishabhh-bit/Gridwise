import React from 'react';
import { Box, Network } from 'lucide-react';

export function ViewSwitch({ viewMode, onChangeView }) {
  return (
    <div className="view-switch-segmented" role="radiogroup" aria-label="Simulation View Mode">
      <button
        role="radio"
        aria-checked={viewMode === '3d'}
        className={`view-switch-btn ${viewMode === '3d' ? 'active' : ''}`}
        onClick={() => onChangeView('3d')}
      >
        <Box size={14} />
        <span>3D World</span>
      </button>
      <button
        role="radio"
        aria-checked={viewMode === 'diagram'}
        className={`view-switch-btn ${viewMode === 'diagram' ? 'active' : ''}`}
        onClick={() => onChangeView('diagram')}
      >
        <Network size={14} />
        <span>Diagram</span>
      </button>
    </div>
  );
}

/**
 * Checks if WebGL2 is available in current environment.
 */
export function isWebGL2Available() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}
