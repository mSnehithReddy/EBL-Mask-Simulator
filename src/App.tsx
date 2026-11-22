import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  Compass,
  Eye,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Tag,
  X,
  Zap,
} from 'lucide-react';
import { EXHIBIT_CATALOG, getExhibitById } from './machines/registry';
import type { MachineId, SimulationParams, SubsystemPin } from './machines/types';
import { SceneEngine, type ProjectedPin } from './scene/SceneEngine';
import {
  computeExposureProfile,
  computeResistMetrics,
} from './sim/ebeamPhysics';
import { createInitialScanState } from './sim/scanState';
import { ControlsDrawer } from './ui/ControlsDrawer';
import { DataDrawer } from './ui/DataDrawer';
import { LearnDrawer } from './ui/LearnDrawer';
import { TourOverlay } from './ui/TourOverlay';

const DEFAULT_PARAMS: SimulationParams = {
  running: true,
  speed: 1,
  voltageKv: 50,
  doseUcCm2: 45,
  pecEnabled: true,
  maskType: 'euv',
  patternComplexity: 'curvilinear',
  xray: true,
  showBeam: true,
  showLabels: true,
};

export function App() {
  const [machineId, setMachineId] = useState<MachineId>('mbmw');
  const exhibit = useMemo(() => getExhibitById(machineId), [machineId]);

  const [params, setParams] = useState<SimulationParams>({
    ...DEFAULT_PARAMS,
    ...exhibit.defaultParams,
  });
  const [activeViewId, setActiveViewId] = useState<string>(exhibit.views[0].id);
  const [selectedPin, setSelectedPin] = useState<SubsystemPin | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Left-side drawer slot ('none' | 'controls' | 'learn') prevents overlap
  const [leftPanel, setLeftPanel] = useState<'none' | 'controls' | 'learn'>('none');
  const [dataOpen, setDataOpen] = useState(true);
  const [noiseSeed, setNoiseSeed] = useState(1);

  // Guided camera tour state
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SceneEngine | null>(null);
  const scanStateRef = useRef(createInitialScanState(16));
  const pinElRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Live E-Beam physics calculations (pure TS, memoized)
  const physicsInput = useMemo(
    () => ({
      voltageKv: params.voltageKv,
      doseUcCm2: params.doseUcCm2,
      pecEnabled: params.pecEnabled,
      maskType: params.maskType,
      machineId,
      patternComplexity: params.patternComplexity,
      noiseSeed,
    }),
    [
      params.voltageKv,
      params.doseUcCm2,
      params.pecEnabled,
      params.maskType,
      machineId,
      params.patternComplexity,
      noiseSeed,
    ],
  );

  const exposureProfile = useMemo(
    () => computeExposureProfile(physicsInput),
    [physicsInput],
  );
  const resistMetrics = useMemo(
    () => computeResistMetrics(physicsInput),
    [physicsInput],
  );

  // Mount Three.js SceneEngine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePins = (projected: ProjectedPin[]) => {
      for (const p of projected) {
        const el = pinElRefs.current[p.id];
        if (!el) continue;
        if (!p.visible) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        } else {
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
          el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        }
      }
    };

    const engine = new SceneEngine(
      canvas,
      params,
      scanStateRef.current,
      handlePins,
    );
    engineRef.current = engine;
    engine.loadExhibit(exhibit, exhibit.views[0].id);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload exhibit when machineId changes (future MBMW <-> VSB switching)
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.loadExhibit(exhibit, exhibit.views[0].id);
    setActiveViewId(exhibit.views[0].id);
    setSelectedPin(null);
    setTourActive(false);
    setTourIndex(0);
  }, [exhibit]);

  // Sync simulation params to SceneEngine
  useEffect(() => {
    engineRef.current?.setParams(params);
  }, [params]);

  // Sync theme to document & 3D scene
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    engineRef.current?.setTheme(theme);
  }, [theme]);

  const flyToViewId = useCallback(
    (viewId: string, openMatchingPin = false) => {
      setActiveViewId(viewId);
      const preset = exhibit.views.find((v) => v.id === viewId);
      if (preset) engineRef.current?.flyToPreset(preset, 1.0);
      if (openMatchingPin) {
        const matchingPin =
          exhibit.pins.find((p) => p.viewId === viewId) ?? null;
        setSelectedPin(matchingPin);
      }
    },
    [exhibit],
  );

  // Sync camera whenever the Guided Tour chapter changes
  const handleTourSelect = useCallback(
    (idx: number) => {
      setTourIndex(idx);
      const chapter = exhibit.tour[idx];
      if (chapter) flyToViewId(chapter.viewId, false);
    },
    [exhibit.tour, flyToViewId],
  );

  const handleStartTour = () => {
    setSelectedPin(null);
    setTourActive(true);
    setTourIndex(0);
    const first = exhibit.tour[0];
    if (first) flyToViewId(first.viewId, false);
  };

  const handleResetView = () => {
    setTourActive(false);
    setSelectedPin(null);
    flyToViewId(exhibit.views[0].id, false);
  };

  const handlePinClick = (pin: SubsystemPin) => {
    setTourActive(false);
    setSelectedPin(pin);
    flyToViewId(pin.viewId, false);
  };

  const handleRunPecDemo = () => {
    setParams((p) => ({
      ...p,
      maskType: 'euv',
      pecEnabled: false,
      doseUcCm2: 45,
    }));
    setDataOpen(true);
    setLeftPanel('controls');
  };

  const activeView =
    exhibit.views.find((v) => v.id === activeViewId) ?? exhibit.views[0];

  return (
    <div className="museum-shell">
      <canvas ref={canvasRef} className="viewport-canvas" />

      {/* Top Banner */}
      <header className="top-banner">
        <div className="brand-group">
          <span className="exhibit-pill">E-Beam Museum</span>
          <div className="title-stack">
            <h1>
              {exhibit.name} · {exhibit.era}
            </h1>
            <p>{exhibit.subtitle}</p>
          </div>
        </div>

        <div className="banner-actions">
          <select
            className="hud-select"
            aria-label="Select machine exhibit"
            value={machineId}
            onChange={(e) => setMachineId(e.target.value as MachineId)}
          >
            {EXHIBIT_CATALOG.map((entry) => (
              <option
                key={entry.id}
                value={entry.id}
                disabled={!entry.available}
              >
                {entry.label}
              </option>
            ))}
          </select>

          <button
            className={`hud-btn ${tourActive ? 'active' : ''}`}
            onClick={() => (tourActive ? setTourActive(false) : handleStartTour())}
            title="Start interactive guided camera tour"
          >
            <Compass size={14} />
            {tourActive ? 'Exit guide' : 'Start guide'}
          </button>

          <button
            className={`hud-btn ${leftPanel === 'controls' ? 'active' : ''}`}
            onClick={() =>
              setLeftPanel((p) => (p === 'controls' ? 'none' : 'controls'))
            }
            title="Toggle Experiment Controls drawer"
          >
            <SlidersHorizontal size={14} />
            Controls
          </button>

          <button
            className={`hud-btn ${leftPanel === 'learn' ? 'active' : ''}`}
            onClick={() =>
              setLeftPanel((p) => (p === 'learn' ? 'none' : 'learn'))
            }
            title="Open Physics & Engineering Guide"
          >
            <BookOpen size={14} />
            Learn
          </button>

          <button
            className={`hud-btn ${dataOpen ? 'active' : ''}`}
            onClick={() => setDataOpen((o) => !o)}
            title="Toggle Live Instruments Data drawer"
          >
            <Activity size={14} />
            Data
          </button>

          <button
            className={`hud-btn ${params.running ? 'active' : ''}`}
            onClick={() => setParams((p) => ({ ...p, running: !p.running }))}
            title={params.running ? 'Pause simulation' : 'Play simulation'}
          >
            {params.running ? <Pause size={15} /> : <Play size={15} />}
          </button>

          <button
            className="hud-btn icon-only"
            onClick={handleResetView}
            title="Reset camera view"
          >
            <RotateCcw size={15} />
          </button>

          <button
            className="hud-btn icon-only"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title="Toggle dark / light theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Top-Left Viewport Toolbar */}
      <aside className="viewport-toolbar">
        <span className="toolbar-label">Subsystem View</span>
        <select
          className="hud-select"
          aria-label="Camera subsystem view"
          value={activeViewId}
          onChange={(e) => {
            setTourActive(false);
            flyToViewId(e.target.value, true);
          }}
        >
          {exhibit.views.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>

        <span className="toolbar-label" style={{ marginTop: 4 }}>
          Render Layers
        </span>
        <div className="toggle-row">
          <button
            className={`hud-btn ${params.xray ? 'active' : ''}`}
            onClick={() => setParams((p) => ({ ...p, xray: !p.xray }))}
            title="Toggle X-ray vacuum shell cutaway"
          >
            <Eye size={13} />
            X-ray
          </button>
          <button
            className={`hud-btn ${params.showBeam ? 'active' : ''}`}
            onClick={() => setParams((p) => ({ ...p, showBeam: !p.showBeam }))}
            title="Toggle electron beam paths"
          >
            <Zap size={13} />
            Beam
          </button>
          <button
            className={`hud-btn ${params.showLabels ? 'active' : ''}`}
            onClick={() =>
              setParams((p) => ({ ...p, showLabels: !p.showLabels }))
            }
            title="Toggle 3D subsystem labels"
          >
            <Tag size={13} />
            Labels
          </button>
        </div>

        <span className="toolbar-label" style={{ marginTop: 4 }}>
          Camera Zoom
        </span>
        <div className="zoom-row">
          <button
            className="hud-btn"
            onClick={() => engineRef.current?.zoom(0.8)}
            title="Zoom in"
          >
            <Plus size={14} />
          </button>
          <button
            className="hud-btn"
            onClick={() => engineRef.current?.zoom(1.25)}
            title="Zoom out"
          >
            <Minus size={14} />
          </button>
          <button
            className="hud-btn"
            onClick={handleResetView}
            title="Reset camera"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </aside>

      {/* Left Collapsible Slot: Controls OR Educational Guide */}
      <ControlsDrawer
        open={leftPanel === 'controls'}
        onClose={() => setLeftPanel('none')}
        params={params}
        onChange={setParams}
        onResampleNoise={() => setNoiseSeed((s) => s + 1)}
      />

      <LearnDrawer
        open={leftPanel === 'learn'}
        onClose={() => setLeftPanel('none')}
        machineId={machineId}
        onJumpToView={(viewId) => {
          setTourActive(false);
          flyToViewId(viewId, true);
        }}
        onRunPecDemo={handleRunPecDemo}
      />

      {/* Right Collapsible Live Data Instruments Drawer */}
      <DataDrawer
        open={dataOpen}
        onClose={() => setDataOpen(false)}
        machineId={machineId}
        params={params}
        profile={exposureProfile}
        metrics={resistMetrics}
        scanState={scanStateRef.current}
        noiseSeed={noiseSeed}
      />

      {/* 3D Projected Subsystem Pins */}
      {params.showLabels && (
        <div className="pins-layer">
          {exhibit.pins.map((pin) => (
            <button
              key={pin.id}
              ref={(el) => {
                pinElRefs.current[pin.id] = el;
              }}
              className={`pin-btn ${selectedPin?.id === pin.id ? 'selected' : ''}`}
              onClick={() => handlePinClick(pin)}
            >
              <span className="pin-dot" />
              {pin.label}
            </button>
          ))}
        </div>
      )}

      {/* Guided Camera Journey Overlay */}
      <TourOverlay
        active={tourActive}
        chapters={exhibit.tour}
        currentIndex={tourIndex}
        onSelectIndex={handleTourSelect}
        onExit={() => setTourActive(false)}
      />

      {/* Subsystem Inspector Card (hidden during Guided Tour) */}
      {selectedPin && !tourActive && (
        <section
          className="inspector-card"
          style={{ right: dataOpen ? 360 : 14 }}
        >
          <div className="inspector-header">
            <span className="inspector-tag">Subsystem Inspector</span>
            <button
              className="hud-btn icon-only"
              style={{ width: 26, height: 26 }}
              onClick={() => setSelectedPin(null)}
              aria-label="Close inspector"
            >
              <X size={13} />
            </button>
          </div>
          <h2>{selectedPin.label}</h2>
          <p>{selectedPin.summary}</p>
        </section>
      )}

      {/* Bottom Scale Caption */}
      <footer className="scale-footer">
        <strong>{activeView.label}</strong> · {activeView.scaleCaption}
      </footer>
    </div>
  );
}

export default App;
