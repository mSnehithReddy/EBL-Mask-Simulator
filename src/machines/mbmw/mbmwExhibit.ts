import * as THREE from 'three';
import type {
  MachineExhibit,
  MachineSceneHandle,
  SimulationParams,
} from '../types';
import {
  createApertureArrayTexture,
  createCmosBlankerTexture,
  createEuvMaskTexture,
} from './textures';

interface BeamletEntry {
  u: number;
  v: number;
  pAap: THREE.Vector3;
  pBap: THREE.Vector3;
  pStopOn: THREE.Vector3;
  pStopOff: THREE.Vector3;
  pMask: THREE.Vector3;
  upperMesh: THREE.Mesh;
  midOnMesh: THREE.Mesh;
  midOffMesh: THREE.Mesh;
  lowerMesh: THREE.Mesh;
  phaseOffset: number;
  isOn: boolean;
}

function createCylinderBetween(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radiusTop: number,
  radiusBottom: number,
  material: THREE.Material,
  radialSegments = 10,
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    len,
    radialSegments,
    1,
    true,
  );
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

export const mbmwExhibit: MachineExhibit = {
  id: 'mbmw',
  name: 'Multi-Beam Mask Writer (MBMW)',
  subtitle: 'IMS-class 50 keV Parallel Electron-Beam Photomask Writer · EUV & Optical Masks',
  era: 'c. 2024',
  defaultParams: {
    running: true,
    speed: 1,
    voltageKv: 50,
    doseUcCm2: 45,
    pecEnabled: true,
    maskType: 'euv',
    xray: true,
    showBeam: true,
    showLabels: true,
  },
  views: [
    {
      id: 'whole',
      label: 'Whole machine',
      scaleCaption: 'MACHINE SCALE · 50 keV MULTI-BEAM COLUMN · FALSE COLOR',
      position: [6.2, 4.0, 7.2],
      target: [0, 2.75, 0],
    },
    {
      id: 'source',
      label: 'Electron source (50 keV)',
      scaleCaption: 'GUN SCALE · THERMAL FIELD EMISSION (SCHOTTKY) CATHODE',
      position: [1.9, 5.45, 2.2],
      target: [0, 5.2, 0],
    },
    {
      id: 'condenser',
      label: 'Condenser optics',
      scaleCaption: 'OPTICS SCALE · ELECTROSTATIC BEAM EXPANSION & COLLIMATION',
      position: [2.0, 4.5, 2.3],
      target: [0, 4.32, 0],
    },
    {
      id: 'aap-bap',
      label: 'Aperture & blanking array',
      scaleCaption: 'MEMS SCALE · 262,144 PROGRAMMABLE SUB-BEAMS (AAP + CMOS BAP)',
      position: [1.75, 3.62, 2.0],
      target: [0, 3.35, 0],
    },
    {
      id: 'stopping',
      label: 'Stopping plate (beam dump)',
      scaleCaption: 'OPTICS SCALE · ON/OFF ELECTROSTATIC DEFLECTION FILTER',
      position: [1.75, 2.8, 2.0],
      target: [0, 2.55, 0],
    },
    {
      id: 'projection',
      label: '200× reduction optics',
      scaleCaption: 'COLUMN SCALE · MAGNETIC PROJECTION LENSES & OCTUPOLE STEERING',
      position: [2.3, 1.9, 2.55],
      target: [0, 1.62, 0],
    },
    {
      id: 'stage',
      label: 'Laser stage & 6" mask blank',
      scaleCaption: 'STAGE SCALE · 6025 (152.4 mm) EUV MASK BLANK & INTERFEROMETER',
      position: [2.1, 1.45, 2.25],
      target: [0, 0.72, 0],
    },
  ],
  pins: [
    {
      id: 'pin-source',
      label: '50 keV Electron Gun',
      viewId: 'source',
      position: [0.65, 5.3, 0],
      summary:
        'A high-brightness 50 keV Thermal Field Emission (Schottky) gun extracts electrons through an electrostatic anode stack, forming a broad, uniform primary beam inside an ultra-high vacuum (<10⁻⁹ mbar).',
    },
    {
      id: 'pin-condenser',
      label: 'Condenser Optics',
      viewId: 'condenser',
      position: [-0.76, 4.35, 0],
      summary:
        'Multi-electrode electrostatic condenser lenses suspended on precision ceramic standoffs expand and collimate the primary beam to uniformly illuminate the entire Aperture Array Plate.',
    },
    {
      id: 'pin-aap-bap',
      label: 'AAP + CMOS Blanker (262k beams)',
      viewId: 'aap-bap',
      position: [0.88, 3.35, 0],
      summary:
        'The silicon Aperture Array Plate (AAP) splits one broad beam into 262,144 parallel sub-beams. Directly below, a wire-bonded CMOS Blanking Array Plate (BAP) switches every beam ON or OFF via a multi-Tbps data path.',
    },
    {
      id: 'pin-stopping',
      label: 'Stopping Plate',
      viewId: 'stopping',
      position: [-0.8, 2.55, 0],
      summary:
        'Undeflected "ON" beams (cyan) pass cleanly through the central pinhole at the 2nd cross-over. Deflected "OFF" beams (amber) strike the finned tungsten stopping plate and are safely dumped.',
    },
    {
      id: 'pin-projection',
      label: '200× Reduction Optics',
      viewId: 'projection',
      position: [0.96, 1.65, 0],
      summary:
        'Twin water-cooled magnetic projection lenses and an 8-pole octupole deflector demagnify the multi-beam array by 200×—shrinking micron-scale MEMS apertures down to ~10–20 nm pixels at the mask surface.',
    },
    {
      id: 'pin-stage',
      label: 'Laser Stage & 6" Mask Blank',
      viewId: 'stage',
      position: [1.18, 0.82, 0.45],
      summary:
        'A continuous-moving air-bearing stage on linear-motor rails, tracked by sub-nanometer He-Ne laser interferometers, scans the 6025 (6-inch) EUV mask blank beneath the stationary multi-beam writing field.',
    },
  ],
  tour: [
    {
      id: 'ch-1',
      title: 'Why Multi-Beam Mask Writing?',
      viewId: 'whole',
      caption:
        'Modern EUV lithography masks use complex curvilinear patterns. Multi-Beam Mask Writers fire 262,144 parallel electron beams so write time stays constant regardless of pattern complexity.',
      durationSec: 7,
    },
    {
      id: 'ch-2',
      title: '50 keV Schottky Electron Source',
      viewId: 'source',
      caption:
        'A high-brightness Thermal Field Emission cathode accelerates electrons to 50 keV inside an ultra-high vacuum column, forming a uniform primary beam.',
      durationSec: 6,
    },
    {
      id: 'ch-3',
      title: 'Condenser Beam Expansion',
      viewId: 'condenser',
      caption:
        'Electrostatic condenser ring electrodes expand and collimate the single primary beam so it illuminates the entire MEMS Aperture Array Plate evenly.',
      durationSec: 6,
    },
    {
      id: 'ch-4',
      title: 'Splitting Into 262,144 Beams',
      viewId: 'aap-bap',
      caption:
        'The Aperture Array Plate carves the broad beam into a dense grid of micro-beams, while the CMOS Blanking Array switches every pixel beam ON or OFF at multi-Tbps speeds.',
      durationSec: 7,
    },
    {
      id: 'ch-5',
      title: 'ON/OFF Filtering at the Stopping Plate',
      viewId: 'stopping',
      caption:
        'Deflected "OFF" beams (amber) strike the tungsten stopping plate and are dumped; undeflected "ON" beams (cyan) pass cleanly through the central pinhole.',
      durationSec: 6,
    },
    {
      id: 'ch-6',
      title: '200× Reduction & 6" EUV Mask Scanning',
      viewId: 'stage',
      caption:
        'Twin magnetic lenses shrink the beam array 200× onto the resist-coated 6025 EUV mask blank gliding smoothly on a laser-interferometer air-bearing stage.',
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

    // --- Procedural High-Res Textures ---
    const aapTex = track(createApertureArrayTexture());
    const bapTex = track(createCmosBlankerTexture());
    const maskTex = track(createEuvMaskTexture());

    // --- Rich PBR Materials ---
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
    const aapSurfaceMat = track(
      new THREE.MeshStandardMaterial({
        map: aapTex,
        metalness: 0.78,
        roughness: 0.2,
      }),
    );
    const bapSurfaceMat = track(
      new THREE.MeshStandardMaterial({
        map: bapTex,
        metalness: 0.72,
        roughness: 0.22,
      }),
    );
    const maskTopMat = track(
      new THREE.MeshPhysicalMaterial({
        map: maskTex,
        metalness: 0.65,
        roughness: 0.12,
        iridescence: 0.85,
        iridescenceIOR: 1.45,
      }),
    );

    // Emissive HDR materials (trigger selective UnrealBloom!)
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

    // Outer vacuum shell (solid vs. X-ray glass)
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

    // Electron beam materials (emissive additive glow)
    const primaryBeamMat = track(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const beamOnMat = track(
      new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const beamOffMat = track(
      new THREE.MeshBasicMaterial({
        color: 0xfb923c,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    // =========================================================
    // 1. VIBRATION-ISOLATED GRANITE BASE & STAGE CHAMBER
    // =========================================================
    const baseGroup = new THREE.Group();
    root.add(baseGroup);

    // 4 Pneumatic Active Vibration Isolators (tiered cylinders + rubber bellows)
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

    // Precision Granite Metrology Slab + Stainless Trim
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

    // Precision Linear-Motor Stage Rails inside chamber
    const railGeo = track(new THREE.BoxGeometry(2.4, 0.045, 0.09));
    for (const rz of [-0.62, 0.62]) {
      const rail = new THREE.Mesh(railGeo, stainlessMat);
      rail.position.set(0, 0.51, rz);
      baseGroup.add(rail);
    }

    // Lower Vacuum Chamber Walls (X-ray toggleable)
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

    // Precision X-Y Stage Carriage (animated in update)
    const stageGroup = new THREE.Group();
    stageGroup.position.set(0, 0.59, 0);
    root.add(stageGroup);

    const stageCarriage = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.58, 0.12, 1.58)),
      darkAnodizedMat,
    );
    stageGroup.add(stageCarriage);

    // Chuck clamps at 4 corners of the 6-inch mask blank
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

    // Zerodur Interferometer Mirrors (+X and +Z edges)
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

    // 6025 (6-inch) EUV Mask Blank with micro-patterned reticle texture
    const maskMaterials = [
      titaniumMat,
      titaniumMat,
      maskTopMat,
      titaniumMat,
      titaniumMat,
      titaniumMat,
    ];
    const maskBlank = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.98, 0.055, 0.98)),
      maskMaterials,
    );
    maskBlank.position.set(0, 0.095, 0);
    stageGroup.add(maskBlank);

    // Glowing active multi-beam write field on mask surface
    const writeSpotMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x38bdf8,
        emissiveIntensity: 3.2,
        transparent: true,
        opacity: 0.9,
      }),
    );
    const writeSpot = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.11, 0.11)),
      writeSpotMat,
    );
    writeSpot.rotation.x = -Math.PI / 2;
    writeSpot.position.set(0, 0.716, 0);
    root.add(writeSpot);

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
    // 2. OUTER VACUUM COLUMN, BOLTED CF FLANGES & TURBO PUMP
    // =========================================================
    const columnShellGeo = track(
      new THREE.CylinderGeometry(0.86, 0.9, 3.74, 48, 1, true),
    );
    const columnShell = new THREE.Mesh(columnShellGeo, vacuumShellMat);
    columnShell.position.set(0, 3.22, 0);
    root.add(columnShell);

    // 4 Vertical Stainless Structural Tie-Rods around the column
    const rodGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 3.65, 12));
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const rod = new THREE.Mesh(rodGeo, stainlessMat);
      rod.position.set(Math.cos(ang) * 0.92, 3.18, Math.sin(ang) * 0.92);
      root.add(rod);
    }

    // Bolted CF Vacuum Flanges (with instanced hex bolts!)
    const flangeHeights = [1.38, 2.36, 3.78, 4.92];
    const flangeRingGeo = track(new THREE.CylinderGeometry(0.95, 0.95, 0.075, 48, 1, false));
    const flangeHoleGeo = track(new THREE.TorusGeometry(0.9, 0.045, 12, 48));
    const boltsPerFlange = 16;
    const boltGeo = track(new THREE.CylinderGeometry(0.022, 0.022, 0.105, 6));
    const boltInst = new THREE.InstancedMesh(
      boltGeo,
      stainlessMat,
      flangeHeights.length * boltsPerFlange,
    );
    track(boltGeo);
    const dummy = new THREE.Object3D();
    let boltIdx = 0;

    for (const fy of flangeHeights) {
      const ring = new THREE.Mesh(flangeHoleGeo, titaniumMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = fy;
      root.add(ring);

      for (let b = 0; b < boltsPerFlange; b++) {
        const ang = (b / boltsPerFlange) * Math.PI * 2;
        dummy.position.set(Math.cos(ang) * 0.91, fy, Math.sin(ang) * 0.91);
        dummy.rotation.set(0, ang, 0);
        dummy.updateMatrix();
        boltInst.setMatrixAt(boltIdx++, dummy.matrix);
      }
    }
    boltInst.instanceMatrix.needsUpdate = true;
    root.add(boltInst);
    void flangeRingGeo;

    // Side-Mounted Turbomolecular Vacuum Pump (adds unmistakable cleanroom realism!)
    const turboGroup = new THREE.Group();
    turboGroup.position.set(-1.18, 2.86, -0.35);
    turboGroup.rotation.y = 0.28;
    root.add(turboGroup);

    const turboNeck = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.18, 0.18, 0.52, 24)),
      stainlessMat,
    );
    turboNeck.rotation.z = Math.PI / 2;
    turboNeck.position.x = 0.18;
    turboGroup.add(turboNeck);

    const turboBody = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 28)),
      darkAnodizedMat,
    );
    turboBody.position.set(-0.14, -0.14, 0);
    turboGroup.add(turboBody);

    // Cooling fins on the turbomolecular pump
    const finGeo = track(new THREE.TorusGeometry(0.255, 0.016, 8, 28));
    for (let f = 0; f < 6; f++) {
      const fin = new THREE.Mesh(finGeo, stainlessMat);
      fin.rotation.x = Math.PI / 2;
      fin.position.set(-0.14, -0.36 + f * 0.085, 0);
      turboGroup.add(fin);
    }
    const turboLed = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.022, 10, 10)),
      greenLedMat,
    );
    turboLed.position.set(-0.14, 0.18, 0.22);
    turboGroup.add(turboLed);

    // =========================================================
    // 3. 200x MAGNETIC REDUCTION PROJECTION OPTICS (y = 1.05 -> 2.28)
    // =========================================================
    const buildDetailedMagneticLens = (
      y: number,
      outerR: number,
      innerR: number,
      h: number,
    ) => {
      const g = new THREE.Group();
      g.position.y = y;

      // Slotted iron yoke jacket (240-degree cutaway arc so copper coils gleam!)
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

      // Top & bottom beveled iron pole-piece rings
      const poleGeo = track(new THREE.RingGeometry(innerR, outerR, 40));
      const topPole = new THREE.Mesh(poleGeo, stainlessMat);
      topPole.rotation.x = -Math.PI / 2;
      topPole.position.y = h / 2;
      g.add(topPole);
      const botPole = new THREE.Mesh(poleGeo, stainlessMat);
      botPole.rotation.x = Math.PI / 2;
      botPole.position.y = -h / 2;
      g.add(botPole);

      // Inner chamfered bore liner
      const bore = new THREE.Mesh(
        track(new THREE.CylinderGeometry(innerR, innerR, h, 32, 1, true)),
        titaniumMat,
      );
      g.add(bore);

      // 5 Stacked Copper Excitation Winding Turns
      const coilR = (outerR + innerR) * 0.5;
      const turnGeo = track(new THREE.TorusGeometry(coilR, 0.042, 14, 44));
      for (let i = -2; i <= 2; i++) {
        const turn = new THREE.Mesh(turnGeo, copperCoilMat);
        turn.rotation.x = Math.PI / 2;
        turn.position.y = i * (h * 0.17);
        g.add(turn);
      }

      // Water-cooling manifold pipe on the side
      const pipe = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.025, 0.025, h * 0.9, 12)),
        stainlessMat,
      );
      pipe.position.set(outerR + 0.04, 0, 0);
      g.add(pipe);

      return g;
    };

    root.add(buildDetailedMagneticLens(1.28, 0.7, 0.22, 0.44));
    root.add(buildDetailedMagneticLens(2.0, 0.74, 0.26, 0.46));

    // Detailed 8-Pole Octupole Beam-Steering & Stigmator Ring (y = 1.64)
    const octupoleGroup = new THREE.Group();
    octupoleGroup.position.y = 1.64;
    const octRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.46, 0.028, 12, 40)),
      titaniumMat,
    );
    octRing.rotation.x = Math.PI / 2;
    octupoleGroup.add(octRing);

    const poleBodyGeo = track(new THREE.BoxGeometry(0.07, 0.15, 0.16));
    const poleInsGeo = track(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 12));
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const pole = new THREE.Mesh(poleBodyGeo, goldMat);
      pole.position.set(Math.cos(ang) * 0.34, 0, Math.sin(ang) * 0.34);
      pole.rotation.y = -ang + Math.PI / 2;
      octupoleGroup.add(pole);

      const ins = new THREE.Mesh(poleInsGeo, ceramicMat);
      ins.rotation.z = Math.PI / 2;
      ins.rotation.y = -ang;
      ins.position.set(Math.cos(ang) * 0.43, 0, Math.sin(ang) * 0.43);
      octupoleGroup.add(ins);
    }
    root.add(octupoleGroup);

    // =========================================================
    // 4. FINNED STOPPING PLATE / 2nd CROSS-OVER (y = 2.55)
    // =========================================================
    const stopGroup = new THREE.Group();
    stopGroup.position.y = 2.55;
    const stopShape = new THREE.Shape();
    stopShape.absarc(0, 0, 0.66, 0, Math.PI * 2, false);
    const stopHole = new THREE.Path();
    stopHole.absarc(0, 0, 0.11, 0, Math.PI * 2, true);
    stopShape.holes.push(stopHole);
    const stopGeo = track(
      new THREE.ExtrudeGeometry(stopShape, {
        depth: 0.06,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelSegments: 3,
      }),
    );
    const stopPlate = new THREE.Mesh(stopGeo, tungstenMat);
    stopPlate.rotation.x = Math.PI / 2;
    stopPlate.position.y = 0.03;
    stopGroup.add(stopPlate);

    // Glowing amber beam-dump impact halo
    const dumpRing = new THREE.Mesh(
      track(new THREE.RingGeometry(0.17, 0.41, 44)),
      track(
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf97316,
          emissiveIntensity: 1.45,
          transparent: true,
          opacity: 0.34,
          side: THREE.DoubleSide,
        }),
      ),
    );
    dumpRing.rotation.x = -Math.PI / 2;
    dumpRing.position.y = 0.042;
    stopGroup.add(dumpRing);
    root.add(stopGroup);

    // =========================================================
    // 5. CMOS BLANKING ARRAY PLATE (BAP) WITH CIRCUIT TEXTURE (y = 3.15)
    // =========================================================
    const bapGroup = new THREE.Group();
    bapGroup.position.y = 3.15;
    const bapCarrier = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.7, 0.7, 0.055, 40)),
      darkAnodizedMat,
    );
    bapGroup.add(bapCarrier);

    const bapChipMats = [
      darkAnodizedMat,
      darkAnodizedMat,
      bapSurfaceMat,
      bapSurfaceMat,
      darkAnodizedMat,
      darkAnodizedMat,
    ];
    const bapChip = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.78, 0.075, 0.78)),
      bapChipMats,
    );
    bapGroup.add(bapChip);

    // Dual copper high-speed data manifolds + fiber-optic ribbons
    const busGeo = track(new THREE.BoxGeometry(0.36, 0.036, 0.22));
    for (const side of [-1, 1]) {
      const bus = new THREE.Mesh(busGeo, copperCoilMat);
      bus.position.set(side * 0.58, 0.035, 0);
      bapGroup.add(bus);
    }
    root.add(bapGroup);

    // =========================================================
    // 6. APERTURE ARRAY PLATE (AAP) WITH MICRO-GRID TEXTURE (y = 3.58)
    // =========================================================
    const aapGroup = new THREE.Group();
    aapGroup.position.y = 3.58;
    const aapFrame = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.66, 0.66, 0.045, 40)),
      stainlessMat,
    );
    aapGroup.add(aapFrame);

    const aapChipMats = [
      goldMat,
      goldMat,
      aapSurfaceMat,
      aapSurfaceMat,
      goldMat,
      goldMat,
    ];
    const aapMembrane = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.68, 0.058, 0.68)),
      aapChipMats,
    );
    aapGroup.add(aapMembrane);
    root.add(aapGroup);

    // =========================================================
    // 7. ELECTROSTATIC CONDENSER OPTICS + CERAMIC STANDOFFS (y = 4.05 -> 4.68)
    // =========================================================
    const condGroup = new THREE.Group();
    root.add(condGroup);
    const electrodeGeo = track(new THREE.TorusGeometry(0.47, 0.056, 18, 44));
    for (const ey of [4.1, 4.38, 4.66]) {
      const ring = new THREE.Mesh(electrodeGeo, goldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = ey;
      condGroup.add(ring);
    }
    // 4 Ceramic insulator mounting rods holding the electrostatic stack
    const standoffGeo = track(new THREE.CylinderGeometry(0.024, 0.024, 0.72, 12));
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const rod = new THREE.Mesh(standoffGeo, ceramicMat);
      rod.position.set(Math.cos(ang) * 0.54, 4.38, Math.sin(ang) * 0.54);
      condGroup.add(rod);
    }

    // =========================================================
    // 8. 50 keV SCHOTTKY ELECTRON GUN + HV CONDUIT (y = 4.95 -> 6.1)
    // =========================================================
    const gunGroup = new THREE.Group();
    root.add(gunGroup);

    // Ribbed HV ceramic insulator stack with metallic corona rings
    for (let i = 0; i < 5; i++) {
      const y = 5.04 + i * 0.135;
      const rib = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.47, 0.47, 0.075, 36)),
        ceramicMat,
      );
      rib.position.y = y;
      gunGroup.add(rib);

      const coronaRing = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.47, 0.016, 10, 36)),
        stainlessMat,
      );
      coronaRing.rotation.x = Math.PI / 2;
      coronaRing.position.y = y + 0.04;
      gunGroup.add(coronaRing);
    }

    // HV Top Feedthrough Cap
    const hvCap = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.34, 0.52, 0.26, 36)),
      darkAnodizedMat,
    );
    hvCap.position.y = 5.76;
    gunGroup.add(hvCap);

    // Curved 50 kV Braided Power Cable Conduit
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

    // Glowing Schottky Cathode Emitter Tip
    const emitterTip = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.065, 0.17, 18)),
      cathodeGlowMat,
    );
    emitterTip.rotation.x = Math.PI;
    emitterTip.position.y = 4.97;
    gunGroup.add(emitterTip);

    // Subtle local cyan point light inside the gun & column
    const gunLight = new THREE.PointLight(0x38bdf8, 2.2, 3.8);
    gunLight.position.set(0, 4.82, 0);
    gunGroup.add(gunLight);

    // =========================================================
    // 9. MULTI-BEAM ELECTRON PATHS + STREAMING ELECTRON PARTICLES
    // =========================================================
    const beamGroup = new THREE.Group();
    root.add(beamGroup);

    const upperCone = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.028, 0.34, 1.36, 32, 1, true)),
      primaryBeamMat,
    );
    upperCone.position.y = 4.28;
    beamGroup.add(upperCone);

    const beamlets: BeamletEntry[] = [];
    const gridN = 5;
    const aapSpan = 0.44;
    const stopPinholeSpan = 0.052;
    const maskSpan = 0.092;

    for (let ix = 0; ix < gridN; ix++) {
      for (let iz = 0; iz < gridN; iz++) {
        const u = (ix / (gridN - 1)) * 2 - 1;
        const v = (iz / (gridN - 1)) * 2 - 1;
        const xAap = u * (aapSpan / 2);
        const zAap = v * (aapSpan / 2);

        const pAap = new THREE.Vector3(xAap, 3.55, zAap);
        const pBap = new THREE.Vector3(xAap, 3.15, zAap);
        const pStopOn = new THREE.Vector3(
          u * (stopPinholeSpan / 2),
          2.55,
          v * (stopPinholeSpan / 2),
        );
        const radialDir = new THREE.Vector2(u, v);
        if (radialDir.lengthSq() < 0.01) radialDir.set(1, 0);
        radialDir.normalize();
        const pStopOff = new THREE.Vector3(
          radialDir.x * 0.29,
          2.58,
          radialDir.y * 0.29,
        );
        const pMask = new THREE.Vector3(
          u * (maskSpan / 2),
          0.72,
          v * (maskSpan / 2),
        );

        const upperMesh = createCylinderBetween(pAap, pBap, 0.007, 0.007, beamOnMat, 8);
        const midOnMesh = createCylinderBetween(pBap, pStopOn, 0.0065, 0.0045, beamOnMat, 8);
        const midOffMesh = createCylinderBetween(pBap, pStopOff, 0.0065, 0.007, beamOffMat, 8);
        const lowerMesh = createCylinderBetween(pStopOn, pMask, 0.0048, 0.0032, beamOnMat, 8);

        track(upperMesh.geometry);
        track(midOnMesh.geometry);
        track(midOffMesh.geometry);
        track(lowerMesh.geometry);

        beamGroup.add(upperMesh, midOnMesh, midOffMesh, lowerMesh);

        beamlets.push({
          u,
          v,
          pAap,
          pBap,
          pStopOn,
          pStopOff,
          pMask,
          upperMesh,
          midOnMesh,
          midOffMesh,
          lowerMesh,
          phaseOffset: ix * 1.7 + iz * 2.9,
          isOn: true,
        });
      }
    }

    // Animated GPU Electron Particle Stream (250 glowing electrons racing down the column!)
    const particleCount = 250;
    const pPositions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);
    const pProgress = new Float32Array(particleCount);
    const pBeamIndex = new Uint8Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      pProgress[i] = Math.random();
      pBeamIndex[i] = i % beamlets.length;
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

    const tmpPos = new THREE.Vector3();
    const gunPos = new THREE.Vector3(0, 4.94, 0);

    const updateBeamBlanking = (elapsed: number) => {
      const step = Math.floor(elapsed * 2.4);
      for (const b of beamlets) {
        const hash = Math.sin(b.phaseOffset + step * 1.13) * 43758.5453;
        const isOn = hash - Math.floor(hash) > 0.42;
        b.isOn = isOn;
        b.midOnMesh.visible = isOn;
        b.lowerMesh.visible = isOn;
        b.midOffMesh.visible = !isOn;
      }
    };

    const updateParticles = (dt: number) => {
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = particleGeo.getAttribute('color') as THREE.BufferAttribute;

      for (let i = 0; i < particleCount; i++) {
        pProgress[i] = (pProgress[i] + dt * 0.55) % 1;
        const t = pProgress[i];
        const b = beamlets[pBeamIndex[i]];

        // Cyan default (HDR > 1 for selective bloom)
        let r = 0.45;
        let g = 1.35;
        let bl = 1.9;

        if (t < 0.3) {
          // Gun -> AAP
          tmpPos.lerpVectors(gunPos, b.pAap, t / 0.3);
        } else if (t < 0.4) {
          // AAP -> BAP
          tmpPos.lerpVectors(b.pAap, b.pBap, (t - 0.3) / 0.1);
        } else if (t < 0.56) {
          // BAP -> Stopping Plate
          const seg = (t - 0.4) / 0.16;
          if (b.isOn) {
            tmpPos.lerpVectors(b.pBap, b.pStopOn, seg);
          } else {
            tmpPos.lerpVectors(b.pBap, b.pStopOff, seg);
            r = 1.95;
            g = 0.85;
            bl = 0.22;
          }
        } else {
          // Stopping Plate -> 6" Mask Blank (OFF beams recycle at dump)
          if (b.isOn) {
            tmpPos.lerpVectors(b.pStopOn, b.pMask, (t - 0.56) / 0.44);
          } else {
            tmpPos.copy(b.pStopOff);
            r = 1.95;
            g = 0.85;
            bl = 0.22;
          }
        }

        posAttr.setXYZ(i, tmpPos.x, tmpPos.y, tmpPos.z);
        colAttr.setXYZ(i, r, g, bl);
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    };

    updateBeamBlanking(0);
    updateParticles(0.016);

    return {
      root,
      update(dt: number, elapsed: number, _params: SimulationParams, scan) {
        // Sync 3D stage directly to the shared serpentine stripe scan:
        // Moving the stage to (-normX, -normZ) brings that exact mask coordinate under the stationary beam!
        const scanX = -scan.normX * 0.34;
        const scanZ = -scan.normZ * 0.34;
        stageGroup.position.x = scanX;
        stageGroup.position.z = scanZ;

        // Keep interferometer red laser beams locked onto stage mirror edges
        const xGap = Math.max(0.12, 1.38 - (scanX + 0.81));
        ifBeamX.scale.y = xGap / 0.58;
        ifBeamX.position.x = 1.38 - xGap / 2;

        const zGap = Math.max(0.12, 1.26 - (scanZ + 0.81));
        ifBeamZ.scale.y = zGap / 0.46;
        ifBeamZ.position.z = 1.26 - zGap / 2;

        primaryBeamMat.opacity = 0.24 + Math.sin(elapsed * 5.0) * 0.05;
        writeSpotMat.emissiveIntensity = 2.6 + Math.sin(elapsed * 9.0) * 0.8;
        updateBeamBlanking(elapsed);
        updateParticles(dt);
      },
      setXray(enabled: boolean) {
        vacuumShellMat.opacity = enabled ? 0.14 : 0.92;
        vacuumShellMat.depthWrite = !enabled;
        xrayEdgeMat.opacity = enabled ? 0.36 : 0.12;
      },
      setBeamVisible(visible: boolean) {
        beamGroup.visible = visible;
        writeSpot.visible = visible;
      },
      dispose() {
        for (const item of disposables) {
          item.dispose();
        }
      },
    };
  },
};
