import { describe, expect, it } from 'vitest';
import {
  computeExposureProfile,
  computePsfParams,
  computeResistMetrics,
} from './ebeamPhysics';

describe('E-Beam Mask Lithography Physics Engine', () => {
  it('reduces forward scattering (alpha) and increases backscatter radius (beta) at higher voltage', () => {
    const p50 = computePsfParams(50, 'euv');
    const p100 = computePsfParams(100, 'euv');
    expect(p100.alphaNm).toBeLessThan(p50.alphaNm);
    expect(p100.betaUm).toBeGreaterThan(p50.betaUm);
  });

  it('gives higher backscatter ratio (eta) for EUV TaBN/MoSi than optical Cr-on-Glass', () => {
    const euv = computePsfParams(50, 'euv');
    const opt = computePsfParams(50, 'optical');
    expect(euv.eta).toBeGreaterThan(opt.eta);
  });

  it('reduces dense-vs-isolated CD proximity error when PEC is enabled', () => {
    const noPec = computeResistMetrics({
      voltageKv: 50,
      doseUcCm2: 45,
      pecEnabled: false,
      maskType: 'euv',
      noiseSeed: 1,
    });
    const withPec = computeResistMetrics({
      voltageKv: 50,
      doseUcCm2: 45,
      pecEnabled: true,
      maskType: 'euv',
      noiseSeed: 1,
    });
    expect(withPec.cdErrorNm).toBeLessThan(noPec.cdErrorNm);
  });

  it('improves 3-sigma LER (lower roughness) at higher dose while increasing write time', () => {
    const lowDose = computeResistMetrics({
      voltageKv: 50,
      doseUcCm2: 20,
      pecEnabled: true,
      maskType: 'euv',
      noiseSeed: 1,
    });
    const highDose = computeResistMetrics({
      voltageKv: 50,
      doseUcCm2: 80,
      pecEnabled: true,
      maskType: 'euv',
      noiseSeed: 1,
    });
    expect(highDose.ler3SigmaNm).toBeLessThan(lowDose.ler3SigmaNm);
    expect(highDose.estWriteTimeHrs).toBeGreaterThan(lowDose.estWriteTimeHrs);
  });

  it('returns aligned arrays from computeExposureProfile', () => {
    const profile = computeExposureProfile({
      voltageKv: 50,
      doseUcCm2: 45,
      pecEnabled: true,
      maskType: 'euv',
      noiseSeed: 1,
    });
    expect(profile.xNm.length).toBeGreaterThan(100);
    expect(profile.energy.length).toBe(profile.xNm.length);
    expect(profile.targetPattern.length).toBe(profile.xNm.length);
  });

  it('keeps MBMW write time constant across pattern complexity while VSB explodes on curvilinear masks', () => {
    const mbmwMan = computeResistMetrics({
      voltageKv: 50,
      doseUcCm2: 45,
      pecEnabled: true,
      maskType: 'euv',
      machineId: 'mbmw',
      patternComplexity: 'manhattan',
      noiseSeed: 1,
    });
    const mbmwCurv = computeResistMetrics({
      voltageKv: 50,
      doseUcCm2: 45,
      pecEnabled: true,
      maskType: 'euv',
      machineId: 'mbmw',
      patternComplexity: 'curvilinear',
      noiseSeed: 1,
    });
    const vsbMan = computeResistMetrics({
      voltageKv: 50,
      doseUcCm2: 45,
      pecEnabled: true,
      maskType: 'euv',
      machineId: 'vsb',
      patternComplexity: 'manhattan',
      noiseSeed: 1,
    });
    const vsbCurv = computeResistMetrics({
      voltageKv: 50,
      doseUcCm2: 45,
      pecEnabled: true,
      maskType: 'euv',
      machineId: 'vsb',
      patternComplexity: 'curvilinear',
      noiseSeed: 1,
    });

    expect(mbmwMan.estWriteTimeHrs).toBe(mbmwCurv.estWriteTimeHrs);
    expect(vsbCurv.estWriteTimeHrs).toBeGreaterThan(vsbMan.estWriteTimeHrs * 3);
    expect(vsbCurv.estWriteTimeHrs).toBeGreaterThan(mbmwCurv.estWriteTimeHrs * 3);
  });
});
