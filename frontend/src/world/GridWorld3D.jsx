import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CityScene } from './levels/City.jsx';
import { SiteScene } from './levels/Site.jsx';
import { EquipmentScene } from './levels/Equipment.jsx';
import { createGridFloorMaterial } from './materials/gridFloor.js';
import { buildBuffers, flowsAt } from './selectors.js';
import { damp } from './zoom.js';
import { TitleBlock } from './hud/TitleBlock.jsx';
import { WorldBreadcrumb } from './hud/Breadcrumb.jsx';
import { IntegrityBadge } from './hud/IntegrityBadge.jsx';
import { TimelineStrip } from './hud/TimelineStrip.jsx';
import { Lenses } from './hud/Lenses.jsx';
import { TourOverlay } from './hud/Tour.jsx';
import { buildShortageTour } from './tour/followShortage.js';
import cityLayout from './layout/city.json';
import { Sparkles, Compass } from 'lucide-react';
import { fmt } from '../api.js';
import './world.css';

const NODE_POS_MAP = {};
for (const n of cityLayout.nodes) {
  NODE_POS_MAP[n.id] = new THREE.Vector3(n.position[0], 0, n.position[2]);
}

/**
 * Enhanced Camera & OrbitControls Manager:
 * - Free 3D orbit (rotate) with left-click drag
 * - Free 3D pan (move) with right-click / two-finger drag
 * - Smooth scroll-wheel zoom to inspect every building
 * - Smooth damped fly-in when clicking a site
 */
function CameraAndControls({
  selected,
  depth,
  setDepth,
  equipmentOpen,
  setEquipmentOpen,
  setCamDist,
  onLabelsProject,
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const isAnimating = useRef(false);
  const targetGoal = useRef(new THREE.Vector3(0, 0, 0));
  const posGoal = useRef(new THREE.Vector3(0, 750, 750));

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.maxPolarAngle = Math.PI / 2.05; // Prevent camera clipping below ground
    controls.minDistance = 10.0;
    controls.maxDistance = 1400.0;

    // When user starts dragging or scrolling manually, yield animation
    controls.addEventListener('start', () => {
      isAnimating.current = false;
    });

    return () => controls.dispose();
  }, [camera, gl]);

  // When selection or equipment level changes, smoothly fly in
  useEffect(() => {
    const goalCenter = selected && NODE_POS_MAP[selected]
      ? NODE_POS_MAP[selected].clone()
      : new THREE.Vector3(0, 0, 0);

    targetGoal.current.copy(goalCenter);

    const dist = equipmentOpen ? 25 : selected ? 140 : 850;
    const elev = equipmentOpen ? 0.44 : selected ? 0.55 : 0.61;
    const az = Math.PI / 4;

    const horiz = dist * Math.cos(elev);
    posGoal.current.set(
      goalCenter.x + horiz * Math.sin(az),
      goalCenter.y + dist * Math.sin(elev),
      goalCenter.z + horiz * Math.cos(az)
    );

    isAnimating.current = true;
  }, [selected, equipmentOpen]);

  useFrame((state, delta) => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const dt = Math.min(delta, 0.1);

    if (isAnimating.current) {
      controls.target.x = damp(controls.target.x, targetGoal.current.x, 6.0, dt);
      controls.target.y = damp(controls.target.y, targetGoal.current.y, 6.0, dt);
      controls.target.z = damp(controls.target.z, targetGoal.current.z, 6.0, dt);

      camera.position.x = damp(camera.position.x, posGoal.current.x, 6.0, dt);
      camera.position.y = damp(camera.position.y, posGoal.current.y, 6.0, dt);
      camera.position.z = damp(camera.position.z, posGoal.current.z, 6.0, dt);

      if (
        controls.target.distanceTo(targetGoal.current) < 0.8 &&
        camera.position.distanceTo(posGoal.current) < 1.5
      ) {
        isAnimating.current = false;
      }
    }

    controls.update();

    const dist = camera.position.distanceTo(controls.target);
    if (setCamDist) setCamDist(dist);

    // Update continuous depth based on actual camera distance
    if (!isAnimating.current) {
      if (dist < 45) {
        setDepth(0.0);
      } else if (dist < 320) {
        setDepth(1.0);
      } else {
        setDepth(2.0);
      }
    }

    // Project 3D building coordinates to screen coordinates for labels
    if (onLabelsProject) {
      const projected = {};
      const w = gl.domElement.clientWidth;
      const h = gl.domElement.clientHeight;

      for (const node of cityLayout.nodes) {
        const v = new THREE.Vector3(node.position[0], 14.0, node.position[2]);
        v.project(camera);
        // Only show if in front of camera
        if (v.z < 1.0) {
          const x = (v.x * 0.5 + 0.5) * w;
          const y = (-(v.y * 0.5) + 0.5) * h;
          projected[node.id] = { x, y, visible: x >= 20 && x <= w - 20 && y >= 20 && y <= h - 20 };
        } else {
          projected[node.id] = { visible: false };
        }
      }
      onLabelsProject(projected);
    }
  });

  return null;
}

/**
 * Drafting Grid Floor
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
  const [camDist, setCamDist] = useState(850);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [labelCoords, setLabelCoords] = useState({});

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
        if (equipmentOpen) {
          setEquipmentOpen(false);
          setDepth(1.0);
        } else if (selected) {
          setSelected(null);
          setDepth(2.0);
        }
      } else if (e.key === ']') {
        if (!selected) {
          setSelected('ev');
          setDepth(1.0);
        } else if (!equipmentOpen) {
          setEquipmentOpen(true);
          setDepth(0.0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playing, selected, equipmentOpen, setPlaying, setSelected]);

  // Calculate current power for any node
  const getNodePower = (nodeId) => {
    if (nodeId === 'solar') return flows.solar || 0;
    if (nodeId === 'wind') return flows.wind || 0;
    if (nodeId === 'utility') return flows.utility || 0;
    if (nodeId === 'hub') return row?.[`demand_${optimized ? 'after' : 'before'}`] || 0;
    return flows.load?.[nodeId] || 0;
  };

  return (
    <div className="grid-3d-wrap">
      {/* 3D Canvas with OrbitControls */}
      <Canvas
        className="grid-3d-canvas"
        camera={{ position: [0, 850, 850], fov: 24 }}
        gl={{ antialias: true, alpha: true }}
      >
        <CameraAndControls
          selected={selected}
          depth={depth}
          setDepth={setDepth}
          equipmentOpen={equipmentOpen}
          setEquipmentOpen={setEquipmentOpen}
          setCamDist={setCamDist}
          onLabelsProject={setLabelCoords}
        />
        <DraftingFloor />

        {/* Level Scenes based on continuous depth */}
        {level >= 1 && (
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

        {level === 1 && selected && (
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

        {level === 0 && selected && (
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

      {/* Floating 3D Building Pins & Labels */}
      {camDist > 70 && (
        <div className="floating-3d-pins-layer" aria-hidden="true">
          {cityLayout.nodes.map((node) => {
            const pos = labelCoords[node.id];
            if (!pos || !pos.visible) return null;
            const mw = getNodePower(node.id);
            const isSelected = selected === node.id;

            return (
              <button
                key={node.id}
                className={`building-3d-pin ${isSelected ? 'selected' : ''}`}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: 'translate(-50%, -100%)',
                }}
                onClick={() => {
                  setSelected(node.id);
                  setEquipmentOpen(false);
                }}
                title={`Inspect ${node.name}`}
              >
                <span className="pin-title">{node.name}</span>
                <span className="pin-val">{fmt(mw)} MW</span>
              </button>
            );
          })}
        </div>
      )}

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

      {/* Controls Hint Tag */}
      <div className="controls-hint-badge">
        <Compass size={13} />
        <span>Drag to orbit · Right-click to pan · Scroll to zoom</span>
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
          className="button secondary tour-btn"
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
    </div>
  );
}
