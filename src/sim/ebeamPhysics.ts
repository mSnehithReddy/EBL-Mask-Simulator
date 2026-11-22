export type MaskStackType = 'euv' | 'optical';
export type PatternComplexity = 'manhattan' | 'curvilinear';

export interface PhysicsInput {
  voltageKv: number;       // 50 - 100 keV
  doseUcCm2: number;       // 15 - 90 uC/cm^2
  pecEnabled: boolean;
  maskType: MaskStackType;
  machineId?: 'mbmw' | 'vsb';
  patternComplexity?: PatternComplexity;
  noiseSeed: number;
}

export interface PsfParams {
  alphaNm: number;         // Forward scattering radius (nm)
  betaUm: number;          // Backscattering radius (um)
  eta: number;             // Backscatter-to-forward energy ratio
}

export interface ExposureProfile {
  /** Spatial coordinate in nm across [-220, +220] */
  xNm: number[];
  /** Target mask pattern (1 = exposed feature, 0 = dark) */
  targetPattern: number[];
  /** Deposited normalized energy (threshold = 1.0) */
  energy: number[];
  /** Applied dose profile after PEC modulation */
  appliedDose: number[];
}

export interface ResistMetrics {
  psf: PsfParams;
  targetCdNm: number;
  denseCdNm: number;
  isoCdNm: number;
  cdErrorNm: number;
  ler3SigmaNm: number;
  estWriteTimeHrs: number;
  mbmwWriteTimeHrs: number;
  vsbWriteTimeHrs: number;
  shotStrategyLabel: string;
  bridgingDefect: boolean;
  underexposedDefect: boolean;
}

const RESIST_CLEAR_DOSE_UC_CM2 = 45; // Nominal 45 uC/cm^2 resist clearing dose

/**
 * Computes physical double-Gaussian PSF parameters for a 6025 photomask blank.
 * Higher accelerating voltage reduces forward scattering (alpha) and expands
 * backscattering radius (beta). EUV TaBN/MoSi stacks have higher Z and thus
 * stronger backscattering (eta) than optical Cr-on-Quartz masks.
 */
export function computePsfParams(
  voltageKv: number,
  maskType: MaskStackType,
): PsfParams {
  const v = Math.max(20, Math.min(120, voltageKv));
  // Forward scatter tightens roughly as ~1/V
  const alphaNm = Number((9.5 * (50 / v)).toFixed(2));
  // Bethe range / backscatter radius scales as ~V^1.7
  const baseBeta = maskType === 'euv' ? 9.2 : 11.4;
  const betaUm = Number((baseBeta * Math.pow(v / 50, 1.65)).toFixed(2));
  // Backscatter-to-forward energy ratio (higher Z absorber+MoSi -> higher eta)
  const eta = maskType === 'euv' ? 0.86 : 0.58;
  return { alphaNm, betaUm, eta };
}

/**
 * Computes a 1D normalized energy deposition profile across a representative
 * 4x photomask test structure: 3 dense 40 nm lines (80 nm pitch) on the left
 * and 1 isolated 40 nm line on the right.
 */
export function computeExposureProfile(input: PhysicsInput): ExposureProfile {
  const psf = computePsfParams(input.voltageKv, input.maskType);
  const doseFactor = input.doseUcCm2 / RESIST_CLEAR_DOSE_UC_CM2;

  // 4x mask features: 3 dense lines at x = -140, -60, +20 (width 40 nm, pitch 80 nm)
  // plus 1 isolated line at x = +155 (width 40 nm)
  const denseCenters = [-140, -60, 20];
  const isoCenter = 155;
  const halfW = 20; // 40 nm target CD on 4x photomask (= 10 nm wafer feature)

  const xNm: number[] = [];
  const targetPattern: number[] = [];
  const energy: number[] = [];
  const appliedDose: number[] = [];

  // Effective background backscatter contribution:
  // Dense array has ~50% local pattern density; isolated line has ~10% local density
  const denseBg = (psf.eta / (1 + psf.eta)) * 0.52;
  const isoBg = (psf.eta / (1 + psf.eta)) * 0.12;
  const fwdWeight = 1 / (1 + psf.eta);

  // PEC scales dense dose down and isolated dose up to equalize edge energy at threshold = 1.0
  const denseDoseMult = input.pecEnabled ? 0.84 : 1.0;
  const isoDoseMult = input.pecEnabled ? 1.24 : 1.0;

  const sigma = Math.max(3.5, psf.alphaNm * 1.15);

  const erfApprox = (z: number) => {
    const sign = z < 0 ? -1 : 1;
    const a = Math.abs(z);
    const t = 1 / (1 + 0.3275911 * a);
    const y =
      1 -
      (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
        0.284496736) *
        t +
        0.254829592) *
        t) *
        Math.exp(-a * a);
    return sign * y;
  };

  const boxConvolve = (x: number, center: number) => {
    const z1 = (x - (center - halfW)) / (Math.SQRT2 * sigma);
    const z2 = (x - (center + halfW)) / (Math.SQRT2 * sigma);
    return 0.5 * (erfApprox(z1) - erfApprox(z2));
  };

  for (let x = -220; x <= 220; x += 2) {
    xNm.push(x);

    const inDense = denseCenters.some((c) => Math.abs(x - c) <= halfW);
    const inIso = Math.abs(x - isoCenter) <= halfW;
    targetPattern.push(inDense || inIso ? 1 : 0);

    const localApplied = inDense
      ? doseFactor * denseDoseMult
      : inIso
        ? doseFactor * isoDoseMult
        : 0;
    appliedDose.push(Number(localApplied.toFixed(3)));

    // Forward-scattered energy from dense + iso features
    let fwd = 0;
    for (const c of denseCenters) {
      fwd += boxConvolve(x, c) * denseDoseMult;
    }
    fwd += boxConvolve(x, isoCenter) * isoDoseMult;

    // Smoothly transitioning backscatter fog between dense zone (left) and iso zone (right)
    const denseBlend = 1 / (1 + Math.exp((x - 85) / 28));
    const rawBg =
      denseBlend * denseBg * denseDoseMult +
      (1 - denseBlend) * isoBg * isoDoseMult;

    // Normalize so a nominal PEC-corrected 45 uC/cm^2 exposure crosses 1.0 right at feature edges
    const normScale = 1.92;
    const totalE = doseFactor * normScale * (fwdWeight * fwd + rawBg);
    energy.push(Number(totalE.toFixed(4)));
  }

  return { xNm, targetPattern, energy, appliedDose };
}

/**
 * Extracts CD, proximity error, stochastic 3-sigma LER, and write-time metrics.
 */
export function computeResistMetrics(input: PhysicsInput): ResistMetrics {
  const psf = computePsfParams(input.voltageKv, input.maskType);
  const profile = computeExposureProfile(input);
  const targetCdNm = 40;

  // Measure center dense line (around x = -60, window [-100, -20])
  const measureWidth = (minX: number, maxX: number) => {
    let count = 0;
    for (let i = 0; i < profile.xNm.length; i++) {
      const x = profile.xNm[i];
      if (x >= minX && x <= maxX && profile.energy[i] >= 1.0) {
        count++;
      }
    }
    return count * 2; // 2 nm step
  };

  const denseCdNm = measureWidth(-100, -20);
  const isoCdNm = measureWidth(115, 195);

  // Check if energy in the space between dense lines (x = -100) exceeds threshold -> bridging
  const spaceIdx = profile.xNm.indexOf(-100);
  const bridgingDefect = spaceIdx >= 0 && profile.energy[spaceIdx] >= 1.0;
  const underexposedDefect = isoCdNm < 24 || denseCdNm < 24;

  // Stochastic 3-sigma Line-Edge Roughness scales as ~1 / sqrt(Dose) (RLS trade-off)
  const baseLer = 2.6 * Math.sqrt(45 / Math.max(10, input.doseUcCm2));
  // Subtle voltage sharpness factor
  const ler3SigmaNm = Number((baseLer * Math.pow(50 / input.voltageKv, 0.2)).toFixed(2));

  // MBMW write time scales linearly with resist dose and is INDEPENDENT of pattern complexity!
  const doseRatio = input.doseUcCm2 / 45;
  const complexity: PatternComplexity = input.patternComplexity ?? 'curvilinear';
  const machineId = input.machineId ?? 'mbmw';

  const mbmwWriteTimeHrs = Number((10.5 * doseRatio).toFixed(1));
  // VSB write time explodes on curvilinear / ILT masks due to massive shot-count fracturing + settling overhead
  const vsbBaseHrs = complexity === 'curvilinear' ? 36.4 : 9.2;
  const vsbWriteTimeHrs = Number(
    (vsbBaseHrs * (0.45 + 0.55 * doseRatio)).toFixed(1),
  );
  const estWriteTimeHrs =
    machineId === 'vsb' ? vsbWriteTimeHrs : mbmwWriteTimeHrs;

  const shotStrategyLabel =
    machineId === 'mbmw'
      ? '262,144 parallel beams (complexity-invariant)'
      : complexity === 'curvilinear'
        ? '~1.9T fractured VSB shots (shot-count bottleneck)'
        : '~140B rectangular VSB shots';

  return {
    psf,
    targetCdNm,
    denseCdNm,
    isoCdNm,
    cdErrorNm: Number(Math.abs(denseCdNm - isoCdNm).toFixed(1)),
    ler3SigmaNm,
    estWriteTimeHrs,
    mbmwWriteTimeHrs,
    vsbWriteTimeHrs,
    shotStrategyLabel,
    bridgingDefect,
    underexposedDefect,
  };
}
