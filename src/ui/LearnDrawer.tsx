import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Compass, X } from 'lucide-react';
import type { MachineId } from '../machines/types';

interface LearnDrawerProps {
  open: boolean;
  onClose: () => void;
  machineId: MachineId;
  onJumpToView: (viewId: string) => void;
  onRunPecDemo: () => void;
}

interface LearnTopic {
  id: string;
  title: string;
  body: string;
  actionLabel?: string;
  mbmwViewId?: string;
  vsbViewId?: string;
  isPecDemo?: boolean;
}

const TOPICS: LearnTopic[] = [
  {
    id: 'why-mbmw',
    title: '1. MBMW vs. VSB: Why Both Exist',
    body: 'For decades, Variable Shaped Beam (VSB) writers patterned photomasks by carving a single beam into rectangles. On modern curvilinear EUV masks (ILT), VSB fractures curves into trillions of tiny shots—pushing write times past 35 hours. Multi-Beam Mask Writers (MBMW) fire 262,144 parallel sub-beams so write time stays ~10.5 hours regardless of complexity.',
    actionLabel: 'Inspect Beam-Shaping Optics',
    mbmwViewId: 'aap-bap',
    vsbViewId: 'shaper',
  },
  {
    id: 'blanking-optics',
    title: '2. Beam Blanking: 262k CMOS vs. Single-Beam',
    body: 'In MBMW, a CMOS Blanking Array Plate switches 262,144 pixel beams ON/OFF simultaneously, dumping OFF beams onto a tungsten stopping plate. In VSB, one fast electrostatic blanker deflects the single beam into a side dump cup for nanoseconds between every shot while the vector deflection amplifiers settle.',
    actionLabel: 'Inspect Blanking Subsystem',
    mbmwViewId: 'stopping',
    vsbViewId: 'blanker',
  },
  {
    id: 'reduction-optics',
    title: '3. Magnetic Reduction & Laser Stage',
    body: 'Water-cooled magnetic projection lenses demagnify the beam(s) onto the mask surface (200× in MBMW) while multipole/vector coils steer fine positioning. Beneath the column, a continuous-moving air-bearing stage tracked by sub-nanometer He-Ne laser interferometers scans the 6025 (6-inch) mask blank in serpentine stripes.',
    actionLabel: 'Inspect Laser Stage & 6" Mask',
    mbmwViewId: 'stage',
    vsbViewId: 'stage',
  },
  {
    id: 'proximity-effect',
    title: '4. Electron Scattering & Proximity Effect (PEC)',
    body: 'High-energy electrons scatter forward narrowly (α ≈ 5–10 nm) in the resist, then penetrate deep into the mask blank and backscatter over microns (β ≈ 10–30 µm). In dense regions, backscattered electrons add unwanted background dose—causing lines to bridge while isolated lines remain under-exposed. Proximity Effect Correction (PEC) modulates local dose to equalize energy at the resist threshold.',
    actionLabel: 'Run Live PEC OFF Demo',
    isPecDemo: true,
  },
  {
    id: 'euv-mask-stack',
    title: '5. Inside a 6025 EUV Photomask Blank',
    body: 'Unlike optical masks (Chrome on transparent fused silica), an EUV mask is a precision reflective mirror: a 152.4 × 152.4 × 6.35 mm Low Thermal Expansion Material (LTEM) substrate coated with 40 alternating Silicon/Molybdenum bilayers (6.95 nm period) topped by a Ruthenium cap and a TaBN absorber layer that E-Beam lithography patterns at 4× wafer scale.',
  },
  {
    id: 'references',
    title: '6. Reliable Blueprint & Physics Sources',
    body: 'Column architecture & scattering physics: M. A. McCord & M. J. Rooks, "Electron Beam Lithography" (SPIE Handbook of Microlithography); IMS Nanofabrication MBMW-101/201/301 SPIE papers; NuFlare EBM-9500 & JEOL JBX VSB technical literature; eBeam Initiative BACUS presentations (ebeam.org); SEMI P1/P37/P38 6025 mask blank standards; and CASINO Monte Carlo simulator.',
  },
];

export function LearnDrawer({
  open,
  onClose,
  machineId,
  onJumpToView,
  onRunPecDemo,
}: LearnDrawerProps) {
  const [openId, setOpenId] = useState<string>('why-mbmw');

  if (!open) return null;

  return (
    <aside className="side-drawer left-drawer" aria-label="Physics & engineering guide">
      <div className="drawer-header">
        <div className="drawer-title">
          <BookOpen size={15} />
          <span>How an E-Beam Mask Writer Works</span>
        </div>
        <button
          className="hud-btn icon-only"
          style={{ width: 28, height: 28 }}
          onClick={onClose}
          aria-label="Close guide drawer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="drawer-body">
        {TOPICS.map((topic) => {
          const isOpen = openId === topic.id;
          return (
            <div key={topic.id} className="accordion-item">
              <button
                className="accordion-trigger"
                onClick={() => setOpenId(isOpen ? '' : topic.id)}
                aria-expanded={isOpen}
              >
                <span>{topic.title}</span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {isOpen && (
                <div className="accordion-content">
                  <p>{topic.body}</p>
                  {topic.actionLabel && (
                    <button
                      className="hud-btn active"
                      style={{ marginTop: 8, height: 30, fontSize: 11.5 }}
                      onClick={() => {
                        if (topic.isPecDemo) {
                          onRunPecDemo();
                        } else {
                          const targetView =
                            machineId === 'vsb'
                              ? topic.vsbViewId
                              : topic.mbmwViewId;
                          if (targetView) onJumpToView(targetView);
                        }
                      }}
                    >
                      <Compass size={13} />
                      {topic.actionLabel}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
