import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { TourChapter } from '../machines/types';

interface TourOverlayProps {
  active: boolean;
  chapters: TourChapter[];
  currentIndex: number;
  onSelectIndex: (idx: number) => void;
  onExit: () => void;
}

export function TourOverlay({
  active,
  chapters,
  currentIndex,
  onSelectIndex,
  onExit,
}: TourOverlayProps) {
  const [autoPlay, setAutoPlay] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  const chapter = chapters[currentIndex];

  // Auto-advance timer with smooth progress bar
  useEffect(() => {
    if (!active || !autoPlay || !chapter) return;

    setProgressPct(0);
    const totalMs = chapter.durationSec * 1000;
    const start = performance.now();

    const interval = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setProgressPct(pct);

      if (elapsed >= totalMs) {
        if (currentIndex < chapters.length - 1) {
          onSelectIndex(currentIndex + 1);
        } else {
          setAutoPlay(false);
          setProgressPct(100);
        }
      }
    }, 60);

    return () => window.clearInterval(interval);
  }, [active, autoPlay, chapter, currentIndex, chapters.length, onSelectIndex]);

  // Optional browser speech narration
  useEffect(() => {
    if (!active || !voiceEnabled || !chapter) {
      window.speechSynthesis?.cancel();
      return;
    }
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(
      `${chapter.title}. ${chapter.caption}`,
    );
    utter.rate = 1.02;
    window.speechSynthesis.speak(utter);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [active, voiceEnabled, chapter]);

  if (!active || !chapter) return null;

  return (
    <section className="tour-overlay" aria-label="Guided camera tour">
      <div className="tour-progress-track">
        <div
          className="tour-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="tour-header">
        <span className="tour-badge">
          Guided Journey · Chapter {currentIndex + 1} / {chapters.length}
        </span>
        <div className="tour-controls">
          <button
            className="hud-btn icon-only"
            style={{ width: 28, height: 28 }}
            onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            title="Previous chapter"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            className={`hud-btn icon-only ${autoPlay ? 'active' : ''}`}
            style={{ width: 28, height: 28 }}
            onClick={() => setAutoPlay((a) => !a)}
            title={autoPlay ? 'Pause auto-advance' : 'Resume auto-advance'}
          >
            {autoPlay ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            className="hud-btn icon-only"
            style={{ width: 28, height: 28 }}
            onClick={() =>
              onSelectIndex(Math.min(chapters.length - 1, currentIndex + 1))
            }
            disabled={currentIndex === chapters.length - 1}
            title="Next chapter"
          >
            <ChevronRight size={14} />
          </button>
          <button
            className={`hud-btn icon-only ${voiceEnabled ? 'active' : ''}`}
            style={{ width: 28, height: 28 }}
            onClick={() => setVoiceEnabled((v) => !v)}
            title={voiceEnabled ? 'Mute voice narration' : 'Enable voice narration'}
          >
            {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          <button
            className="hud-btn icon-only"
            style={{ width: 28, height: 28 }}
            onClick={() => {
              window.speechSynthesis?.cancel();
              onExit();
            }}
            title="Exit guided tour"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <h3>{chapter.title}</h3>
      <p>{chapter.caption}</p>

      <div className="tour-dots">
        {chapters.map((ch, idx) => (
          <button
            key={ch.id}
            className={`tour-dot ${idx === currentIndex ? 'active' : ''}`}
            onClick={() => onSelectIndex(idx)}
            title={ch.title}
            aria-label={`Jump to chapter ${idx + 1}: ${ch.title}`}
          />
        ))}
      </div>
    </section>
  );
}
