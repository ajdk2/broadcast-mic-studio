import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useStudio } from '../state/store';

const STEPS = [
  { anchor: 'boost', title: 'This is where you get louder', text: 'Talk normally and slide Voice Boost until the loudness readout turns green. Aurel lifts your voice, not the room, so you never need to lean in or raise your voice.', next: 'Next: sound profiles' },
  { anchor: 'profiles', title: 'Pick the character of your voice', text: 'Each profile shapes your tone differently. Your Voice Boost stays the same whichever you pick, and you can fine-tune any of them.', next: 'Next: check your sound' },
  { anchor: 'loudness', title: 'Green means you’re ready', text: 'When the loudness readout says “On target”, meetings and recordings hear a broadcast-level voice. Use Test my sound to hear it for yourself.', next: 'Done' },
];

// Board 24 · Studio first-time tour: a callout next to each part of the Studio screen.
export function FirstRunTour() {
  const s = useStudio();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[i];

  useLayoutEffect(() => {
    const el = document.querySelector(`[data-tour="${step.anchor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
    // Banners can appear and move the target, so keep following it.
    let raf = 0;
    let last = '';
    const follow = () => {
      const r = el ? el.getBoundingClientRect() : null;
      const key = r ? `${r.left},${r.top},${r.width},${r.height}` : '';
      if (key !== last) {
        last = key;
        setRect(r);
      }
      raf = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(raf);
  }, [step.anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && s.setPrefs({ tourDone: true });
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s]);

  if (!rect) return null;
  const W = 380;
  const below = rect.top < window.innerHeight / 2;
  const left = Math.max(16, Math.min(window.innerWidth - W - 16, rect.left + rect.width / 2 - W / 2));
  const top = below ? rect.bottom + 16 : undefined;
  const bottom = below ? undefined : window.innerHeight - rect.top + 16;
  const done = () => s.setPrefs({ tourDone: true });

  return (
    <>
      <div aria-hidden="true" style={{ position: 'fixed', left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12, borderRadius: 20, border: '2px solid var(--accent)', boxShadow: '0 0 0 9999px var(--bg-backdrop)', pointerEvents: 'none', zIndex: 40 }} />
      <div role="dialog" aria-label="Quick tour" className="toast col" style={{ position: 'fixed', left, top, bottom, width: W, gap: 12, padding: '18px 20px', zIndex: 41 }}>
        <span className="overline" style={{ color: 'var(--accent-text)' }}>Quick tour · {i + 1} of {STEPS.length}</span>
        <span className="h3" style={{ fontSize: 17 }}>{step.title}</span>
        <p className="small muted" style={{ lineHeight: 1.55 }}>{step.text}</p>
        <div className="row" style={{ justifyContent: 'space-between', paddingTop: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={done}>Skip tour</button>
          <button className="btn btn-primary btn-sm" onClick={() => (i + 1 < STEPS.length ? setI(i + 1) : done())}>{step.next}</button>
        </div>
      </div>
    </>
  );
}
