import { RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import type { SimulationParams } from '../machines/types';

interface ControlsDrawerProps {
  open: boolean;
  onClose: () => void;
  params: SimulationParams;
  onChange: (updater: (prev: SimulationParams) => SimulationParams) => void;
  onResampleNoise: () => void;
}

const SPEED_OPTIONS = [0.25, 1, 2, 5];

export function ControlsDrawer({
  open,
  onClose,
  params,
  onChange,
  onResampleNoise,
}: ControlsDrawerProps) {
  if (!open) return null;

  return (
    <aside className="side-drawer left-drawer" aria-label="Experiment controls">
      <div className="drawer-header">
        <div className="drawer-title">
          <SlidersHorizontal size={15} />
          <span>Experiment Parameters</span>
        </div>
        <button
          className="hud-btn icon-only"
          style={{ width: 28, height: 28 }}
          onClick={onClose}
          aria-label="Close controls drawer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="drawer-body">
        <div className="control-section">
          <span className="section-heading">Operate</span>

          <div className="control-row">
            <div className="control-label-line">
              <span>Simulation Speed</span>
              <span className="mono-val">{params.speed}×</span>
            </div>
            <div className="pill-group">
              {SPEED_OPTIONS.map((spd) => (
                <button
                  key={spd}
                  className={`pill-btn ${params.speed === spd ? 'active' : ''}`}
                  onClick={() => onChange((p) => ({ ...p, speed: spd }))}
                >
                  {spd}×
                </button>
              ))}
            </div>
          </div>

          <div className="control-row">
            <div className="control-label-line">
              <span>Accelerating Voltage</span>
              <span className="mono-val">{params.voltageKv} keV</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={params.voltageKv}
              onChange={(e) =>
                onChange((p) => ({ ...p, voltageKv: Number(e.target.value) }))
              }
            />
            <p className="control-hint">
              Higher voltage tightens forward scatter (α) but increases backscatter range (β).
            </p>
          </div>

          <div className="control-row">
            <div className="control-label-line">
              <span>Exposure Dose</span>
              <span className="mono-val">{params.doseUcCm2} µC/cm²</span>
            </div>
            <input
              type="range"
              min={15}
              max={90}
              step={1}
              value={params.doseUcCm2}
              onChange={(e) =>
                onChange((p) => ({ ...p, doseUcCm2: Number(e.target.value) }))
              }
            />
            <p className="control-hint">
              Higher dose cuts stochastic 3σ LER roughness, at the cost of longer write time.
            </p>
          </div>
        </div>

        <div className="control-section">
          <span className="section-heading">Mask Stack &amp; Correction</span>

          <div className="control-row">
            <div className="control-label-line">
              <span>6025 Mask Blank</span>
            </div>
            <div className="pill-group two-col">
              <button
                className={`pill-btn ${params.maskType === 'euv' ? 'active' : ''}`}
                onClick={() => onChange((p) => ({ ...p, maskType: 'euv' }))}
              >
                EUV (TaBN / MoSi)
              </button>
              <button
                className={`pill-btn ${params.maskType === 'optical' ? 'active' : ''}`}
                onClick={() => onChange((p) => ({ ...p, maskType: 'optical' }))}
              >
                Optical (Cr / Quartz)
              </button>
            </div>
          </div>

          <div className="control-row">
            <div className="control-label-line">
              <span>Mask Pattern Complexity</span>
            </div>
            <div className="pill-group two-col">
              <button
                className={`pill-btn ${params.patternComplexity === 'manhattan' ? 'active' : ''}`}
                onClick={() =>
                  onChange((p) => ({ ...p, patternComplexity: 'manhattan' }))
                }
              >
                Manhattan (Rect)
              </button>
              <button
                className={`pill-btn ${params.patternComplexity === 'curvilinear' ? 'active' : ''}`}
                onClick={() =>
                  onChange((p) => ({ ...p, patternComplexity: 'curvilinear' }))
                }
              >
                Curvilinear / ILT
              </button>
            </div>
            <p className="control-hint">
              Curvilinear EUV masks fracture into trillions of tiny VSB shots (&gt;35 h), while MBMW write time stays constant (~10.5 h).
            </p>
          </div>

          <div className="control-row">
            <div className="control-label-line">
              <span>Proximity Effect Correction (PEC)</span>
              <span className={`status-chip ${params.pecEnabled ? 'ok' : 'warn'}`}>
                {params.pecEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <button
              className={`hud-btn full-width ${params.pecEnabled ? 'active' : ''}`}
              onClick={() =>
                onChange((p) => ({ ...p, pecEnabled: !p.pecEnabled }))
              }
            >
              {params.pecEnabled
                ? 'Disable PEC (See Backscatter Error)'
                : 'Enable PEC (Equalize Dense vs. Iso)'}
            </button>
          </div>

          <button className="hud-btn full-width" onClick={onResampleNoise}>
            <RefreshCw size={14} />
            Resample Electron Shot Noise
          </button>
        </div>

        <div className="experiment-tip">
          <strong>Try this:</strong> Open the <strong>Data</strong> drawer, switch
          to <strong>EUV</strong> mask, and toggle <strong>PEC OFF</strong> to watch
          high-Z Mo/Si backscattering over-expose dense lines while starving the
          isolated 40 nm line.
        </div>
      </div>
    </aside>
  );
}
