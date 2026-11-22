import * as THREE from 'three';

/**
 * Procedural 512x512 texture for the Silicon MEMS Aperture Array Plate (AAP).
 */
export function createApertureArrayTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Silicon substrate base
  ctx.fillStyle = '#253142';
  ctx.fillRect(0, 0, size, size);

  // Brushed metallic gold frame border
  ctx.strokeStyle = '#d4a942';
  ctx.lineWidth = 22;
  ctx.strokeRect(18, 18, size - 36, size - 36);

  // Inner etched silicon membrane
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(54, 54, size - 108, size - 108);

  // Dense micro-aperture grid (24x24 visible cells representing 512x512 = 262,144)
  const cells = 24;
  const pad = 74;
  const span = size - pad * 2;
  const step = span / cells;

  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      const x = pad + i * step + step * 0.22;
      const y = pad + j * step + step * 0.22;
      const w = step * 0.56;
      ctx.fillStyle = '#38bdf8';
      ctx.globalAlpha = 0.72;
      ctx.fillRect(x, y, w, w);
    }
  }
  ctx.globalAlpha = 1;

  // Precision alignment fiducial crosses at corners
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  const corners = [
    [42, 42],
    [size - 42, 42],
    [42, size - 42],
    [size - 42, size - 42],
  ];
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Procedural 512x512 texture for the CMOS Blanking Array Plate (BAP) with bond pads & data buses.
 */
export function createCmosBlankerTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Dark ceramic / silicon die background
  ctx.fillStyle = '#182232';
  ctx.fillRect(0, 0, size, size);

  // High-speed copper/gold data traces radiating to the center blanker array
  ctx.strokeStyle = '#c88a36';
  ctx.lineWidth = 2;
  for (let i = 0; i < 32; i++) {
    const t = 56 + (i / 31) * (size - 112);
    // Horizontal traces
    ctx.beginPath();
    ctx.moveTo(22, t);
    ctx.lineTo(size - 22, t);
    ctx.stroke();
    // Vertical traces
    ctx.beginPath();
    ctx.moveTo(t, 22);
    ctx.lineTo(t, size - 22);
    ctx.stroke();
  }

  // Gold wire-bond pads around the perimeter
  ctx.fillStyle = '#eab308';
  for (let i = 0; i < 24; i++) {
    const pos = 44 + (i / 23) * (size - 88);
    ctx.fillRect(pos - 4, 14, 8, 16);
    ctx.fillRect(pos - 4, size - 30, 8, 16);
    ctx.fillRect(14, pos - 4, 16, 8);
    ctx.fillRect(size - 30, pos - 4, 16, 8);
  }

  // Central CMOS deflector array window
  ctx.fillStyle = '#0c1624';
  ctx.fillRect(112, 112, size - 224, size - 224);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.strokeRect(112, 112, size - 224, size - 224);

  // Micro-deflector electrode pairs inside the array
  const n = 16;
  const span = size - 248;
  const step = span / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = 124 + i * step;
      const y = 124 + j * step;
      ctx.fillStyle = (i + j) % 2 === 0 ? '#38bdf8' : '#f59e0b';
      ctx.fillRect(x + 2, y + 3, step * 0.35, step * 0.55);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(x + step * 0.52, y + 3, step * 0.25, step * 0.55);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Procedural 512x512 texture for a 6025 (6-inch) EUV Photomask Blank with reticle die grid & ILT patterns.
 */
export function createEuvMaskTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Iridescent dark TaBN / MoSi multilayer base
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#0c2738');
  grad.addColorStop(0.5, '#133a54');
  grad.addColorStop(1, '#1e2948');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Outer black-border exclusion zone
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, size - 40, size - 40);

  // Active 104mm x 132mm EUV reticle quality area (scaled to 6025 152.4mm blank)
  const qx = 76;
  const qy = 56;
  const qw = size - 152;
  const qh = size - 112;
  ctx.fillStyle = '#091a28';
  ctx.fillRect(qx, qy, qw, qh);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(qx, qy, qw, qh);

  // 4x6 semiconductor die array with fine metal/curvilinear-style circuit lines
  const cols = 4;
  const rows = 6;
  const dw = qw / cols;
  const dh = qh / rows;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const dx = qx + c * dw;
      const dy = qy + r * dh;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(dx + 4, dy + 4, dw - 8, dh - 8);

      // Fine dense lines inside each die
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      for (let k = 0; k < 5; k++) {
        ctx.fillRect(dx + 8, dy + 9 + k * 9, dw - 16, 3);
      }
      ctx.fillStyle = 'rgba(125, 211, 252, 0.35)';
      ctx.fillRect(dx + 10, dy + 10, dw * 0.36, dh * 0.42);
    }
  }

  // Mask alignment marks & optical barcode strip on the edge
  ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
  for (let i = 0; i < 28; i++) {
    if (i % 3 !== 0) ctx.fillRect(140 + i * 8, size - 36, 4, 10);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
