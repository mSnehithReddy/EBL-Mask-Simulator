# Project Plan: Electron-Beam Lithography (Mask Writer) Interactive Exhibit

## North Star Goal
Build an interactive 3D web museum exhibit for **Electron-Beam Lithography (used to create photomasks / EUV masks)** inspired by [DigiSim's EUV Lithography Scanner](https://digisim.io/museum/euv-lithography)—featuring multi-scale 3D camera views, X-ray cutaway, live electron optics & scattering physics, 2D live instrument plots, and a guided tour.

---

## Phase 0: Environment & Global Setup
- [x] Download `find-skills` globally to `~/.gemini/config/skills/find-skills`
- [x] Install **Node.js (LTS)** globally (`v26.13.1`)
- [x] Install **Git** globally (`v2.56.0`)
- [x] Add global Anti-Drift & Local-Skills rules to `~/.gemini/config/GEMINI.md`
- [x] Choose a local project folder outside cloud-synced storage: `ebl-mask-simulator`

---

## Phase 1: Design Decisions & Project Scaffolding
- [x] Decide primary mask writer archetype: **Multi-Beam Mask Writer (MBMW, IMS-style)** first, architected via a pluggable `src/machines/` interface so **Variable Shaped Beam (VSB)** slots cleanly into the same museum shell later
- [x] Decide web framework: **Vite + React + TypeScript + imperative Three.js (`SceneEngine`)** — clean UI maintainability with direct 60 fps WebGL control and Vitest physics testing
- [x] Scaffold project in `ebl-mask-simulator`, initialize Git, create multi-machine directory structure, and add `PLAN.md` to repo root
- [ ] *(Optional)* Search `skills.sh` via `npx skills find` for helpful Three.js / frontend skills

---

## Phase 2: Milestone 1 — Interactive 3D Electron Column Shell
- [x] Set up full-viewport Three.js WebGL stage with `OrbitControls`, lighting, and dark/light theme
- [x] Build procedural 3D electron column (top-to-bottom):
  - Electron Gun (Schottky / Thermal Field Emission source)
  - Condenser Lenses & Shaping / Aperture Array Plate (AAP)
  - Beam Blanker / Blanking Array Plate (BAP) & Stopping Plate
  - Projection / Magnetic Reduction Lenses, Stigmators, Deflection Coils & Objective Lens
  - Laser-Interferometer Stage & 6025 (6-inch) Mask Blank
- [x] Add progressive-scale camera presets (Whole Machine → Gun → Condenser → AAP/BAP → Stopping Plate → 200× Optics → Stage)
- [x] Add viewport toolbar toggles: **X-ray cutaway**, **Beam visibility**, **3D Subsystem Labels**

---

## Phase 3: Milestone 2 — Live Beam & Stage Animation
- [x] Animate electron beam trajectories down the column (250 streaming electron particles + glowing cones)
- [x] Animate beam blanking (deflecting "off" beams in amber into the stopping plate)
- [x] Animate stage scanning / write-field stitching across the 6-inch mask blank + red interferometer beams

---

## Phase 4: Milestone 3 — Physics Engine & Live Data Drawer
- [x] Build framework-agnostic physics engine in `src/sim/` with Vitest unit tests:
  - Accelerating voltage ($50\text{–}100\text{ keV}$), beam current, and exposure dose ($\mu\text{C/cm}^2$)
  - Double-Gaussian Point Spread Function (forward scattering $\alpha$ + backscattering $\beta$)
  - **Proximity Effect** simulation & **Proximity Effect Correction (PEC)** toggle
  - Shot noise, resist development threshold, CD & $3\sigma$ LER calculation
  - Mask absorber etch preview (Chrome-on-Glass or EUV TaBN over Mo/Si multilayers)
- [x] Build collapsible **Controls** drawer (sliders + toggles + sim speed)
- [x] Build collapsible **Data** drawer with 2D `<canvas>` live instruments:
  - Energy deposition / PSF curve
  - 6-inch mask write-field map
  - Developed resist & etched mask cross-section

---

## Phase 5: Milestone 4 — Guided Tour & Educational Polish
- [x] Add 6-chapter narrated/captioned **Guided Camera Journey** ("Start guide" with auto-advance, chapter dots, and optional Web Speech voice narration)
- [x] Add **Learn** drawer with interactive educational accordions explaining MBMW optics, proximity effect, EUV mask stacks, and technical blueprint sources
- [x] Synchronize 3D stage scan and 2D 6" mask map via shared `StageScanState`

---

## Phase 6: Second Exhibit — Variable Shaped Beam (VSB) Mask Writer
- [x] Build `src/machines/vsb/vsbExhibit.ts` (NuFlare/JEOL-style dual shaping apertures, quadrupole shaping deflector, single-beam blanker, vector deflection coils, and live variable-rectangle shaping)
- [x] Enable VSB in `src/machines/registry.ts` so users can switch live between **MBMW** and **VSB** in the top banner
- [x] Compare VSB vs. MBMW write-time scaling on Manhattan vs. Curvilinear/ILT masks in the physics engine, Controls drawer, and live Data drawer
