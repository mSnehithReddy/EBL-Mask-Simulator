import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type {
  CameraPreset,
  MachineExhibit,
  MachineSceneHandle,
  SimulationParams,
} from '../machines/types';
import {
  updateSerpentineScan,
  type StageScanState,
} from '../sim/scanState';

export interface ProjectedPin {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

interface CameraTransition {
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  elapsed: number;
  duration: number;
}

export class SceneEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private pmrem: THREE.PMREMGenerator;
  private envTexture: THREE.Texture;
  private grid: THREE.GridHelper;
  private floorDisc: THREE.Mesh;
  private floorMat: THREE.MeshStandardMaterial;

  private exhibit: MachineExhibit | null = null;
  private handle: MachineSceneHandle | null = null;
  private params: SimulationParams;
  private scanState: StageScanState;
  private transition: CameraTransition | null = null;
  private onPinsProjected?: (pins: ProjectedPin[]) => void;

  private rafId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private resizeObserver: ResizeObserver;
  private projVec = new THREE.Vector3();

  constructor(
    canvas: HTMLCanvasElement,
    initialParams: SimulationParams,
    scanState: StageScanState,
    onPinsProjected?: (pins: ProjectedPin[]) => void,
  ) {
    this.canvas = canvas;
    this.params = { ...initialParams };
    this.scanState = scanState;
    this.onPinsProjected = onPinsProjected;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#060a11');
    this.scene.fog = new THREE.FogExp2('#060a11', 0.022);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    this.scene.environmentIntensity = 0.85;

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 120);
    this.camera.position.set(6.4, 4.1, 7.6);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 0.55;
    this.controls.maxDistance = 24;
    this.controls.target.set(0, 2.7, 0);

    this.controls.addEventListener('start', () => {
      this.transition = null;
    });

    // 3-Point Studio + Cleanroom Technical Lighting
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x0b1120, 0.65);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(6, 11, 8);
    this.scene.add(key);

    const coolRim = new THREE.DirectionalLight(0x38bdf8, 1.35);
    coolRim.position.set(-8, 7, -6);
    this.scene.add(coolRim);

    const warmFill = new THREE.DirectionalLight(0xfbbf24, 0.55);
    warmFill.position.set(5, 2.5, -7);
    this.scene.add(warmFill);

    // Subtle reflective cleanroom floor pedestal & grid
    this.floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a101b,
      metalness: 0.45,
      roughness: 0.55,
    });
    this.floorDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 7.4, 0.04, 64),
      this.floorMat,
    );
    this.floorDisc.position.y = -0.025;
    this.scene.add(this.floorDisc);

    this.grid = new THREE.GridHelper(18, 36, 0x1e3a5f, 0x101c2e);
    this.grid.position.y = -0.002;
    this.scene.add(this.grid);

    // Post-processing: crisp selective bloom for beams, lasers, and status LEDs
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.42, // strength
      0.35, // radius
      0.85, // threshold (only emissive/beam highlights glow)
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.startLoop();
  }

  loadExhibit(exhibit: MachineExhibit, initialViewId?: string): void {
    if (this.handle) {
      this.scene.remove(this.handle.root);
      this.handle.dispose();
      this.handle = null;
    }

    this.exhibit = exhibit;
    this.handle = exhibit.buildScene();
    this.scene.add(this.handle.root);
    this.handle.setXray(this.params.xray);
    this.handle.setBeamVisible(this.params.showBeam);

    const preset =
      exhibit.views.find((v) => v.id === initialViewId) ?? exhibit.views[0];
    if (preset) {
      this.camera.position.set(...preset.position);
      this.controls.target.set(...preset.target);
      this.controls.update();
    }
  }

  setParams(next: SimulationParams): void {
    const xrayChanged = next.xray !== this.params.xray;
    const beamChanged = next.showBeam !== this.params.showBeam;
    this.params = { ...next };

    if (this.handle) {
      if (xrayChanged) this.handle.setXray(next.xray);
      if (beamChanged) this.handle.setBeamVisible(next.showBeam);
    }
  }

  setTheme(theme: 'dark' | 'light'): void {
    const bgHex = theme === 'dark' ? '#060a11' : '#e8eef5';
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(bgHex, theme === 'dark' ? 0.022 : 0.015);
    this.floorMat.color.set(theme === 'dark' ? 0x0a101b : 0xdce4ee);
    this.bloomPass.strength = theme === 'dark' ? 0.42 : 0.16;

    this.scene.remove(this.grid);
    this.grid.dispose();
    this.grid =
      theme === 'dark'
        ? new THREE.GridHelper(18, 36, 0x1e3a5f, 0x101c2e)
        : new THREE.GridHelper(18, 36, 0x94a3b8, 0xcbd5e1);
    this.grid.position.y = -0.002;
    this.scene.add(this.grid);
  }

  flyToPreset(preset: CameraPreset, duration = 0.85): void {
    this.transition = {
      startPos: this.camera.position.clone(),
      endPos: new THREE.Vector3(...preset.position),
      startTarget: this.controls.target.clone(),
      endTarget: new THREE.Vector3(...preset.target),
      elapsed: 0,
      duration,
    };
  }

  zoom(factor: number): void {
    this.transition = null;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const nextLen = THREE.MathUtils.clamp(
      offset.length() * factor,
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    offset.setLength(nextLen);
    this.camera.position.copy(this.controls.target).add(offset);
  }

  private resize(): void {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      this.rafId = requestAnimationFrame(tick);
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;

      if (this.transition) {
        this.transition.elapsed += dt;
        const t = Math.min(this.transition.elapsed / this.transition.duration, 1);
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        this.camera.position.lerpVectors(
          this.transition.startPos,
          this.transition.endPos,
          ease,
        );
        this.controls.target.lerpVectors(
          this.transition.startTarget,
          this.transition.endTarget,
          ease,
        );
        if (t >= 1) this.transition = null;
      }

      this.controls.update();

      if (this.handle && this.params.running) {
        const simDt = dt * this.params.speed;
        this.elapsed += simDt;
        updateSerpentineScan(this.scanState, simDt * 0.032);
        this.handle.update(simDt, this.elapsed, this.params, this.scanState);
      }

      this.composer.render();
      this.projectPins();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private projectPins(): void {
    if (!this.onPinsProjected || !this.exhibit) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;

    const projected: ProjectedPin[] = this.exhibit.pins.map((pin) => {
      this.projVec.set(...pin.position).project(this.camera);
      const inFront = this.projVec.z >= -1 && this.projVec.z <= 1;
      return {
        id: pin.id,
        x: (this.projVec.x * 0.5 + 0.5) * width,
        y: (-this.projVec.y * 0.5 + 0.5) * height,
        visible: inFront,
      };
    });
    this.onPinsProjected(projected);
  }

  dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    if (this.handle) this.handle.dispose();
    this.controls.dispose();
    this.grid.dispose();
    this.floorDisc.geometry.dispose();
    this.floorMat.dispose();
    this.envTexture.dispose();
    this.pmrem.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
