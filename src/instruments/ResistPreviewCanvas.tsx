import { useEffect, useRef } from 'react';
import type {
  ExposureProfile,
  MaskStackType,
  ResistMetrics,
} from '../sim/ebeamPhysics';

interface ResistPreviewCanvasProps {
  profile: ExposureProfile;
  metrics: ResistMetrics;
  maskType: MaskStackType;
  noiseSeed: number;
}

export function ResistPreviewCanvas({
  profile,
  metrics,
  maskType,
  noiseSeed,
}: ResistPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = 296;
    const h = 128;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#090f1a';
    ctx.fillRect(0, 0, w, h);

    // Deterministic pseudo-random helper for stochastic LER visualization
    const rand = (k: number) => {
      const s = Math.sin(k * 12.9898 + noiseSeed * 78.233) * 43758.5453;
      return s - Math.floor(s) - 0.5;
    };

    const padX = 14;
    const plotW = w - padX * 2;
    const topH = 68;
    const topY = 10;

    // Top half: Top-down SEM-like developed resist & absorber etch preview
    ctx.fillStyle = maskType === 'euv' ? '#0c2436' : '#162030';
    ctx.fillRect(padX, topY, plotW, topH);

    const rows = 26;
    const rowH = topH / rows;
    const lerScale = metrics.ler3SigmaNm * 0.032; // converts LER to subtle energy jitter

    for (let r = 0; r < rows; r++) {
      const y = topY + r * rowH;
      for (let i = 0; i < profile.xNm.length - 1; i++) {
        const jitter = rand(r * 31 + i * 7) * lerScale;
        const cleared = profile.energy[i] + jitter >= 1.0;
        if (cleared) {
          const x1 = padX + ((profile.xNm[i] + 220) / 440) * plotW;
          const x2 = padX + ((profile.xNm[i + 1] + 220) / 440) * plotW;
          ctx.fillStyle = metrics.bridgingDefect
            ? 'rgba(248, 113, 113, 0.78)'
            : 'rgba(125, 211, 252, 0.82)';
          ctx.fillRect(x1, y, Math.max(1.2, x2 - x1), rowH + 0.4);
        }
      }
    }

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.strokeRect(padX, topY, plotW, topH);

    // Bottom half: Mask Cross-Section Stack (Absorber + Multilayer/Quartz)
    const crossY = 86;
    const absH = 14;
    const subH = 20;

    // Substrate / MoSi multilayer base
    ctx.fillStyle = maskType === 'euv' ? '#1e3a5f' : '#334155';
    ctx.fillRect(padX, crossY + absH, plotW, subH);
    if (maskType === 'euv') {
      // Fine Mo/Si bilayer stripes
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      for (let b = 0; b < 5; b++) {
        ctx.fillRect(padX, crossY + absH + b * 4, plotW, 1.5);
      }
    }

    // Unetched absorber segments (where energy < 1.0)
    ctx.fillStyle = maskType === 'euv' ? '#b45309' : '#94a3b8';
    for (let i = 0; i < profile.xNm.length - 1; i++) {
      if (profile.energy[i] < 1.0) {
        const x1 = padX + ((profile.xNm[i] + 220) / 440) * plotW;
        const x2 = padX + ((profile.xNm[i + 1] + 220) / 440) * plotW;
        ctx.fillRect(x1, crossY, Math.max(1.2, x2 - x1), absH);
      }
    }

    // Status label
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(
      maskType === 'euv' ? 'TaBN Absorber / 40× MoSi' : 'Cr Absorber / Quartz',
      padX + 6,
      crossY + absH + 13,
    );
  }, [profile, metrics, maskType, noiseSeed]);

  return <canvas ref={canvasRef} className="instrument-canvas" style={{ width: 296, height: 128 }} />;
}
