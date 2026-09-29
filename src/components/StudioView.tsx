import React, { useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../audio/engine';
import { useMeters, useStudio, shortLabel } from '../state/store';
import { isCablePlayback } from '../routing';
import { BOOST_MAX_DB, NOISE_MODES, NoiseMode, TONE_RANGE_DB, curvePath, effectiveBands, fmtDb, setNoiseMode, signed } from '../voice/model';
import { Icon, LevelBar, Segmented, Slider, Switch } from '../ui/kit';
import { Waveform } from './Waveform';

const TARGET_LOW = -18.5;
const TARGET_HIGH = -13.5;

export function StudioView() {
  const s = useStudio();
  const m = useMeters(100);
  const { live, working } = s;

  // Loudness only means something while you talk, so hold the last spoken value.
  const spoken = useRef({ lufs: NaN, rawLufs: NaN });
  if (m.speaking && m.out.shortTermLufs > -70) spoken.current = { lufs: m.out.shortTermLufs, rawLufs: m.raw.shortTermLufs };
  const outLufs = live.muted ? NaN : live.enhancementOn ? spoken.current.lufs : spoken.current.rawLufs;
  const rawLufs = spoken.current.rawLufs;
  const has = Number.isFinite(outLufs);
  const inTarget = has && outLufs > TARGET_LOW && outLufs < TARGET_HIGH;

  let statusText: string;
  let statusColor: string;
  if (live.muted) {
    statusText = 'Muted. Your apps hear silence.';
    statusColor = 'var(--error-text)';
  } else if (!has) {
    statusText = 'Say something to measure your level.';
    statusColor = 'var(--text-tertiary)';
  } else if (!live.enhancementOn) {
    statusText = 'Raw mic level. Most listeners will struggle to hear you.';
    statusColor = 'var(--error-text)';
  } else if (inTarget) {
    statusText = `On target for podcasts and broadcast (${signed(working.leveler.targetLufs, 0)})`;
    statusColor = 'var(--success)';
  } else if (outLufs <= TARGET_LOW) {
    statusText = 'A little quiet. Raise Voice Boost.';
    statusColor = 'var(--accent-text)';
  } else {
    statusText = 'Hot. Lower Voice Boost to avoid pumping.';
    statusColor = 'var(--accent-text)';
  }

  const truePeak = useHeldMax(m.out.truePeakDb, 3000);
  const noiseOn = working.noise.enabled && working.noise.mode !== 'off';
  const floorOut = live.enhancementOn ? m.noiseOutDb + m.out.gainDb : m.raw.noiseFloorDb;
  const lift = live.enhancementOn ? m.out.gainDb : 0;

  const cards = useMemo(() => {
    const builtIns = s.profiles.filter((p) => p.builtIn);
    return s.active.builtIn ? builtIns : [s.active, ...builtIns.slice(0, 4)];
  }, [s.profiles, s.active]);

  return (
    <div className="page">
      <div className="page-head">
        <div className="col" style={{ gap: 6, minWidth: 0 }}>
          <h1 className="h1">Studio</h1>
          <div className="row small faint" style={{ gap: 8, minWidth: 0 }}>
            <span className="ellipsis" style={{ maxWidth: 320 }}>{s.inputLabel}</span>
            <Icon name="arrowRight" size={14} />
            {isCablePlayback(s.outputLabel) ? (
              <>
                <span className="muted">VB-Audio Cable</span>
                <span className="ellipsis">· apps pick CABLE Output</span>
              </>
            ) : (
              <span className="ellipsis" style={{ color: 'var(--accent-text)' }}>
                {s.outputLabel ? `${shortLabel(s.outputLabel)} · apps can’t hear you` : 'Not sent to your apps yet'}
              </span>
            )}
          </div>
        </div>
        <div className="row" style={{ gap: 12, flexShrink: 0 }}>
          <span className="xsmall faint hide-narrow">Headphone preview</span>
          <Segmented
            label="Headphone preview"
            value={live.hearOriginal ? 'original' : 'enhanced'}
            options={[
              { value: 'original', label: 'Original' },
              { value: 'enhanced', label: 'Enhanced' },
            ]}
            onChange={(v) => {
              s.setLive({ hearOriginal: v === 'original' });
              if (!s.monitorOn) s.setMonitorOn(true);
            }}
          />
          <button className="btn" onClick={() => s.openModal({ testSound: true })}>
            <Icon name="record" size={14} style={{ color: 'var(--live)' }} />
            Test my sound
          </button>
          <button className="btn" aria-pressed={s.monitorOn} onClick={() => s.setMonitorOn(!s.monitorOn)} style={s.monitorOn ? { borderColor: 'var(--accent-border)', color: 'var(--accent-text)' } : undefined}>
            <Icon name="headphones" size={16} />
            {s.monitorOn ? 'Monitoring' : 'Monitor off'}
          </button>
          <div style={{ width: 1, height: 28, background: 'var(--border-control)' }} />
          <button
            type="button"
            role="switch"
            aria-checked={live.enhancementOn}
            onClick={() => s.setLive({ enhancementOn: !live.enhancementOn })}
            className="btn"
            style={{
              gap: 12,
              padding: '0 8px 0 16px',
              fontWeight: 600,
              background: live.enhancementOn ? 'var(--accent-tint)' : 'var(--bg-surface-2)',
              borderColor: live.enhancementOn ? 'var(--accent-border)' : 'var(--border-strong)',
              color: live.enhancementOn ? 'var(--accent-text)' : 'var(--text-secondary)',
            }}
          >
            {live.enhancementOn ? 'Enhancement on' : 'Bypassed — raw mic'}
            <span className="switch sm" aria-checked={live.enhancementOn} style={{ width: 40, height: 24 }}>
              <span style={{ width: 18, height: 18 }} />
            </span>
          </button>
        </div>
      </div>

      <UnpluggedBanner />
      <ClippingBanner />

      <section aria-label="Live voice" className="card row" style={{ height: 'clamp(300px, calc(100vh - 732px), 480px)', flexShrink: 0, overflow: 'hidden', alignItems: 'stretch' }} data-tour="live">
        <div className="col grow" style={{ gap: 16, padding: '26px 28px' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="row" style={{ gap: 10 }}>
              <span className="dot" style={{ background: m.speaking && !live.muted ? 'var(--live)' : 'var(--text-disabled)' }} />
              <h2 className="h3">Live voice</h2>
              <span className="small faint hide-narrow ellipsis">
                {live.muted ? 'Muted' : live.enhancementOn ? `Listening through the ${s.active.name} profile` : 'Enhancement bypassed'}
              </span>
            </div>
            <div className="row xsmall muted" style={{ gap: 18, whiteSpace: 'nowrap' }}>
              <span className="row" style={{ gap: 8 }}><span style={{ width: 14, height: 4, borderRadius: 2, background: 'var(--meter-raw)' }} />Your raw mic</span>
              <span className="row" style={{ gap: 8 }}><span style={{ width: 14, height: 4, borderRadius: 2, background: 'var(--accent)' }} />{live.enhancementOn ? 'Enhanced by Aurel' : 'Sent to apps'}</span>
            </div>
          </div>
          <Waveform fill emphasis={live.hearOriginal ? 'raw' : 'out'} />
          <div className="mono row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)' }}>
            <span>−12 s</span><span>−9 s</span><span>−6 s</span><span>−3 s</span><span>Now</span>
          </div>
        </div>
        <div className="col" style={{ width: 380, flexShrink: 0, borderLeft: '1px solid var(--border-subtle)', background: 'var(--bg-inset)', gap: 22, padding: '26px 28px' }} data-tour="loudness">
          <div className="col" style={{ gap: 6 }}>
            <span className="small faint">Output loudness</span>
            <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
              <span className="mono" style={{ fontSize: 52, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>{has ? signed(outLufs, 1).replace('+', '') : '—'}</span>
              <span className="muted" style={{ fontSize: 15 }}>LUFS</span>
            </div>
            <span className="small" style={{ color: statusColor }} role="status">{statusText}</span>
          </div>
          <div className="col" style={{ gap: 14 }}>
            <div className="col" style={{ gap: 7 }}>
              <div className="row xsmall muted" style={{ justifyContent: 'space-between' }}><span>Raw mic</span><span className="mono">{Number.isFinite(rawLufs) ? signed(rawLufs, 1).replace('+', '') : '—'}</span></div>
              <LevelBar db={m.raw.momentaryLufs} color="var(--meter-raw)" />
            </div>
            <div className="col" style={{ gap: 7 }}>
              <div className="row xsmall" style={{ justifyContent: 'space-between' }}><span className="muted">{live.enhancementOn ? 'Enhanced' : 'Sent to apps'}</span><span className="mono">{has ? signed(outLufs, 1).replace('+', '') : '—'}</span></div>
              <TargetBar db={live.muted ? -120 : live.enhancementOn ? m.out.momentaryLufs : m.raw.momentaryLufs} />
              <div className="mono row" style={{ justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)' }}><span>−60</span><span>−40</span><span>−20</span><span>0</span></div>
            </div>
          </div>
          <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, paddingTop: 18, borderTop: '1px solid var(--border-subtle)' }}>
            <Stat label="Voice lift" value={fmtDb(lift, 0)} />
            <Stat label="Noise floor" value={floorOut > -130 ? `${signed(floorOut, 0)} dB` : '—'} />
            <Stat label="True peak" value={truePeak > -100 ? `${signed(truePeak, 1)} dB` : '—'} warn={truePeak > working.limiter.ceilingDb + 0.2} />
          </div>
        </div>
      </section>

      <section aria-labelledby="profiles-h" className="col" style={{ gap: 14 }} data-tour="profiles">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row" style={{ alignItems: 'baseline', gap: 12 }}>
            <h2 id="profiles-h" className="h2">Sound profile</h2>
            <span className="small faint">Pick the character you want. Every profile keeps your Voice Boost.</span>
          </div>
          <button className="row small" style={{ gap: 6, fontWeight: 500, color: 'var(--accent-text)' }} onClick={() => s.setTab('finetune')}>
            Customize current profile <Icon name="chevronRight" size={14} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))`, gap: 16 }}>
          {cards.map((p) => {
            const selected = p.id === s.active.id;
            const bands = selected ? effectiveBands(working) : effectiveBands(p.settings);
            return (
              <button key={p.id} className="pick col" aria-pressed={selected} onClick={() => s.selectProfile(p.id)} style={{ height: 172, gap: 12, padding: '18px 20px' }}>
                {selected && (
                  <span className="row" style={{ position: 'absolute', right: 14, top: 14, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', justifyContent: 'center', color: 'var(--accent-ink)' }}>
                    <Icon name="check" size={12} strokeWidth={3} />
                  </span>
                )}
                <svg width="100%" height="40" viewBox="0 0 260 40" preserveAspectRatio="none" aria-hidden="true">
                  <path d={curvePath(bands, 260, 40)} fill="none" stroke={selected ? 'var(--accent)' : 'var(--meter-raw)'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
                <span className="row" style={{ gap: 8, fontSize: 16, fontWeight: 600 }}>
                  {p.name}
                  {selected && s.edited && <span className="badge">Edited</span>}
                </span>
                <span className="small muted" style={{ lineHeight: 1.45 }}>{p.description}</span>
                <span className="xsmall faint" style={{ marginTop: 'auto' }}>{p.tags}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Essential controls" style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24, minHeight: 0 }}>
        <div className="card col" style={{ gap: 16, padding: '22px 24px' }} data-tour="boost">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="row" style={{ gap: 10 }}>
              <h2 className="h3">Voice Boost</h2>
              <span className="badge">For soft speakers</span>
            </div>
            <span className="mono" style={{ fontSize: 22, fontWeight: 500 }}>{fmtDb(live.boostDb, 0)}</span>
          </div>
          <Slider label="Voice Boost amount" value={live.boostDb} min={0} max={BOOST_MAX_DB} step={1} valueText={fmtDb(live.boostDb, 0)} onChange={(v) => s.setLive({ boostDb: v })} />
          <div className="row xsmall faint" style={{ justifyContent: 'space-between' }}><span>Natural level</span><span>Broadcast loud</span></div>
          <p className="small muted" style={{ lineHeight: 1.5 }}>Adds clean gain after noise removal, so soft speech reaches broadcast loudness without lifting the room.</p>
          <div className="row" style={{ marginTop: 'auto', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
            <span className="small">Auto-level when I lean away</span>
            <Switch small label="Auto-level" checked={working.leveler.enabled} onChange={(v) => s.updateWorking((w) => void (w.leveler.enabled = v))} />
          </div>
        </div>

        <div className="card col" style={{ gap: 16, padding: '22px 24px' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 className="h3">Background noise</h2>
            <span className="mono small muted">Room {m.raw.noiseFloorDb > -130 ? `${signed(m.raw.noiseFloorDb, 0)} dB` : '—'}</span>
          </div>
          <Segmented<NoiseMode>
            fill
            label="Noise removal strength"
            value={noiseOn ? working.noise.mode : 'off'}
            options={(['off', 'light', 'balanced', 'strong'] as NoiseMode[]).map((v) => ({ value: v, label: NOISE_MODES[v].label }))}
            onChange={(v) => s.updateWorking((w) => setNoiseMode(w, v))}
          />
          <p className="small muted" style={{ lineHeight: 1.5 }}>{NOISE_MODES[noiseOn ? working.noise.mode : 'off'].desc}</p>
          <RemovingNow />
        </div>

        <div className="card col" style={{ gap: 16, padding: '22px 24px' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 className="h3">Tone</h2>
            <button className="small" style={{ fontWeight: 500, color: 'var(--accent-text)' }} onClick={() => s.setTab('finetune')}>Open equalizer</button>
          </div>
          <ToneSlider label="Warmth" value={working.tone.warmthDb} onChange={(v) => s.updateWorking((w) => void (w.tone.warmthDb = v))} />
          <ToneSlider label="Presence" value={working.tone.presenceDb} onChange={(v) => s.updateWorking((w) => void (w.tone.presenceDb = v))} />
          <p className="small faint" style={{ marginTop: 'auto', lineHeight: 1.5 }}>Warmth adds low-end body like a close-up broadcast mic. Presence brings words forward.</p>
        </div>
      </section>
    </div>
  );
}

function ToneSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row small" style={{ justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span className="mono muted">{fmtDb(value, 1)}</span>
      </div>
      <Slider label={label} value={value} min={-TONE_RANGE_DB} max={TONE_RANGE_DB} step={0.1} valueText={fmtDb(value, 1)} onChange={onChange} />
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="col" style={{ gap: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{label}</span>
      <span className="mono" style={{ fontSize: 15, fontWeight: 500, color: warn ? 'var(--error-text)' : undefined }}>{value}</span>
    </div>
  );
}

// Enhanced level bar with the broadcast target range marked.
function TargetBar({ db }: { db: number }) {
  const x = (v: number) => `${((v + 60) / 60) * 100}%`;
  return (
    <div style={{ position: 'relative' }}>
      <LevelBar db={db} />
      <span aria-hidden="true" style={{ position: 'absolute', top: -3, bottom: -3, left: x(TARGET_LOW), width: `${((TARGET_HIGH - TARGET_LOW) / 60) * 100}%`, border: '1.5px solid var(--success)', borderRadius: 3 }} />
    </div>
  );
}

function useHeldMax(v: number, holdMs: number): number {
  const ref = useRef({ v: -140, at: 0 });
  const now = performance.now();
  if (v >= ref.current.v || now - ref.current.at > holdMs) ref.current = { v, at: now };
  return ref.current.v;
}

function RemovingNow() {
  const s = useStudio();
  const m = useMeters(500);
  const counts = useRef({ pops: m.pops, clicks: m.clicks, popAt: 0, clickAt: 0 });
  const now = Date.now();
  const c = counts.current;
  if (m.pops > c.pops) { c.popAt = now; c.pops = m.pops; }
  if (m.clicks > c.clicks) { c.clickAt = now; c.clicks = m.clicks; }
  const w = s.working;
  const on = s.live.enhancementOn;
  const chips: string[] = [];
  if (on && w.noise.enabled && w.noise.mode !== 'off') {
    if (m.humDb > -80) chips.push('Steady hum');
    if (m.noiseInDb > -70) chips.push('Room noise');
    if (w.noise.reduceEcho && m.echo > 0.04) chips.push('Room echo');
  }
  if (on && w.clicks.enabled && now - c.clickAt < 15000) chips.push('Mouth clicks');
  if (on && w.pops.enabled && now - c.popAt < 15000) chips.push('Pops');
  return (
    <div className="row xsmall faint" style={{ marginTop: 'auto', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
      <span>Removing now</span>
      {chips.length ? chips.map((t) => <span key={t} className="chip" style={{ fontWeight: 400 }}>{t}</span>) : <span>Nothing right now</span>}
    </div>
  );
}

// Board 12 · Mic unplugged mid-meeting.
function UnpluggedBanner() {
  const s = useStudio();
  const lostAt = useRef<number | null>(null);
  const [, tick] = useState(0);
  const lost = s.status.inputLost || s.inputMissing;
  if (lost && lostAt.current === null) lostAt.current = Date.now();
  if (!lost) lostAt.current = null;
  useEffect(() => {
    if (!lost) return;
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [lost]);
  if (!lost) return null;
  const other = s.inputs.find((d) => d.deviceId !== s.prefs.inputId);
  const secs = Math.round((Date.now() - (lostAt.current || Date.now())) / 1000);
  return (
    <section role="alert" className="banner-error row" style={{ gap: 20, padding: '18px 22px', flexShrink: 0 }}>
      <span className="row" style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--error-tint)', justifyContent: 'center', color: 'var(--error-text)' }}>
        <Icon name="micOff" size={22} />
      </span>
      <div className="col grow" style={{ gap: 4 }}>
        <span className="h3">{s.inputLabel} was unplugged</span>
        <span className="small muted">Aurel keeps sending silence to CABLE Output, so your meeting won’t jump to a different mic. Plug it back in and your voice returns on its own, with the same profile and settings.</span>
        <span className="xsmall faint">Looking for it · lost {secs < 60 ? `${secs} seconds` : `${Math.round(secs / 60)} min`} ago</span>
      </div>
      {other && (
        <button className="btn btn-primary" onClick={() => s.setPrefs({ inputId: other.deviceId })}>
          Use {shortLabel(other.label)} for now
        </button>
      )}
      <button className="btn" onClick={() => s.setTab('settings')}>Choose another mic</button>
    </section>
  );
}

// Board 13 · Voice too loud (clipping).
function ClippingBanner() {
  const s = useStudio();
  const [clip, setClip] = useState<null | 'output' | 'input'>(null);
  const [dismissedAt, setDismissedAt] = useState(-Infinity);
  useEffect(() => {
    const hits: number[] = [];
    return engine.onMeters((m) => {
      const now = performance.now();
      if (m.raw.peakDb > -0.3) hits.push(now);
      else if (m.out.limiterDb < -6 && m.speaking) hits.push(-now);
      while (hits.length && Math.abs(hits[0]) < now - 5000) hits.shift();
      if (hits.length >= 3 && now - dismissedAt > 60000) setClip(hits.some((h) => h > 0) ? 'input' : 'output');
    });
  }, [dismissedAt]);
  if (!clip || !s.live.enhancementOn) return null;
  const lower = Math.max(0, s.live.boostDb - 4);
  const close = () => {
    setClip(null);
    setDismissedAt(performance.now());
  };
  return (
    <section role="alert" className="banner-error row" style={{ gap: 20, padding: '18px 22px', flexShrink: 0 }}>
      <span className="row" style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--error-tint)', justifyContent: 'center', color: 'var(--error-text)' }}>
        <Icon name="alert" size={22} />
      </span>
      <div className="col grow" style={{ gap: 4 }}>
        <span className="h3">{clip === 'input' ? 'Your mic itself is clipping' : 'Your voice is clipping'}</span>
        <span className="small muted">
          {clip === 'input'
            ? 'The signal is already distorted before Aurel gets it. Turn down the gain knob on your mic or interface, or lower the mic level in Windows sound settings.'
            : 'Loud words are hitting the ceiling and will sound crunchy to listeners. Aurel’s limiter is catching most of it, but not all.'}
        </span>
      </div>
      {clip === 'output' ? (
        <>
          <button className="btn btn-primary" onClick={() => { s.setLive({ boostDb: lower }); close(); }}>Lower boost to {fmtDb(lower, 0)}</button>
          <button className="btn" onClick={close}>Keep it loud</button>
        </>
      ) : (
        <>
          <button className="btn" onClick={() => window.studioAPI?.openSoundSettings()}>Open sound settings</button>
          <button className="btn btn-ghost" onClick={close}>Dismiss</button>
        </>
      )}
    </section>
  );
}
