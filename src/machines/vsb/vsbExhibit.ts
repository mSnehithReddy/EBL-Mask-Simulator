import * as THREE from 'three';
import { createEuvMaskTexture } from '../mbmw/textures';
import type {
  MachineExhibit,
  MachineSceneHandle,
  SimulationParams,
} from '../types';

interface VsbShotSpec {
  /** Shaped rectangle width & depth (normalized 0.28..1.0) */
  w: number;
  d: number;
  /** Lateral shift applied at the shaping deflector to carve that rectangle */
  shiftX: number;
  shiftZ: number;
  /** Vector-scan deflection landing offset inside the active sub-field */
  vecX: number;
  vecZ: number;
}

const SHOT_SEQUENCE: VsbShotSpec[] = [
  { w: 0.92, d: 0.28, shiftX: 0.01, shiftZ: 0.065, vecX: -0.09, vecZ: -0.07 },
  { w: 0.3, d: 0.92, shiftX: -0.065, shiftZ: 0.01, vecX: 0.08, vecZ: -0.05 },
  { w: 0.55, d: 0.55, shiftX: 0.04, shiftZ: -0.04, vecX: -0.04, vecZ: 0.06 },
  { w: 0.26, d: 0.34, shiftX: 0.07, shiftZ: 0.06, vecX: 0.1, vecZ: 0.08 },
  { w: 0.85, d: 0.42, shiftX: -0.02, shiftZ: -0.05, vecX: 0.0, vecZ: 0.0 },
  { w: 0.36, d: 0.78, shiftX: 0.058, shiftZ: -0.02, vecX: -0.1, vecZ: 0.03 },
  { w: 0.7, d: 0.26, shiftX: -0.03, shiftZ: 0.07, vecX: 0.05, vecZ: -0.09 },
  { w: 0.42, d: 0.42, shiftX: -0.052, shiftZ: -0.052, vecX: 0.02, vecZ: 0.09 },
];

function createAperturePlateGeometry(
  outerRadius: number,
  holeWidth: number,
  holeHeight: number,
  thickness: number,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

  const hw = holeWidth / 2;
  const hh = holeHeight / 2;
  const hole = new THREE.Path();
  hole.moveTo(-hw, -hh);
  hole.lineTo(hw, -hh);
  hole.lineTo(hw, hh);
  hole.lineTo(-hw, hh);
  hole.closePath();
  shape.holes.push(hole);

  return new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
}

function orientBeamMesh(
  mesh: THREE.Mesh,
  start: THREE.Vector3,
  end: THREE.Vector3,
  scaleX: number,
  scaleZ: number,
): void {
  const dir = new THREE.Vector3().subVectors(end, start);
  const len = Math.max(0.001, dir.length());
  mesh.position.copy(start).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.scale.set(scaleX, len, scaleZ);
}

export const vsbExhibit: MachineExhibit = {
  id: 'vsb',
  name: 'Variable Shaped Beam (VSB) Writer',
  subtitle:
    'NuFlare / JEOL-class 50 keV Single-Beam Variable-Rectangle Photomask Writer',
  era: 'c. 2018',
  defaultParams: {
    running: true,
    speed: 1,
    voltageKv: 50,
    doseUcCm2: 45,
    pecEnabled: true,
    maskType: 'optical',
    patternComplexity: 'curvilinear',
    xray: true,
    showBeam: true,
    showLabels: true,
  },
  views: [
    {
      id: 'whole',
      label: 'Whole machine',
      scaleCaption: 'MACHINE SCALE · 50 keV VARIABLE SHAPED BEAM COLUMN · FALSE COLOR',
      position: [6.2, 4.0, 7.2],
      target: [0, 2.75, 0],
    },
    {
      id: 'source',
      label: 'Electron source (50 keV LaB₆)',
      scaleCaption: 'GUN SCALE · HIGH-CURRENT 50 keV THERMIONIC / SCHOTTKY EMITTER',
      position: [1.9, 5.45, 2.2],
      target: [0, 5.2, 0],
    },
    {
      id: 'aperture-1',
      label: '1st shaping aperture (square)',
      scaleCaption: 'SHAPING SCALE · ROUND BEAM CARVED INTO UNIFORM SQUARE PROFILE',
      position: [1.85, 4.55, 2.15],
      target: [0, 4.38, 0],
    },
    {
      id: 'shaper',
      label: 'Shaping deflector & 2nd aperture',
      scaleCaption: 'OPTICS SCALE · DYNAMIC OVERLAP CARVES VARIABLE RECTANGLE SHOTS',
      position: [1.8, 3.65, 2.1],
      target: [0, 3.48, 0],
    },
    {
      id: 'blanker',
      label: 'High-speed beam blanker',
      scaleCaption: 'BLANKING SCALE · SINGLE-BEAM DEFLECTION DURING VECTOR JUMPS',
      position: [1.75, 2.78, 2.0],
      target: [0, 2.58, 0],
    },
    {
      id: 'deflector',
      label: 'Reduction lens & vector deflector',
      scaleCaption: 'COLUMN SCALE · MAGNETIC DEMAGNIFICATION & FAST X-Y VECTOR SCAN',
      position: [2.3, 1.9, 2.55],
      target: [0, 1.62, 0],
    },
    {
      id: 'stage',
      label: 'Laser stage & 6" mask blank',
      scaleCaption: 'STAGE SCALE · VARIABLE RECTANGLE SHOTS STAMPED ACROSS SUB-FIELD',
      position: [2.1, 1.45, 2.25],
      target: [0, 0.72, 0],
    },
  ],
  pins: [
    {
      id: 'vsb-pin-source',
      label: '50 keV High-Current Gun',
      viewId: 'source',
      position: [0.65, 5.3, 0],
      summary:
        'A high-current 50 keV LaB₆ (or ZrO/W) electron gun delivers intense, uniform illumination to fill the square 1st shaping aperture without sacrificing edge sharpness.',
    },
    {
      id: 'vsb-pin-ap1',
      label: '1st Shaping Aperture',
      viewId: 'aperture-1',
      position: [-0.74, 4.38, 0],
      summary:
        'A precision square silicon/molybdenum aperture slices the circular primary beam into a crisp square cross-section before it enters the electrostatic shaping deflector.',
    },
    {
      id: 'vsb-pin-shaper',
      label: 'Shaping Deflector + 2nd Aperture',
      viewId: 'shaper',
      position: [0.88, 3.48, 0],
      summary:
        'Quadrupole shaping plates laterally shift the square beam over the 2nd shaping aperture. Only the overlapping region passes through—dynamically forming rectangles of any width and height on every shot.',
    },
    {
      id: 'vsb-pin-blanker',
      label: 'Single-Beam Blanker',
      viewId: 'blanker',
      position: [-0.78, 2.58, 0],
      summary:
        'Between individual shots, fast electrostatic blanking plates kick the beam off-axis (amber) into a beam dump while the shaping and vector deflectors settle to the next coordinate.',
    },
    {
      id: 'vsb-pin-deflector',
      label: 'Objective & Vector Deflector',
      viewId: 'deflector',
      position: [0.96, 1.65, 0],
      summary:
        'Twin magnetic reduction lenses demagnify the shaped rectangle onto the mask while high-speed main/sub-field vector deflection coils steer each shot anywhere inside the write field.',
    },
    {
      id: 'vsb-pin-stage',
      label: 'Laser Stage & Vector Sub-Field',
      viewId: 'stage',
      position: [1.18, 0.82, 0.45],
      summary:
        'Each shaped rectangle stamps one piece of the fractured IC layout onto the 6" mask. Simple Manhattan masks finish quickly, while curvilinear EUV masks require trillions of tiny fractured shots (>35 hours).',
    },
  ],
  tour: [
    {
      id: 'vsb-ch-1',
      title: 'How Variable Shaped Beam (VSB) Writes Masks',
      viewId: 'whole',
      caption:
        'For decades, VSB writers were the industry workhorse for photomasks. Instead of 262,144 parallel beams, VSB dynamically reshapes a single intense 50 keV electron beam into variable rectangles.',
      durationSec: 7,
    },
    {
      id: 'vsb-ch-2',
      title: '50 keV High-Current Source',
      viewId: 'source',
      caption:
        'A high-current emitter accelerates electrons to 50 keV, supplying uniform beam density across the upper condenser optics.',
      durationSec: 6,
    },
    {
      id: 'vsb-ch-3',
      title: 'Carving a Square Beam (1st Aperture)',
      viewId: 'aperture-1',
      caption:
        'The circular primary beam passes through a fixed square 1st shaping aperture, emerging with sharp rectilinear edges.',
      durationSec: 6,
    },
    {
      id: 'vsb-ch-4',
      title: 'Dynamic Rectangle Shaping (2nd Aperture)',
      viewId: 'shaper',
      caption:
        'Electrostatic quadrupole plates shift the square beam across the 2nd shaping aperture. The overlap dynamically carves thin strips, tall bars, or small squares for every individual shot.',
      durationSec: 7,
    },
    {
      id: 'vsb-ch-5',
      title: 'Settling & Single-Beam Blanking',
      viewId: 'blanker',
      caption:
        'Between shots, the beam blanker deflects the beam (amber) into a beam dump for nanoseconds while the vector deflection amplifiers settle—creating shot-count overhead on complex masks.',
      durationSec: 6,
    },
    {
      id: 'vsb-ch-6',
      title: 'Vector Stamping & The Curvilinear Bottleneck',
      viewId: 'stage',
      caption:
        'Vector coils steer each shaped rectangle onto the 6" mask. Simple Manhattan shapes need few shots, but curved EUV patterns fracture into billions of tiny rectangles—making MBMW essential.',
      durationSec: 7,
    },
  ],
  buildScene(): MachineSceneHandle {
    const root = new THREE.Group();
    const disposables: Array<{ dispose(): void }> = [];
    const track = <T extends { dispose(): void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    const maskTex = track(createEuvMaskTexture());

    // --- Rich PBR Materials (consistent museum quality with MBMW) ---
    const darkAnodizedMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x1a2333,
        metalness: 0.82,
        roughness: 0.3,
      }),
    );
    const stainlessMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.92,
        roughness: 0.22,
      }),
    );
    const titaniumMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x526277,
        metalness: 0.86,
        roughness: 0.28,
      }),
    );
    const graniteMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x111722,
        metalness: 0.12,
        roughness: 0.58,
      }),
    );
    const copperCoilMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xd97736,
        metalness: 0.92,
        roughness: 0.18,
      }),
    );
    const goldMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xe5b94c,
        metalness: 0.94,
        roughness: 0.18,
      }),
    );
    const ceramicMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.05,
        roughness: 0.28,
      }),
    );
    const tungstenMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x3b4758,
        metalness: 0.88,
        roughness: 0.36,
      }),
    );
    const cableMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.35,
        roughness: 0.72,
      }),
    );
    const maskTopMat = track(
      new THREE.MeshPhysicalMaterial({
        map: maskTex,
        metalness: 0.65,
        roughness: 0.12,
        iridescence: 0.75,
        iridescenceIOR: 1.45,
      }),
    );

    // Emissive HDR materials for selective UnrealBloom
    const cathodeGlowMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        emissive: 0x38bdf8,
        emissiveIntensity: 3.4,
        roughness: 0.1,
      }),
    );
    const greenLedMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        emissive: 0x22c55e,
        emissiveIntensity: 2.6,
      }),
    );
    const redLaserMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xfca5a5,
        emissive: 0xef4444,
        emissiveIntensity: 3.2,
        transparent: true,
        opacity: 0.92,
      }),
    );

    const vacuumShellMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x94a3b8,
        metalness: 0.68,
        roughness: 0.22,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const xrayEdgeMat = track(
      new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.36,
      }),
    );

    // VSB Single-Beam Glow Materials (distinct electric cyan-violet tint + amber blanking)
    const primaryBeamMat = track(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.36,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const shapedBeamMat = track(
      new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.68,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const blankedBeamMat = track(
      new THREE.MeshBasicMaterial({
        color: 0xfb923c,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );

    // =========================================================
    // 1. VIBRATION-ISOLATED GRANITE BASE & STAGE CHAMBER
    // =========================================================
    const baseGroup = new THREE.Group();
    root.add(baseGroup);

    const footOffsets: [number, number][] = [
      [-1.42, -1.24],
      [1.42, -1.24],
      [-1.42, 1.24],
      [1.42, 1.24],
    ];
    const footPadGeo = track(new THREE.CylinderGeometry(0.22, 0.25, 0.08, 24));
    const footBellowGeo = track(new THREE.CylinderGeometry(0.16, 0.18, 0.16, 24));
    for (const [fx, fz] of footOffsets) {
      const pad = new THREE.Mesh(footPadGeo, stainlessMat);
      pad.position.set(fx, 0.04, fz);
      baseGroup.add(pad);
      const bellow = new THREE.Mesh(footBellowGeo, darkAnodizedMat);
      bellow.position.set(fx, 0.16, fz);
      baseGroup.add(bellow);
    }

    const granite = new THREE.Mesh(
      track(new THREE.BoxGeometry(3.32, 0.26, 2.98)),
      graniteMat,
    );
    granite.position.set(0, 0.36, 0);
    baseGroup.add(granite);

    const trimRing = new THREE.Mesh(
      track(new THREE.BoxGeometry(3.38, 0.05, 3.04)),
      titaniumMat,
    );
    trimRing.position.set(0, 0.24, 0);
    baseGroup.add(trimRing);

    const railGeo = track(new THREE.BoxGeometry(2.4, 0.045, 0.09));
    for (const rz of [-0.62, 0.62]) {
      const rail = new THREE.Mesh(railGeo, stainlessMat);
      rail.position.set(0, 0.51, rz);
      baseGroup.add(rail);
    }

    const chamberWallGeo = track(new THREE.BoxGeometry(3.1, 0.88, 2.78));
    const chamberWall = new THREE.Mesh(chamberWallGeo, vacuumShellMat);
    chamberWall.position.set(0, 0.93, 0);
    baseGroup.add(chamberWall);
    const chamberWire = new THREE.LineSegments(
      track(new THREE.EdgesGeometry(chamberWallGeo)),
      xrayEdgeMat,
    );
    chamberWire.position.copy(chamberWall.position);
    baseGroup.add(chamberWire);

    // Precision X-Y Stage Carriage (100% synced with StageScanState)
    const stageGroup = new THREE.Group();
    stageGroup.position.set(0, 0.59, 0);
    root.add(stageGroup);

    const stageCarriage = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.58, 0.12, 1.58)),
      darkAnodizedMat,
    );
    stageGroup.add(stageCarriage);

    const clampGeo = track(new THREE.BoxGeometry(0.12, 0.07, 0.12));
    for (const [cx, cz] of [
      [-0.52, -0.52],
      [0.52, -0.52],
      [-0.52, 0.52],
      [0.52, 0.52],
    ]) {
      const clamp = new THREE.Mesh(clampGeo, goldMat);
      clamp.position.set(cx, 0.08, cz);
      stageGroup.add(clamp);
    }

    const mirrorX = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.055, 0.11, 1.38)),
      stainlessMat,
    );
    mirrorX.position.set(0.81, 0.01, 0);
    stageGroup.add(mirrorX);

    const mirrorZ = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.38, 0.11, 0.055)),
      stainlessMat,
    );
    mirrorZ.position.set(0, 0.01, 0.81);
    stageGroup.add(mirrorZ);

    const maskBlank = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.98, 0.055, 0.98)),
      [titaniumMat, titaniumMat, maskTopMat, titaniumMat, titaniumMat, titaniumMat],
    );
    maskBlank.position.set(0, 0.095, 0);
    stageGroup.add(maskBlank);

    // Glowing Variable-Rectangle VSB Shot Stamp on Mask Surface
    const writeShotMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xa5f3fc,
        emissive: 0x22d3ee,
        emissiveIntensity: 3.6,
        transparent: true,
        opacity: 0.95,
      }),
    );
    const writeShot = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.12, 0.12)),
      writeShotMat,
    );
    writeShot.rotation.x = -Math.PI / 2;
    writeShot.position.set(0, 0.718, 0);
    root.add(writeShot);

    // Active sub-field outline on the mask showing the vector deflection range
    const subfieldWire = new THREE.LineSegments(
      track(new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.28, 0.28))),
      track(
        new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.5,
        }),
      ),
    );
    subfieldWire.rotation.x = -Math.PI / 2;
    subfieldWire.position.set(0, 0.715, 0);
    root.add(subfieldWire);

    // Laser-Interferometer Heads & Red He-Ne Measurement Beams
    const buildInterferometerHead = (pos: [number, number, number], rotY: number) => {
      const g = new THREE.Group();
      g.position.set(...pos);
      g.rotation.y = rotY;
      const body = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.22, 0.15, 0.18)),
        darkAnodizedMat,
      );
      g.add(body);
      const lens = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.032, 0.032, 0.05, 16)),
        stainlessMat,
      );
      lens.rotation.z = Math.PI / 2;
      lens.position.x = -0.12;
      g.add(lens);
      const led = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.016, 10, 10)),
        greenLedMat,
      );
      led.position.set(0.04, 0.08, 0.05);
      g.add(led);
      return g;
    };
    root.add(buildInterferometerHead([1.4, 0.6, 0], 0));
    root.add(buildInterferometerHead([0, 0.6, 1.28], -Math.PI / 2));

    const ifBeamX = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.009, 0.009, 0.58, 10)),
      redLaserMat,
    );
    ifBeamX.rotation.z = Math.PI / 2;
    ifBeamX.position.set(1.1, 0.6, 0);
    root.add(ifBeamX);

    const ifBeamZ = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.009, 0.009, 0.46, 10)),
      redLaserMat,
    );
    ifBeamZ.rotation.x = Math.PI / 2;
    ifBeamZ.position.set(0, 0.6, 1.04);
    root.add(ifBeamZ);

    // =========================================================
    // 2. OUTER VACUUM COLUMN, BOLTED FLANGES & TURBO PUMP
    // =========================================================
    const columnShell = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.8, 0.84, 3.74, 48, 1, true)),
      vacuumShellMat,
    );
    columnShell.position.set(0, 3.22, 0);
    root.add(columnShell);

    const rodGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 3.65, 12));
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const rod = new THREE.Mesh(rodGeo, stainlessMat);
      rod.position.set(Math.cos(ang) * 0.87, 3.18, Math.sin(ang) * 0.87);
      root.add(rod);
    }

    const flangeHeights = [1.38, 2.34, 3.68, 4.92];
    const flangeHoleGeo = track(new THREE.TorusGeometry(0.84, 0.044, 12, 48));
    const boltsPerFlange = 16;
    const boltGeo = track(new THREE.CylinderGeometry(0.021, 0.021, 0.1, 6));
    const boltInst = new THREE.InstancedMesh(
      boltGeo,
      stainlessMat,
      flangeHeights.length * boltsPerFlange,
    );
    const dummy = new THREE.Object3D();
    let boltIdx = 0;
    for (const fy of flangeHeights) {
      const ring = new THREE.Mesh(flangeHoleGeo, titaniumMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = fy;
      root.add(ring);
      for (let b = 0; b < boltsPerFlange; b++) {
        const ang = (b / boltsPerFlange) * Math.PI * 2;
        dummy.position.set(Math.cos(ang) * 0.85, fy, Math.sin(ang) * 0.85);
        dummy.rotation.set(0, ang, 0);
        dummy.updateMatrix();
        boltInst.setMatrixAt(boltIdx++, dummy.matrix);
      }
    }
    boltInst.instanceMatrix.needsUpdate = true;
    root.add(boltInst);

    // Side-mounted Turbomolecular Vacuum Pump (on +X/-Z to distinguish silhouette slightly)
    const turboGroup = new THREE.Group();
    turboGroup.position.set(-1.14, 2.9, -0.32);
    turboGroup.rotation.y = 0.25;
    root.add(turboGroup);
    const turboNeck = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.17, 0.17, 0.5, 24)),
      stainlessMat,
    );
    turboNeck.rotation.z = Math.PI / 2;
    turboNeck.position.x = 0.17;
    turboGroup.add(turboNeck);
    const turboBody = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.23, 0.23, 0.6, 28)),
      darkAnodizedMat,
    );
    turboBody.position.set(-0.14, -0.14, 0);
    turboGroup.add(turboBody);
    const finGeo = track(new THREE.TorusGeometry(0.245, 0.015, 8, 28));
    for (let f = 0; f < 6; f++) {
      const fin = new THREE.Mesh(finGeo, stainlessMat);
      fin.rotation.x = Math.PI / 2;
      fin.position.set(-0.14, -0.35 + f * 0.082, 0);
      turboGroup.add(fin);
    }
    const turboLed = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.02, 10, 10)),
      greenLedMat,
    );
    turboLed.position.set(-0.14, 0.16, 0.21);
    turboGroup.add(turboLed);

    // =========================================================
    // 3. MAGNETIC REDUCTION LENS & VECTOR DEFLECTION COILS (y = 1.05 -> 2.28)
    // =========================================================
    const buildMagneticLens = (y: number, outerR: number, innerR: number, h: number) => {
      const g = new THREE.Group();
      g.position.y = y;
      const yoke = new THREE.Mesh(
        track(
          new THREE.CylinderGeometry(
            outerR,
            outerR,
            h,
            40,
            1,
            true,
            Math.PI * 0.18,
            Math.PI * 1.64,
          ),
        ),
        darkAnodizedMat,
      );
      g.add(yoke);
      const poleGeo = track(new THREE.RingGeometry(innerR, outerR, 40));
      const topPole = new THREE.Mesh(poleGeo, stainlessMat);
      topPole.rotation.x = -Math.PI / 2;
      topPole.position.y = h / 2;
      g.add(topPole);
      const botPole = new THREE.Mesh(poleGeo, stainlessMat);
      botPole.rotation.x = Math.PI / 2;
      botPole.position.y = -h / 2;
      g.add(botPole);
      const bore = new THREE.Mesh(
        track(new THREE.CylinderGeometry(innerR, innerR, h, 32, 1, true)),
        titaniumMat,
      );
      g.add(bore);
      const coilR = (outerR + innerR) * 0.5;
      const turnGeo = track(new THREE.TorusGeometry(coilR, 0.04, 14, 44));
      for (let i = -2; i <= 2; i++) {
        const turn = new THREE.Mesh(turnGeo, copperCoilMat);
        turn.rotation.x = Math.PI / 2;
        turn.position.y = i * (h * 0.17);
        g.add(turn);
      }
      return g;
    };

    // Lower objective lens + Upper demagnification lens
    root.add(buildMagneticLens(1.26, 0.66, 0.22, 0.42));
    root.add(buildMagneticLens(2.02, 0.68, 0.24, 0.42));

    // High-speed Main & Sub-Field Vector Deflection Saddle Coils (y = 1.64)
    const vecDeflGroup = new THREE.Group();
    vecDeflGroup.position.y = 1.64;
    const saddleGeo = track(new THREE.BoxGeometry(0.08, 0.24, 0.16));
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const coil = new THREE.Mesh(saddleGeo, goldMat);
      coil.position.set(Math.cos(ang) * 0.31, 0, Math.sin(ang) * 0.31);
      coil.rotation.y = -ang + Math.PI / 2;
      vecDeflGroup.add(coil);
    }
    root.add(vecDeflGroup);

    // =========================================================
    // 4. HIGH-SPEED SINGLE-BEAM BLANKER & BEAM DUMP (y = 2.58)
    // =========================================================
    const blankerGroup = new THREE.Group();
    blankerGroup.position.y = 2.58;
    const blankPlateGeo = track(new THREE.BoxGeometry(0.04, 0.26, 0.24));
    for (const side of [-1, 1]) {
      const bp = new THREE.Mesh(blankPlateGeo, goldMat);
      bp.position.set(side * 0.16, 0.1, 0);
      blankerGroup.add(bp);
    }
    // Blanking aperture plate + side tungsten beam dump cup
    const blankApGeo = track(createAperturePlateGeometry(0.58, 0.16, 0.16, 0.05));
    const blankAp = new THREE.Mesh(blankApGeo, tungstenMat);
    blankAp.rotation.x = Math.PI / 2;
    blankAp.position.y = -0.08;
    blankerGroup.add(blankAp);

    const dumpCup = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.09, 0.11, 0.1, 20)),
      track(
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf97316,
          emissiveIntensity: 1.1,
          metalness: 0.7,
          roughness: 0.3,
        }),
      ),
    );
    dumpCup.position.set(0.28, -0.07, 0);
    blankerGroup.add(dumpCup);
    root.add(blankerGroup);

    // =========================================================
    // 5. 2ND SHAPING APERTURE (y = 3.22) & QUADRUPOLE SHAPING DEFLECTOR (y = 3.82)
    // =========================================================
    const ap2Geo = track(createAperturePlateGeometry(0.62, 0.22, 0.22, 0.055));
    const ap2 = new THREE.Mesh(ap2Geo, tungstenMat);
    ap2.rotation.x = Math.PI / 2;
    ap2.position.y = 3.24;
    root.add(ap2);

    // Glowing cyan outline around the 2nd shaping aperture opening
    const ap2Frame = new THREE.LineSegments(
      track(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.22, 0.06, 0.22))),
      xrayEdgeMat,
    );
    ap2Frame.position.y = 3.22;
    root.add(ap2Frame);

    // Electrostatic Quadrupole Shaping Deflector (4 gold plates + ceramic insulators)
    const shaperGroup = new THREE.Group();
    shaperGroup.position.y = 3.82;
    const qPlateGeo = track(new THREE.BoxGeometry(0.24, 0.34, 0.04));
    const qInsGeo = track(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 12));
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const plate = new THREE.Mesh(qPlateGeo, goldMat);
      plate.position.set(Math.sin(ang) * 0.25, 0, Math.cos(ang) * 0.25);
      plate.rotation.y = ang;
      shaperGroup.add(plate);

      const ins = new THREE.Mesh(qInsGeo, ceramicMat);
      ins.rotation.x = Math.PI / 2;
      ins.rotation.z = -ang;
      ins.position.set(Math.sin(ang) * 0.34, 0, Math.cos(ang) * 0.34);
      shaperGroup.add(ins);
    }
    root.add(shaperGroup);

    // =========================================================
    // 6. 1ST SHAPING APERTURE (SQUARE) (y = 4.38) & CONDENSER RING (y = 4.68)
    // =========================================================
    const ap1Geo = track(createAperturePlateGeometry(0.6, 0.22, 0.22, 0.055));
    const ap1 = new THREE.Mesh(ap1Geo, goldMat);
    ap1.rotation.x = Math.PI / 2;
    ap1.position.y = 4.4;
    root.add(ap1);

    const condRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.45, 0.055, 18, 44)),
      copperCoilMat,
    );
    condRing.rotation.x = Math.PI / 2;
    condRing.position.y = 4.68;
    root.add(condRing);

    // =========================================================
    // 7. 50 keV HIGH-CURRENT ELECTRON GUN (y = 4.95 -> 6.1)
    // =========================================================
    const gunGroup = new THREE.Group();
    root.add(gunGroup);

    for (let i = 0; i < 5; i++) {
      const y = 5.04 + i * 0.135;
      const rib = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.46, 0.46, 0.075, 36)),
        ceramicMat,
      );
      rib.position.y = y;
      gunGroup.add(rib);
      const coronaRing = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.46, 0.016, 10, 36)),
        stainlessMat,
      );
      coronaRing.rotation.x = Math.PI / 2;
      coronaRing.position.y = y + 0.04;
      gunGroup.add(coronaRing);
    }

    const hvCap = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.34, 0.5, 0.26, 36)),
      darkAnodizedMat,
    );
    hvCap.position.y = 5.76;
    gunGroup.add(hvCap);

    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 5.88, 0),
      new THREE.Vector3(0, 6.26, -0.15),
      new THREE.Vector3(-0.68, 6.28, -0.42),
      new THREE.Vector3(-1.25, 5.75, -0.58),
      new THREE.Vector3(-1.42, 4.45, -0.62),
    ]);
    const hvCable = new THREE.Mesh(
      track(new THREE.TubeGeometry(cableCurve, 32, 0.055, 14, false)),
      cableMat,
    );
    gunGroup.add(hvCable);

    const emitterTip = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.068, 0.17, 18)),
      cathodeGlowMat,
    );
    emitterTip.rotation.x = Math.PI;
    emitterTip.position.y = 4.97;
    gunGroup.add(emitterTip);

    const gunLight = new THREE.PointLight(0x38bdf8, 2.2, 3.8);
    gunLight.position.set(0, 4.82, 0);
    gunGroup.add(gunLight);

    // =========================================================
    // 8. LIVE VARIABLE-SHAPED ELECTRON BEAM + STREAMING PARTICLES
    // =========================================================
    const beamGroup = new THREE.Group();
    root.add(beamGroup);

    // Segment A: Round cone from Gun (4.94) -> 1st Square Aperture (4.38)
    const upperCone = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.03, 0.17, 0.56, 28, 1, true)),
      primaryBeamMat,
    );
    upperCone.position.y = 4.66;
    beamGroup.add(upperCone);

    // Unit-height box geometry reused for dynamically shaped rectangular beam segments
    const unitBoxGeo = track(new THREE.BoxGeometry(1, 1, 1));

    // Segment B: Square beam shifted laterally by shaping deflector (4.38 -> 3.22)
    const shapedUpperBeam = new THREE.Mesh(unitBoxGeo, primaryBeamMat);
    beamGroup.add(shapedUpperBeam);

    // Segment C: Variable-rectangle beam carved by 2nd aperture (3.22 -> 2.58 blanker)
    const carvedMidBeam = new THREE.Mesh(unitBoxGeo, shapedBeamMat);
    beamGroup.add(carvedMidBeam);

    // Segment D (Blanked): Amber deflected beam into side dump (2.68 -> dumpCup)
    const blankedBeam = new THREE.Mesh(unitBoxGeo, blankedBeamMat);
    beamGroup.add(blankedBeam);

    // Segment E (Active): Shaped beam converging through reduction lens (2.58 -> 1.64 vector deflector)
    const lowerLensBeam = new THREE.Mesh(unitBoxGeo, shapedBeamMat);
    beamGroup.add(lowerLensBeam);

    // Segment F (Active): Vector-deflected beam stamping the 6" mask (1.64 -> mask)
    const vectorSweepBeam = new THREE.Mesh(unitBoxGeo, shapedBeamMat);
    beamGroup.add(vectorSweepBeam);

    // 220 Streaming Electron Particles following the live VSB trajectory
    const particleCount = 220;
    const pPositions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);
    const pProgress = new Float32Array(particleCount);
    const pJitterX = new Float32Array(particleCount);
    const pJitterZ = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      pProgress[i] = Math.random();
      pJitterX[i] = Math.random() - 0.5;
      pJitterZ[i] = Math.random() - 0.5;
    }

    const particleGeo = track(new THREE.BufferGeometry());
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    const particleMat = track(
      new THREE.PointsMaterial({
        size: 0.055,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const electronPoints = new THREE.Points(particleGeo, particleMat);
    beamGroup.add(electronPoints);

    // Working vectors
    const pGun = new THREE.Vector3(0, 4.94, 0);
    const pAp1 = new THREE.Vector3(0, 4.38, 0);
    const pAp2Shifted = new THREE.Vector3(0, 3.22, 0);
    const pAp2Center = new THREE.Vector3(0, 3.22, 0);
    const pBlanker = new THREE.Vector3(0, 2.66, 0);
    const pDump = new THREE.Vector3(0.28, 2.52, 0);
    const pDeflector = new THREE.Vector3(0, 1.64, 0);
    const pMaskLanding = new THREE.Vector3(0, 0.72, 0);
    const tmpPos = new THREE.Vector3();

    const applyShotState = (
      elapsed: number,
      dt: number,
      complexity: SimulationParams['patternComplexity'],
    ) => {
      // Curvilinear patterns fracture into much faster, smaller shots!
      const shotRate = complexity === 'curvilinear' ? 3.2 : 1.5;
      const cycle = elapsed * shotRate;
      const shotIdx = Math.floor(cycle) % SHOT_SEQUENCE.length;
      const shotFrac = cycle - Math.floor(cycle);
      const spec = SHOT_SEQUENCE[shotIdx];

      // Last 22% of each shot cycle is blanking + deflector settling time
      const isBlanked = shotFrac > 0.78;
      const sizeScale = complexity === 'curvilinear' ? 0.62 : 1.0;
      const rectW = Math.max(0.04, 0.18 * spec.w * sizeScale);
      const rectD = Math.max(0.04, 0.18 * spec.d * sizeScale);

      // 1. Shift square beam between Ap1 -> Ap2
      pAp2Shifted.set(spec.shiftX, 3.22, spec.shiftZ);
      orientBeamMesh(shapedUpperBeam, pAp1, pAp2Shifted, 0.2, 0.2);

      // 2. Carved variable rectangle exits Ap2 -> Blanker
      orientBeamMesh(carvedMidBeam, pAp2Center, pBlanker, rectW, rectD);

      // 3. Blanked vs Active path below Blanker
      blankedBeam.visible = isBlanked;
      lowerLensBeam.visible = !isBlanked;
      vectorSweepBeam.visible = !isBlanked;
      writeShot.visible = !isBlanked && beamGroup.visible;

      if (isBlanked) {
        orientBeamMesh(blankedBeam, pBlanker, pDump, rectW * 0.75, rectD * 0.75);
      } else {
        pMaskLanding.set(spec.vecX, 0.72, spec.vecZ);
        orientBeamMesh(lowerLensBeam, pBlanker, pDeflector, rectW * 0.55, rectD * 0.55);
        orientBeamMesh(
          vectorSweepBeam,
          pDeflector,
          pMaskLanding,
          rectW * 0.42,
          rectD * 0.42,
        );
        writeShot.position.set(spec.vecX, 0.718, spec.vecZ);
        writeShot.scale.set(spec.w * sizeScale, spec.d * sizeScale, 1);
        writeShotMat.emissiveIntensity = 3.0 + Math.sin(shotFrac * Math.PI) * 1.4;
      }

      // 4. Stream electron particles along the live shaped & steered path
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = particleGeo.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < particleCount; i++) {
        pProgress[i] = (pProgress[i] + dt * 0.65) % 1;
        const t = pProgress[i];
        let r = 0.42;
        let g = 1.45;
        let bl = 1.95;

        if (t < 0.16) {
          tmpPos.lerpVectors(pGun, pAp1, t / 0.16);
          tmpPos.x += pJitterX[i] * 0.12 * (t / 0.16);
          tmpPos.z += pJitterZ[i] * 0.12 * (t / 0.16);
        } else if (t < 0.4) {
          tmpPos.lerpVectors(pAp1, pAp2Shifted, (t - 0.16) / 0.24);
          tmpPos.x += pJitterX[i] * 0.18;
          tmpPos.z += pJitterZ[i] * 0.18;
        } else if (t < 0.55) {
          tmpPos.lerpVectors(pAp2Center, pBlanker, (t - 0.4) / 0.15);
          tmpPos.x += pJitterX[i] * rectW;
          tmpPos.z += pJitterZ[i] * rectD;
        } else if (isBlanked) {
          tmpPos.lerpVectors(pBlanker, pDump, Math.min(1, (t - 0.55) / 0.2));
          r = 1.95;
          g = 0.85;
          bl = 0.2;
        } else if (t < 0.78) {
          tmpPos.lerpVectors(pBlanker, pDeflector, (t - 0.55) / 0.23);
          tmpPos.x += pJitterX[i] * rectW * 0.48;
          tmpPos.z += pJitterZ[i] * rectD * 0.48;
        } else {
          tmpPos.lerpVectors(pDeflector, pMaskLanding, (t - 0.78) / 0.22);
          tmpPos.x += pJitterX[i] * rectW * 0.35;
          tmpPos.z += pJitterZ[i] * rectD * 0.35;
        }

        posAttr.setXYZ(i, tmpPos.x, tmpPos.y, tmpPos.z);
        colAttr.setXYZ(i, r, g, bl);
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    };

    applyShotState(0, 0.016, 'curvilinear');

    return {
      root,
      update(dt: number, elapsed: number, params: SimulationParams, scan) {
        // Sync 3D stage directly to the shared serpentine stripe scan
        const scanX = -scan.normX * 0.34;
        const scanZ = -scan.normZ * 0.34;
        stageGroup.position.x = scanX;
        stageGroup.position.z = scanZ;

        const xGap = Math.max(0.12, 1.38 - (scanX + 0.81));
        ifBeamX.scale.y = xGap / 0.58;
        ifBeamX.position.x = 1.38 - xGap / 2;

        const zGap = Math.max(0.12, 1.26 - (scanZ + 0.81));
        ifBeamZ.scale.y = zGap / 0.46;
        ifBeamZ.position.z = 1.26 - zGap / 2;

        applyShotState(elapsed, dt, params.patternComplexity);
      },
      setXray(enabled: boolean) {
        vacuumShellMat.opacity = enabled ? 0.14 : 0.92;
        vacuumShellMat.depthWrite = !enabled;
        xrayEdgeMat.opacity = enabled ? 0.36 : 0.12;
      },
      setBeamVisible(visible: boolean) {
        beamGroup.visible = visible;
        writeShot.visible = visible;
        subfieldWire.visible = visible;
      },
      dispose() {
        for (const item of disposables) {
          item.dispose();
        }
      },
    };
  },
};
