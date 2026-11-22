import { Activity, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { MaskMapCanvas } from '../instruments/MaskMapCanvas';
import { PsfCanvas } from '../instruments/PsfCanvas';
import { ResistPreviewCanvas } from '../instruments/ResistPreviewCanvas';
import type { MachineId, SimulationParams } from '../machines/types';
import type { ExposureProfile, ResistMetrics } from '../sim/ebeamPhysics';
import type { StageScanState } from '../sim/scanState';

interface DataDrawerProps {
  open: boolean;
  onClose: () => void;
  machineId: MachineId;
  params: SimulationParams;
  profile: ExposureProfile;
  metrics: ResistMetrics;
  scanState: StageScanState;
  noiseSeed: number;
}

export function DataDrawer({
  open,
  onClose,
  machineId,
  params,
  profile,
  metrics,
  scanState,
  noiseSeed,
}: DataDrawerProps) {
  if (!open) return null;

  const hasDefect = metrics.bridgingDefect || metrics.underexposedDefect;

  return (
    <aside className="side-drawer right-drawer" aria-label="Live instruments">
      <div className="drawer-header">
        <div className="drawer-title">
          <Activity size={15} />
          <span>Live Instruments</span>
        </div>
        <button
          className="hud-btn icon-only"
          style={{ width: 28, height: 28 }}
          onClick={onClose}
          aria-label="Close data drawer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="drawer-body">
        {/* Status Banner */}
        <div className={`defect-banner ${hasDefect ? 'defect' : 'clean'}`}>
          {hasDefect ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          <span>
            {metrics.bridgingDefect
              ? 'Dense Line Bridging (Over-exposed / Backscatter)'
              : metrics.underexposedDefect
                ? 'Under-exposed Feature (Increase Dose or Enable PEC)'
                : 'Within CD Spec · Target 40 nm (4× Mask = 10 nm Wafer)'}
          </span>
        </div>

        {/* Live Telemetry Grid */}
        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Fwd α / Back β</span>
            <span className="metric-val">
              {metrics.psf.alphaNm} nm / {metrics.psf.betaUm} µm
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Backscatter η</span>
            <span className="metric-val">{metrics.psf.eta.toFixed(2)}</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Dense / Iso CD</span>
            <span className="metric-val">
              {metrics.denseCdNm} / {metrics.isoCdNm} nm
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">3σ LER · Write</span>
            <span className="metric-val">
              {metrics.ler3SigmaNm} nm · {metrics.estWriteTimeHrs} h
            </span>
          </div>
        </div>

        {/* MBMW vs. VSB Write-Time Scaling Comparison */}
        <div className="compare-card">
          <div className="instrument-title-row">
            <span>Write-Time Comparison</span>
            <span className="mono-val">
              {params.patternComplexity === 'curvilinear'
                ? 'CURVILINEAR / ILT'
                : 'MANHATTAN'}
            </span>
          </div>
          <div className="compare-bars">
            <div className="compare-row">
              <span className={`compare-name ${machineId === 'mbmw' ? 'active' : ''}`}>
                MBMW
              </span>
              <div className="compare-track">
                <div
                  className="compare-fill mbmw"
                  style={{
                    width: `${Math.min(100, (metrics.mbmwWriteTimeHrs / 50) * 100)}%`,
                  }}
                />
              </div>
              <span className="mono-val">{metrics.mbmwWriteTimeHrs} h</span>
            </div>
            <div className="compare-row">
              <span className={`compare-name ${machineId === 'vsb' ? 'active' : ''}`}>
                VSB
              </span>
              <div className="compare-track">
                <div
                  className={`compare-fill vsb ${metrics.vsbWriteTimeHrs > 22 ? 'slow' : ''}`}
                  style={{
                    width: `${Math.min(100, (metrics.vsbWriteTimeHrs / 50) * 100)}%`,
                  }}
                />
              </div>
              <span className="mono-val">{metrics.vsbWriteTimeHrs} h</span>
            </div>
          </div>
          <p className="compare-caption">{metrics.shotStrategyLabel}</p>
        </div>

        {/* Instrument 1: Aerial Deposited Energy & PSF */}
        <div className="instrument-block">
          <div className="instrument-title-row">
            <span>Deposited Energy &amp; Proximity Effect</span>
            <span className="mono-val">ΔCD {metrics.cdErrorNm} nm</span>
          </div>
          <PsfCanvas profile={profile} pecEnabled={params.pecEnabled} />
        </div>

        {/* Instrument 2: Developed Resist & Etched Mask Cross-Section */}
        <div className="instrument-block">
          <div className="instrument-title-row">
            <span>Developed Resist &amp; Mask Stack</span>
            <span className="mono-val">
              {params.maskType === 'euv' ? 'EUV 4×' : 'OPTICAL 4×'}
            </span>
          </div>
          <ResistPreviewCanvas
            profile={profile}
            metrics={metrics}
            maskType={params.maskType}
            noiseSeed={noiseSeed}
          />
        </div>

        {/* Instrument 3: 6-Inch Mask Blank Write-Field Map */}
        <div className="instrument-block">
          <div className="instrument-title-row">
            <span>6" Mask Write-Field Scan</span>
            <span className="mono-val">{params.voltageKv} keV</span>
          </div>
          <MaskMapCanvas
            scanState={scanState}
            maskType={params.maskType}
            machineId={machineId}
          />
        </div>
      </div>
    </aside>
  );
}
