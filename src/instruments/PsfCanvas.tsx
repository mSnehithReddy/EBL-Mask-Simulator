import { useEffect, useRef } from 'react';
import type { ExposureProfile } from '../sim/ebeamPhysics';

interface PsfCanvasProps {
  profile: ExposureProfile;
  pecEnabled: boolean;
}

export function PsfCanvas({ profile, pecEnabled }: PsfCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = 296;
    const h = 132;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#090f1a';
    ctx.fillRect(0, 0, w, h);

    const padL = 26;
    const padR = 10;
    const padT = 14;
    const padB = 22;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const maxE = 2.4;

    const xToPx = (x: number) => padL + ((x + 220) / 440) * plotW;
    const eToPy = (e: number) => padT + plotH - (Math.min(e, maxE) / maxE) * plotH;

    // Subtle horizontal grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    for (const val of [0.5, 1.0, 1.5, 2.0]) {
      const py = eToPy(val);
      ctx.beginPath();
      ctx.moveTo(padL, py);
      ctx.lineTo(w - padR, py);
      ctx.stroke();
    }

    // Target pattern shaded bands
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    for (let i = 0; i < profile.xNm.length - 1; i++) {
      if (profile.targetPattern[i] > 0) {
        const x1 = xToPx(profile.xNm[i]);
        const x2 = xToPx(profile.xNm[i + 1]);
        ctx.fillRect(x1, padT, Math.max(1, x2 - x1), plotH);
      }
    }

    // Resist clearing threshold dashed line (E = 1.0)
    const threshY = eToPy(1.0);
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padL, threshY);
    ctx.lineTo(w - padR, threshY);
    ctx.stroke();
    ctx.restore();

    // Deposited energy waveform
    ctx.strokeStyle = pecEnabled ? '#38bdf8' : '#fb923c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < profile.xNm.length; i++) {
      const px = xToPx(profile.xNm[i]);
      const py = eToPy(profile.energy[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('1.0', 4, threshY + 3);
    ctx.fillText('Dense (80nm pitch)', padL + 8, h - 6);
    ctx.fillText('Iso 40nm', w - 66, h - 6);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('Threshold', w - 64, threshY - 4);
  }, [profile, pecEnabled]);

  return <canvas ref={canvasRef} className="instrument-canvas" style={{ width: 296, height: 132 }} />;
}
