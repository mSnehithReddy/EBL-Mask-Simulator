import type * as THREE from 'three';
import type { StageScanState } from '../sim/scanState';

export type MachineId = 'mbmw' | 'vsb';

export interface CameraPreset {
  id: string;
  label: string;
  scaleCaption: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface SubsystemPin {
  id: string;
  label: string;
  viewId: string;
  position: [number, number, number];
  summary: string;
}

export interface TourChapter {
  id: string;
  title: string;
  viewId: string;
  caption: string;
  durationSec: number;
}

export interface SimulationParams {
  running: boolean;
  speed: number;
  voltageKv: number;       // 50 - 100 keV
  doseUcCm2: number;       // exposure dose in uC/cm^2
  pecEnabled: boolean;     // Proximity Effect Correction toggle
  maskType: 'euv' | 'optical';
  patternComplexity: 'manhattan' | 'curvilinear';
  xray: boolean;
  showBeam: boolean;
  showLabels: boolean;
}

export interface MachineSceneHandle {
  root: THREE.Group;
  update(
    dt: number,
    elapsed: number,
    params: SimulationParams,
    scan: StageScanState,
  ): void;
  setXray(enabled: boolean): void;
  setBeamVisible(visible: boolean): void;
  dispose(): void;
}

/**
 * Shared contract implemented by every mask-writer exhibit (MBMW, VSB, etc.)
 * so the 3D SceneEngine, live instruments, and museum HUD remain machine-agnostic.
 */
export interface MachineExhibit {
  id: MachineId;
  name: string;
  subtitle: string;
  era: string;
  defaultParams: Partial<SimulationParams>;
  views: CameraPreset[];
  pins: SubsystemPin[];
  tour: TourChapter[];
  buildScene(): MachineSceneHandle;
}
