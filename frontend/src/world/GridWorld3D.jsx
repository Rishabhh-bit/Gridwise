import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CityScene } from './levels/City.jsx';
import { SiteScene } from './levels/Site.jsx';
import { EquipmentScene } from './levels/Equipment.jsx';
import { createGridFloorMaterial } from './materials/gridFloor.js';
import { buildBuffers, flowsAt } from './selectors.js';
import { damp, getCameraDistanceForDepth, getFovForDepth, computeCameraPosition } from './zoom.js';
import { TitleBlock } from './hud/TitleBlock.jsx';
import { WorldBreadcrumb } from './hud/Breadcrumb.jsx';
import { IntegrityBadge } from './hud/IntegrityBadge.jsx';
import { TimelineStrip } from './hud/TimelineStrip.jsx';
import { Lenses } from './hud/Lenses.jsx';
import { TourOverlay } from './hud/Tour.jsx';
import { buildShortageTour } from './tour/followShortage.js';
import cityLayout from './layout/city.json';
import { Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import './world.css';

const NODE_POS_MAP = {};
for (const n of cityLayout.nodes) {
  NODE_POS_MAP[n.id] = new THREE.Vector3(n.position[0], 0, n.position[2]);
}

/**
 * Camera Rig managing continuous depth, exponential distance, and critically damped gliding.
 */
function CameraRig({ depth, targetNodeId, isEquipment, setCamDist }) {
  const { camera } = useThree();
  const currentDepth = useRef(depth);
  const currentTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    currentDepth.current = damp(currentDepth.current, depth, 7.0, dt);

    const goalTarget = targetNodeId && NODE_POS_MAP[targetNodeId]
      ? NODE_POS_MAP[targetNodeId]
      : new THREE.Vector3(0, 0, 0);

    currentTarget.current.x = damp(currentTarget.current.x, goalTarget.x, 8.0, dt);
    currentTarget.current.y = damp(currentTarget.current.y, goalTarget.y, 8.0, dt);
    currentTarget.current.z = damp(currentTarget.current.z, goalTarget.z, 8.0, dt);

    const dist = getCameraDistanceForDepth(currentDepth.current);
    if (setCamDist) setCamDist(dist);

    const camPos = computeCameraPosition(currentTarget.current, dist, currentDepth.current);
    camera.position.copy(camPos);
    camera.lookAt(currentTarget.current);

    camera.fov = getFovForDepth(currentDepth.current);
    camera.near = Math.max(0.1, dist / 200.0);
    camera.far = dist * 50.0;
    camera.updateProjectionMatrix();
  });

  return null;
}

/**
 * Drafting Grid Floor Mesh
 */
function DraftingFloor() {
  const floorMesh = useMemo(() => {
    const geom = new THREE.PlaneGeometry(1600, 1600);
    const mat = createGridFloorMaterial();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.1;
    mesh.userData = { part: 'drafting_floor', level: 'city', nodeId: 'all', class: 'structure' };
    return mesh;
  }, []);

  return <primitive object={floorMesh} />;
}

/**
 * Debug 2D Top-Down Plan View overlay (?debug=plan)
 */
function DebugPlanView({ layout, onClose }) {
  return (
    <div className="debug-plan-overlay" style={{
      position: 'absolute', inset: 0, background: '#f4f6f1f5', zIndex: 100, padding: 20, overflow: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>City Schematic Plan View (Debug: ?debug=plan)</h3>
        <button className="button secondary" onClick={onClose}>Close Plan</button>
      </div>
      <svg viewBox="-350 -250 700 500" style={{ width: '100%', maxHeight: '80vh', border: '1px solid #c2ceb9', background: '#fafcf7' }}>
        {layout.nodes.map(n => (
          <polygon
            key={n.id}
            points={n.footprint.map(p => `${p[0]},${p[1]}`).join(' ')}
            fill="#d5e7a6"
            stroke="#203b30"
            strokeWidth="1.5"
            opacity="0.6"
          />
        ))}
        {layout.nodes.map(n => (
          <text key={`txt-${n.id}`} x={n.position[0]} y={n.position[2]} fontSize="11" textAnchor="middle" fill="#203b30" fontWeight="600">
            {n.name}
          </text>
        ))}
        {layout.edges.map(e => {
          const p1 = NODE_POS_MAP[e.from];
          const p2 = NODE_POS_MAP[e.to];
          if (!p1 || !p2) return null;
          return <line key={e.id} x1={p1.x} y1={p1.z} x2={p2.x} y2={p2.z} stroke="#2b7657" strokeWidth="1" strokeDasharray="4 4" />;
        })}
      </svg>
    </div>
  );
}

export default function GridWorld3D({
  row,
  run,
  optimized,
  selected,
  setSelected,
  playing,
  setPlaying,
  speed,
  index,
  setIndex,
}) {
  const [depth, setDepth] = useState(selected ? 1.0 : 2.0);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [activeLens, setActiveLens] = useState('flows');
  const [camDist, setCamDist] = useState(900);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [showDebugPlan, setShowDebugPlan] = useState(
    typeof window !== 'undefined' && window.location.search.includes('debug=plan')
  );

  // Sync selection to depth
  useEffect(() => {
    if (selected) {
      if (equipmentOpen) {
        setDepth(0.0);
      } else {
        setDepth(1.0);
      }
    } else {
      setDepth(2.0);
      setEquipmentOpen(false);
    }
  }, [selected, equipmentOpen]);

  const level = Math.round(depth);

  // Derived flows
  const buffers = useMemo(() => buildBuffers(run), [run]);
  const flows = useMemo(() => {
    return flowsAt(buffers, index, optimized ? 'after' : 'before');
  }, [buffers, index, optimized]);

  // Guided Shortage Tour
  const tourData = useMemo(() => buildShortageTour(run), [run]);

  const startTour = useCallback(() => {
    if (!tourData) return;
    setTourActive(true);
    setTourStep(0);
    applyTourStep(0);
  }, [tourData]);

  const applyTourStep = (stepIdx) => {
    if (!tourData || !tourData.steps[stepIdx]) return;
    const st = tourData.steps[stepIdx];
    setSelected(st.targetNode);
    setIndex(st.slotIndex);
    if (st.level === 0) {
      setEquipmentOpen(true);
      setDepth(0.0);
    } else if (st.level === 1) {
      setEquipmentOpen(false);
      setDepth(1.0);
    } else {
      setEquipmentOpen(false);
      setDepth(2.0);
    }
  };

  const nextTourStep = () => {
    if (!tourData) return;
    const nextIdx = Math.min(tourData.steps.length - 1, tourStep + 1);
    setTourStep(nextIdx);
    applyTourStep(nextIdx);
  };

  const prevTourStep = () => {
    if (!tourData) return;
    const prevIdx = Math.max(0, tourStep - 1);
    setTourStep(prevIdx);
    applyTourStep(prevIdx);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(activeTag)) return;

      if (e.key === ' ') {
        e.preventDefault();
        setPlaying(!playing);
      } else if (e.key === 'Escape') {
        if (equipmentOpen) {
          setEquipmentOpen(false);
          setDepth(1.0);
        } else if (selected) {
          setSelected(null);
          setDepth(2.0);
        }
      } else if (e.key === '[') {
        // Zoom out
        if (equipmentOpen) {
          setEquipmentOpen(false);
          setDepth(1.0);
        } else if (selected) {
          setSelected(null);
          setDepth(2.0);
        }
      } else if (e.key === ']') {
        // Zoom in
        if (!selected) {
          setSelected('ev');
          setDepth(1.0);
        } else if (!equipmentOpen) {
          setEquipmentOpen(true);
          setDepth(0.0);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const nodes = cityLayout.nodes.map((n) => n.id);
        const curr = nodes.indexOf(selected);
        if (curr === -1) {
          setSelected(nodes[0]);
        } else {
          const next = e.key === 'ArrowRight'
            ? (curr + 1) % nodes.length
            : (curr - 1 + nodes.length) % nodes.length;
          setSelected(nodes[next]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playing, selected, equipmentOpen, setPlaying, setSelected]);

  // Wheel zoom handling
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * 0.0015;
    setDepth((prev) => {
      const next = Math.max(0.0, Math.min(2.0, prev + delta));
      if (next >= 1.6 && selected) {
        setSelected(null);
        setEquipmentOpen(false);
      }
      return next;
    });
  };

  return (
    <div className="grid-3d-wrap" onWheel={handleWheel}>
      {/* 3D Canvas */}
      <Canvas
        className="grid-3d-canvas"
        camera={{ position: [0, 900, 900], fov: 22 }}
        gl={{ antialias: true, alpha: true }}
      >
        <CameraRig
          depth={depth}
          targetNodeId={selected}
          isEquipment={equipmentOpen}
          setCamDist={setCamDist}
        />
        <DraftingFloor />

        {/* Level Scenes based on current Depth */}
        {level === 2 && (
          <CityScene
            run={run}
            row={row}
            flows={flows}
            unmet={row?.[`unmet_${optimized ? 'after' : 'before'}`] || 0}
            playing={playing}
            speed={speed}
            selected={selected}
            onSelectSite={(id) => {
              setSelected(id);
              setEquipmentOpen(false);
            }}
            depth={depth}
          />
        )}

        {level === 1 && (
          <SiteScene
            run={run}
            row={row}
            selected={selected}
            depth={depth}
            onOpenEquipment={() => {
              setEquipmentOpen(true);
              setDepth(0.0);
            }}
          />
        )}

        {level === 0 && (
          <EquipmentScene
            selected={selected}
            run={run}
            row={row}
            playing={playing}
            onCloseEquipment={() => {
              setEquipmentOpen(false);
              setDepth(1.0);
            }}
          />
        )}
      </Canvas>

      {/* Visually Hidden Accessible Node Buttons */}
      <div className="sr-only-nodes" aria-label="Microgrid nodes keyboard list">
        {cityLayout.nodes.map((n) => (
          <button
            key={n.id}
            aria-label={`Inspect ${n.name}`}
            onClick={() => {
              setSelected(n.id);
              setEquipmentOpen(false);
            }}
          >
            {n.name}
          </button>
        ))}
      </div>

      {/* HUD Overlays */}
      <WorldBreadcrumb
        level={level}
        selected={selected}
        onGoCity={() => {
          setSelected(null);
          setEquipmentOpen(false);
        }}
        onGoSite={() => {
          setEquipmentOpen(false);
          setDepth(1.0);
        }}
        equipmentOpen={equipmentOpen}
      />

      <IntegrityBadge run={run} />

      <Lenses activeLens={activeLens} onSelectLens={setActiveLens} />

      {/* Tour trigger button */}
      {!tourActive && (
        <button
          className="button secondary"
          style={{ position: 'absolute', top: 48, right: 14, zIndex: 10, fontSize: 10, padding: '4px 8px' }}
          onClick={startTour}
          title="Start guided Shortage Tour"
        >
          <Sparkles size={12} />
          <span>Follow Shortage Tour</span>
        </button>
      )}

      {/* Timeline Strip */}
      <TimelineStrip
        run={run}
        row={row}
        index={index}
        setIndex={setIndex}
        setPlaying={setPlaying}
        selected={selected}
        optimized={optimized}
      />

      {/* Title Block */}
      <TitleBlock
        run={run}
        row={row}
        level={level}
        selected={selected}
        optimized={optimized}
        distance={camDist}
      />

      {/* Tour Narrative Overlay */}
      {tourActive && tourData && (
        <TourOverlay
          active={tourActive}
          currentStep={tourStep}
          totalSteps={tourData.steps.length}
          caption={tourData.caption}
          stepInfo={tourData.steps[tourStep]}
          onNext={nextTourStep}
          onPrev={prevTourStep}
          onClose={() => setTourActive(false)}
          playing={playing}
          onTogglePlay={() => setPlaying(!playing)}
        />
      )}

      {/* Debug Plan View */}
      {showDebugPlan && (
        <DebugPlanView layout={cityLayout} onClose={() => setShowDebugPlan(false)} />
      )}
    </div>
  );
}

