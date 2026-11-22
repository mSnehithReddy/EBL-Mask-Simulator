export interface StageScanState {
  progress: number;       // 0 .. 1 overall mask scan progress
  totalStripes: number;
  stripeIndex: number;    // 0 .. totalStripes - 1
  stripeFrac: number;     // 0 .. 1 within current stripe
  /** Normalized beam position on the mask blank (-1..+1) */
  normX: number;
  normZ: number;
}

export function createInitialScanState(totalStripes = 16): StageScanState {
  return updateSerpentineScan(
    {
      progress: 0,
      totalStripes,
      stripeIndex: 0,
      stripeFrac: 0,
      normX: -1,
      normZ: -1,
    },
    0,
  );
}

/**
 * Advances a shared serpentine stripe scan in-place so the 3D stage and
 * 2D 6" Mask Write-Field Map stay 100% frame-synchronized.
 */
export function updateSerpentineScan(
  state: StageScanState,
  deltaProgress: number,
): StageScanState {
  const p = (state.progress + deltaProgress) % 1;
  const exact = p * state.totalStripes;
  const stripeIndex = Math.min(state.totalStripes - 1, Math.floor(exact));
  const stripeFrac = exact - stripeIndex;
  const isForward = stripeIndex % 2 === 0;

  // Normalized coordinates of the active beam spot on the mask blank (-1 .. +1)
  const normX = ((stripeIndex + 0.5) / state.totalStripes) * 2 - 1;
  const normZ = isForward ? stripeFrac * 2 - 1 : (1 - stripeFrac) * 2 - 1;

  state.progress = p;
  state.stripeIndex = stripeIndex;
  state.stripeFrac = stripeFrac;
  state.normX = normX;
  state.normZ = normZ;
  return state;
}
