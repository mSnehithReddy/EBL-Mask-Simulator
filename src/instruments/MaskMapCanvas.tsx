import { useEffect, useRef } from 'react';
import type { MachineId } from '../machines/types';
import type { MaskStackType } from '../sim/ebeamPhysics';
import type { StageScanState } from '../sim/scanState';

interface MaskMapCanvasProps {
  scanState: StageScanState;
  maskType: MaskStackType;
  machineId: MachineId;
}

export function MaskMapCanvas({
  scanState,
  maskType,
  machineId,
}: MaskMapCanvasProps) {
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

    let rafId = 0;

    const draw = () => {
      rafId = requestAnimationFrame(draw);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#090f1a';
      ctx.fillRect(0, 0, w, h);

      // 6025 (6-inch) square blank on left
      const box = 104;
      const bx = 18;
      const by = 14;
      ctx.fillStyle = maskType === 'euv' ? '#0f293d' : '#1e293b';
      ctx.fillRect(bx, by, box, box);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(bx, by, box, box);

      // Active 104x132 mm quality area inside blank
      const qx = bx + 14;
      const qy = by + 10;
      const qw = box - 28;
      const qh = box - 20;

      const { totalStripes, stripeIndex, stripeFrac, progress } = scanState;
      const sw = qw / totalStripes;

      for (let s = 0; s < totalStripes; s++) {
        const sx = qx + s * sw;
        if (s < stripeIndex) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.34)';
          ctx.fillRect(sx + 0.5, qy, sw - 1, qh);
        } else if (s === stripeIndex) {
          const isDown = s % 2 === 0;
          const curH = qh * stripeFrac;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
          if (isDown) {
            ctx.fillRect(sx + 0.5, qy, sw - 1, curH);
          } else {
            ctx.fillRect(sx + 0.5, qy + qh - curH, sw - 1, curH);
          }
          // Live multi-beam write head marker synced with 3D stage
          const headY = isDown ? qy + curH : qy + qh - curH;
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(sx - 1, headY - 2.5, sw + 2, 5);
        } else {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
          ctx.fillRect(sx + 0.5, qy, sw - 1, qh);
        }
      }

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(qx, qy, qw, qh);

      // Telemetry text on right half
      const tx = 138;
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText('6025 MASK BLANK', tx, 30);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('Size: 152.4 × 152.4 mm', tx, 50);
      ctx.fillText(
        `Stack: ${maskType === 'euv' ? 'TaBN / 40×MoSi' : 'Cr / Fused Silica'}`,
        tx,
        66,
      );
      ctx.fillText(
        machineId === 'mbmw'
          ? 'Mode: 262,144 parallel beams'
          : 'Mode: Single VSB vector beam',
        tx,
        82,
      );
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(
        `Scan: ${(progress * 100).toFixed(1)}% · Stripe ${stripeIndex + 1}/${totalStripes}`,
        tx,
        104,
      );
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [scanState, maskType, machineId]);

  return (
    <canvas
      ref={canvasRef}
      className="instrument-canvas"
      style={{ width: 296, height: 132 }}
    />
  );
}
