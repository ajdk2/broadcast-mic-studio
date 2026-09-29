import React, { useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../audio/engine';
import { renderOffline } from '../audio/chain';
import { VoiceAnalysis, analyzeVoice, describeLevel, describeRoom, recommendBoost } from '../audio/analysis';
import { ClipPlayer, fmtTime } from '../audio/playback';
import { useMeters, useStudio } from '../state/store';
import { CABLE_PLAYBACK_NAME, CABLE_RECORDING_NAME, findCablePlayback } from '../routing';
import { BUILT_IN_PROFILES, NoiseMode, cloneSettings, fmtDb, setNoiseMode, signed } from '../voice/model';
import { Icon, Logo, SegmentMeter } from '../ui/kit';
import { AudioDeviceOption } from '../types';

const CLIP_SECONDS = 10;
const LINE = 'The morning light spilled over the harbor as the first boats headed out, and the town slowly woke to the sound of gulls and distant engines.';

interface Measured {
  samples: Float32Array;
  sampleRate: number;
  analysis: VoiceAnalysis;
  boostDb: number;
  noise: NoiseMode;
}

export function VoiceCheckWizard() {
  const s = useStudio();
  const [step, setStep] = useState(1);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [profileId, setProfileId] = useState(s.active.builtIn ? s.active.id : 'broadcast');

  const finish = (apply: boolean) => {
    if (apply && measured) {
      s.setLive({ boostDb: measured.boostDb });
      s.setMicCorrection({ ...measured.analysis.correction, measured: true, enabled: true });
    }
    if (apply) {
      const p = s.profiles.find((x) => x.id === profileId);
      if (p) {
        s.selectProfile(p.id);
        if (measured) s.updateWorking((w) => setNoiseMode(w, measured.noise));
      }
    }
    s.setPrefs({ setupDone: true });
    s.openModal({ setup: false });
    s.setTab('studio');
  };

  const noMic = s.inputs.length === 0 && (s.status.error === 'no-mic' || s.status.state !== 'starting');
  const steps = [
    { title: 'Microphone', sub: noMic ? 'No microphone found' : step > 1 ? `${short(s.inputLabel)} selected` : 'Pick the mic you speak into' },
    { title: 'Voice check', sub: measured ? `${describeLevel(measured.analysis.speechLufs).label} voice · ${signed(measured.analysis.speechLufs, 0)} LUFS` : 'Measure how loudly you speak' },
    { title: 'Choose your sound', sub: step > 3 ? s.profiles.find((p) => p.id === profileId)?.name || '' : 'Broadcast, podcast, or clear speech' },
    { title: 'Connect your apps', sub: 'Zoom, Teams, Discord, OBS and more' },
  ];

  return (
    <div style={{ flexGrow: 1, display: 'flex', minHeight: 0 }}>
      <aside className="col" style={{ width: 400, flexShrink: 0, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-titlebar)', gap: 48, padding: '48px 40px 36px' }}>
        <div className="col" style={{ gap: 20 }}>
          <Logo size={44} />
          <div className="col" style={{ gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>Set up Aurel</span>
            <span className="muted" style={{ lineHeight: 1.5 }}>Four quick steps to a broadcast-quality voice. About two minutes.</span>
          </div>
        </div>
        <ol aria-label="Setup steps" className="col" style={{ listStyle: 'none' }}>
          {steps.map((st, i) => {
            const n = i + 1;
            const done = n < step;
            const current = n === step;
            const error = n === 1 && noMic && current;
            return (
              <li key={n} aria-current={current ? 'step' : undefined} className="row" style={{ gap: 16, alignItems: 'stretch' }}>
                <div className="col" style={{ alignItems: 'center' }}>
                  <span className="row mono" style={{ width: 28, height: 28, borderRadius: '50%', justifyContent: 'center', fontSize: 13, fontWeight: 600, background: error ? 'var(--live)' : done ? 'var(--success-tint)' : current ? 'var(--accent)' : 'transparent', color: error || current ? 'var(--accent-ink)' : done ? 'var(--success)' : 'var(--text-tertiary)', border: done || current || error ? 0 : '1.5px solid var(--border-hover)' }}>
                    {error ? '!' : done ? <Icon name="check" size={14} strokeWidth={3} /> : n}
                  </span>
                  {n < 4 && <span style={{ width: 2, flexGrow: 1, minHeight: 34, background: done ? 'var(--success-tint)' : 'var(--border-control)' }} />}
                </div>
                <div className="col" style={{ gap: 4, paddingTop: 4, paddingBottom: n < 4 ? 22 : 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: current ? 'var(--text-primary)' : done ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{st.title}</span>
                  <span className="small" style={{ color: current || done ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{st.sub}</span>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="row" style={{ marginTop: 'auto', gap: 12, padding: 16, borderRadius: 12, background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', alignItems: 'flex-start' }}>
          <Icon name="shield" size={18} style={{ color: 'var(--text-secondary)', marginTop: 1 }} />
          <span className="small muted" style={{ lineHeight: 1.5 }}>Your voice never leaves this PC. Aurel works fully offline and keeps no recordings.</span>
        </div>
      </aside>

      <main className="col grow" style={{ gap: 32, padding: '56px 80px 44px', overflow: 'auto' }}>
        {step === 1 && (noMic ? <NoMicStep onSkip={() => finish(false)} /> : <MicStep onNext={() => setStep(2)} onSkip={() => finish(false)} />)}
        {step === 2 && <VoiceStep measured={measured} onMeasured={setMeasured} profileId={profileId} onBack={() => setStep(1)} onNext={() => setStep(3)} onSkip={() => finish(false)} />}
        {step === 3 && <SoundStep measured={measured} profileId={profileId} onPick={setProfileId} onBack={() => setStep(2)} onNext={() => setStep(4)} onSkip={() => finish(false)} />}
        {step === 4 && <ConnectStep measured={measured} profileId={profileId} onBack={() => setStep(3)} onFinish={() => finish(true)} onSkip={() => finish(false)} />}
      </main>
    </div>
  );
}

const short = (label: string) => (label.length > 32 ? label.slice(0, 30) + '…' : label);

function Head({ eyebrow, title, text, error }: { eyebrow: string; title: string; text: string; error?: boolean }) {
  return (
    <div className="col" style={{ gap: 12 }}>
      <span className="eyebrow" style={error ? { color: 'var(--error-text)' } : undefined}>{eyebrow}</span>
      <h1 className="display">{title}</h1>
      <p className="muted" style={{ maxWidth: 860, fontSize: 16, lineHeight: 1.55 }}>{text}</p>
    </div>
  );
}

function Nav({ onSkip, onBack, children }: { onSkip: () => void; onBack?: () => void; children?: React.ReactNode }) {
  return (
    <div className="row" style={{ marginTop: 'auto', justifyContent: 'space-between' }}>
      <button className="btn btn-ghost btn-lg" style={{ padding: '0 4px' }} onClick={onSkip}>Skip setup</button>
      <div className="row" style={{ gap: 12 }}>
        {onBack && <button className="btn btn-lg" onClick={onBack}>Back</button>}
        {children}
      </div>
    </div>
  );
}

// ---- Step 1 ---------------------------------------------------------------

// Opens every mic at once for a few seconds of level metering, so "the one that hears you best
// lights up" (board 08).
function useAllMicLevels(inputs: AudioDeviceOption[]): Record<string, number> {
  const [levels, setLevels] = useState<Record<string, number>>({});
  const ids = inputs.map((d) => d.deviceId).join('|');
  useEffect(() => {
    let alive = true;
    const ctx = new AudioContext();
    const streams: MediaStream[] = [];
    const analysers: [string, AnalyserNode][] = [];
    (async () => {
      for (const d of inputs) {
        try {
          const st = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: d.deviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
          if (!alive) { st.getTracks().forEach((t) => t.stop()); return; }
          streams.push(st);
          const a = ctx.createAnalyser();
          a.fftSize = 1024;
          ctx.createMediaStreamSource(st).connect(a);
          analysers.push([d.deviceId, a]);
        } catch {
          /* busy or blocked: leave it dark */
        }
      }
    })();
    const buf = new Float32Array(1024);
    const t = setInterval(() => {
      const next: Record<string, number> = {};
      for (const [id, a] of analysers) {
        a.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        next[id] = 10 * Math.log10(sum / buf.length + 1e-12);
      }
      setLevels((prev) => {
        const out: Record<string, number> = {};
        for (const id of Object.keys(next)) out[id] = Math.max(next[id], (prev[id] ?? -120) - 1.5); // gentle fall
        return out;
      });
    }, 80);
    return () => {
      alive = false;
      clearInterval(t);
      streams.forEach((st) => st.getTracks().forEach((tr) => tr.stop()));
      ctx.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return levels;
}

function micKind(label: string): { icon: string; sub: string } {
  const l = label.toLowerCase();
  if (/hands-free|headset|airpods|bluetooth|bt /.test(l)) return { icon: 'headphones', sub: 'Headset · calls can sound thin' };
  if (/array|realtek|built-in|internal|laptop/.test(l)) return { icon: 'laptop', sub: 'Built into this PC' };
  if (/usb/.test(l)) return { icon: 'mic', sub: 'USB microphone' };
  if (/interface|focusrite|scarlett|motu|audient|behringer|steinberg|audio box|line/.test(l)) return { icon: 'mic', sub: 'Audio interface' };
  return { icon: 'mic', sub: 'Microphone' };
}

function MicStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const s = useStudio();
  const levels = useAllMicLevels(s.inputs);
  const best = Object.entries(levels).sort((a, b) => b[1] - a[1])[0];
  const loudest = best && best[1] > -50 ? best[0] : null;
  return (
    <>
      <Head eyebrow="Step 1 of 4" title="Which microphone do you speak into?" text={`We found ${s.inputs.length === 1 ? 'one' : s.inputs.length} on this PC. Say a few words — the one that hears you best lights up.`} />
      <div role="radiogroup" aria-label="Microphone" className="col" style={{ gap: 12 }}>
        {s.inputs.map((d) => {
          const sel = d.deviceId === s.prefs.inputId;
          const lvl = levels[d.deviceId] ?? -120;
          const kind = micKind(d.label);
          return (
            <button key={d.deviceId} role="radio" aria-checked={sel} className="pick row" onClick={() => s.setPrefs({ inputId: d.deviceId })} style={{ height: 96, gap: 20, padding: '0 24px', borderRadius: 16 }}>
              <span className="row" style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${sel ? 'var(--accent)' : 'var(--border-hover)'}`, justifyContent: 'center' }}>
                {sel && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />}
              </span>
              <span className="row" style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-control)', justifyContent: 'center' }}><Icon name={kind.icon} size={22} /></span>
              <span className="col grow" style={{ gap: 4 }}>
                <span className="row" style={{ gap: 10 }}>
                  <span className="ellipsis" style={{ fontSize: 16, fontWeight: 600 }}>{d.label}</span>
                  {loudest === d.deviceId && <span className="badge" style={{ background: 'var(--success-tint)', color: 'var(--success-text)' }}>Hears you best</span>}
                  {kind.icon === 'headphones' && <span className="badge">Thin sound on calls</span>}
                </span>
                <span className="small faint">{kind.sub}</span>
              </span>
              <span className="col" style={{ alignItems: 'flex-end', gap: 6 }}>
                <SegmentMeter db={lvl} color={lvl > -40 ? 'var(--text-primary)' : 'var(--meter-raw)'} />
                <span className="xsmall faint">{lvl > -35 ? 'Hears you clearly' : lvl > -55 ? 'Hears something' : 'Quiet'}</span>
              </span>
            </button>
          );
        })}
      </div>
      <section aria-labelledby="tip-h" className="card row" style={{ gap: 20, padding: 24 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
          <rect width="120" height="120" rx="12" fill="var(--bg-inset)" />
          <rect x="18" y="38" width="30" height="44" rx="15" fill="none" stroke="var(--meter-raw)" strokeWidth="2" />
          <path d="M48 60h26" stroke="var(--accent)" strokeWidth="2" strokeDasharray="3 4" />
          <circle cx="92" cy="60" r="14" fill="none" stroke="var(--text-primary)" strokeWidth="2" />
          <path d="M86 66q6 4 12 0" stroke="var(--text-primary)" strokeWidth="2" fill="none" strokeLinecap="round" />
          <text x="61" y="52" fill="var(--accent-text)" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">5–15 cm</text>
        </svg>
        <div className="col" style={{ gap: 8 }}>
          <h2 id="tip-h" className="h3">Get the most from any mic</h2>
          <p className="small muted" style={{ lineHeight: 1.6, maxWidth: 760 }}>Stay 5–15 cm from the mic and speak slightly past it, not straight into it, to avoid pops. Closer means more voice and less room. Aurel makes up the volume, so you never have to lean in.</p>
        </div>
      </section>
      <Nav onSkip={onSkip}>
        <button className="btn btn-lg btn-primary" disabled={!s.prefs.inputId} onClick={onNext}>Continue <Icon name="arrowRight" size={15} /></button>
      </Nav>
    </>
  );
}

// Board 09 · No microphone found.
function NoMicStep({ onSkip }: { onSkip: () => void }) {
  const s = useStudio();
  useEffect(() => {
    const t = setInterval(() => s.refreshDevices(), 3000);
    return () => clearInterval(t);
  }, [s]);
  const fixes = [
    { t: 'Let apps use your microphone', d: 'Windows privacy settings can block every app, including Aurel. This is the most common cause.', a: 'Open privacy settings', fn: () => window.studioAPI?.openMicPrivacySettings(), primary: true },
    { t: 'Plug your mic straight into the PC', d: 'USB hubs and front-panel ports sometimes don’t give the mic enough power. Try a port on the back.' },
    { t: 'Using an XLR mic? It needs an interface', d: 'XLR mics can’t plug into a PC directly. Connect an audio interface over USB and pick that here.' },
    { t: 'Check it’s enabled in Sound settings', d: 'A disabled device is hidden from every app.', a: 'Open Sound settings', fn: () => window.studioAPI?.openSoundSettings() },
  ];
  return (
    <>
      <Head error eyebrow="Step 1 of 4 · Needs attention" title="We can’t find a microphone" text="Aurel needs a mic to listen to. Nothing is plugged in, or Windows is keeping it from apps." />
      <section aria-label="No microphone" className="row" style={{ gap: 40, padding: 40, borderRadius: 18, background: 'var(--bg-surface)', border: '1px dashed var(--border-hover)' }}>
        <span className="row" style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--error-tint)', justifyContent: 'center', color: 'var(--error-text)' }}><Icon name="micOff" size={48} strokeWidth={1.6} /></span>
        <div className="col grow" style={{ gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>No input devices on this PC</span>
          <span className="row muted" style={{ gap: 8 }}><Icon name="refresh" size={15} />Aurel checks again every few seconds. Plug in your mic and this page moves on by itself.</span>
        </div>
        <button className="btn btn-lg" onClick={() => { s.refreshDevices(); s.restartEngine(); }}>Check now</button>
      </section>
      <section aria-labelledby="fix-h" className="card col" style={{ gap: 4, padding: '24px 28px 12px' }}>
        <h2 id="fix-h" className="h3" style={{ marginBottom: 12 }}>Things that usually fix it</h2>
        {fixes.map((f, i) => (
          <div key={f.t} className="row divider-top" style={{ minHeight: 72, gap: 18 }}>
            <span className="row mono" style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-control)', fontSize: 12, fontWeight: 600, justifyContent: 'center' }}>{i + 1}</span>
            <div className="col grow" style={{ gap: 3 }}><span style={{ fontWeight: 500 }}>{f.t}</span><span className="small faint">{f.d}</span></div>
            {f.a && window.studioAPI && <button className={f.primary ? 'btn btn-primary' : 'btn'} onClick={f.fn}>{f.a}</button>}
          </div>
        ))}
      </section>
      <Nav onSkip={onSkip}>
        <span className="small faint">Continue unlocks when a mic is found</span>
      </Nav>
    </>
  );
}

// ---- Step 2 ---------------------------------------------------------------

function VoiceStep({ measured, onMeasured, profileId, onBack, onNext, onSkip }: { measured: Measured | null; onMeasured: (m: Measured) => void; profileId: string; onBack: () => void; onNext: () => void; onSkip: () => void }) {
  const s = useStudio();
  const m = useMeters(60);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [peak, setPeak] = useState(-120);
  const playerRef = useRef<ClipPlayer | null>(null);
  const [playing, setPlaying] = useState<'before' | 'after' | null>(null);
  const recording = progress !== null && progress < 1;

  useEffect(() => {
    if (recording) setPeak((p) => Math.max(p, m.raw.peakDb));
  }, [m, recording]);

  const record = async () => {
    setError(null);
    setPeak(-120);
    playerRef.current?.dispose();
    playerRef.current = null;
    try {
      setProgress(0);
      const { samples, sampleRate } = await engine.record(CLIP_SECONDS, setProgress);
      const analysis = analyzeVoice(samples, sampleRate);
      if (analysis.speechSeconds < 2) {
        setError('We didn’t hear enough speech. Read the line out loud, then try again.');
        setProgress(null);
        return;
      }
      const room = describeRoom(analysis.noiseDb);
      onMeasured({
        samples,
        sampleRate,
        analysis,
        boostDb: recommendBoost(analysis.speechLufs),
        noise: room.tone === 'error' ? 'strong' : 'balanced',
      });
    } catch (e) {
      setError((e as Error).message);
      setProgress(null);
    }
  };

  useEffect(() => () => playerRef.current?.dispose(), []);

  const hear = async (which: 'before' | 'after') => {
    if (!measured) return;
    if (playing === which) {
      playerRef.current?.pause();
      setPlaying(null);
      return;
    }
    if (!playerRef.current) {
      const p = new ClipPlayer(measured.sampleRate, s.prefs.monitorId);
      p.onProgress = (_t, on) => !on && setPlaying(null);
      await p.set('before', measured.samples);
      const prof = s.profiles.find((x) => x.id === profileId) || BUILT_IN_PROFILES[0];
      const settings = { ...cloneSettings(prof.settings), micCorrection: { ...s.micCorrection, ...measured.analysis.correction, measured: true, enabled: true } };
      setNoiseMode(settings, measured.noise);
      const after = await renderOffline(measured.samples, measured.sampleRate, settings, { ...s.live, boostDb: measured.boostDb, enhancementOn: true, muted: false });
      await p.set('after', after);
      playerRef.current = p;
    }
    await playerRef.current.play(which, 0);
    setPlaying(which);
  };

  const a = measured?.analysis;
  const level = a ? describeLevel(a.speechLufs) : null;
  const room = a ? describeRoom(a.noiseDb) : null;
  const toneClass = (t: 'ok' | 'warn' | 'error') => (t === 'ok' ? 'badge chip-ok' : t === 'warn' ? 'badge' : 'badge chip-error');
  const liveDb = recording ? m.raw.momentaryLufs : a ? a.speechLufs : -120;
  const secs = progress !== null ? progress * CLIP_SECONDS : a ? CLIP_SECONDS : 0;
  const readTo = Math.round(LINE.length * Math.min(1, secs / (CLIP_SECONDS * 0.85)));

  return (
    <>
      <Head eyebrow="Step 2 of 4" title="Let’s hear your normal speaking voice" text="Read the line below the way you usually talk in meetings. Don’t lean in or speak up — Aurel works best when it hears your real level." />
      <section aria-label="Read aloud" className="card col" style={{ gap: 28, padding: 32, borderRadius: 18 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="dot" style={{ width: 10, height: 10, background: recording ? 'var(--live)' : 'var(--text-disabled)' }} />
            <span style={{ fontWeight: 600 }}>{recording ? 'Listening' : a ? 'Done' : 'Ready'}</span>
            <span className="mono small faint">{secs.toFixed(1)} s of {CLIP_SECONDS} s</span>
          </div>
          <div style={{ width: 220, height: 6, borderRadius: 3, background: 'var(--meter-off)', overflow: 'hidden' }}>
            <div style={{ width: `${(secs / CLIP_SECONDS) * 100}%`, height: '100%', background: 'var(--text-primary)' }} />
          </div>
        </div>
        <p style={{ fontSize: 30, lineHeight: 1.4, fontWeight: 500, letterSpacing: '-0.015em', textWrap: 'pretty' } as React.CSSProperties}>
          “{LINE.slice(0, readTo)}<span className="faint">{LINE.slice(readTo)}</span>”
        </p>
        <div className="col" style={{ gap: 10 }}>
          <LevelMeter db={liveDb} peak={recording || a ? Math.max(peak, a?.peakDb ?? -120) : -120} />
          <div className="mono row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)' }}><span>−60 dB</span><span>−48</span><span>−36</span><span>−24</span><span>−12</span><span>0</span></div>
          <div className="row xsmall muted" style={{ gap: 24 }}>
            <span className="row" style={{ gap: 8 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--text-primary)' }} />Your level now</span>
            <span className="row" style={{ gap: 8 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--meter-raw)' }} />Your loudest word</span>
            <span className="row" style={{ gap: 8 }}><span style={{ width: 14, height: 6, border: '1.5px solid var(--range)', borderBottom: 0 }} />Typical speaking range</span>
          </div>
        </div>
        {!a && !recording && (
          <button className="btn btn-lg btn-primary" style={{ alignSelf: 'flex-start' }} onClick={record} disabled={s.status.state !== 'running'}>
            <Icon name="record" size={14} />Start — then read the line
          </button>
        )}
        {error && <p className="small" role="alert" style={{ color: 'var(--error-text)' }}>{error}</p>}
        {s.status.state !== 'running' && <p className="small faint">Waiting for the microphone…</p>}
      </section>

      {a && level && room && (
        <>
          <section aria-label="What we heard" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
            <div className="card col" style={{ gap: 14, padding: 24 }}>
              <span className="small faint">Your speaking level</span>
              <div className="row" style={{ alignItems: 'baseline', gap: 10 }}><span className="mono" style={{ fontSize: 34, fontWeight: 500, letterSpacing: '-0.02em' }}>{signed(a.speechLufs, 0)}</span><span className="muted">LUFS</span><span className={toneClass(level.tone)} style={{ marginLeft: 6 }}>{level.label}</span></div>
              <span className="small muted" style={{ lineHeight: 1.5 }}>{a.speechLufs < -20 ? `About ${Math.round(-16 - a.speechLufs)} dB below a broadcast voice. Aurel will lift it cleanly.` : 'Already close to broadcast loudness.'}</span>
            </div>
            <div className="card col" style={{ gap: 14, padding: 24 }}>
              <span className="small faint">Room noise</span>
              <div className="row" style={{ alignItems: 'baseline', gap: 10 }}><span className="mono" style={{ fontSize: 34, fontWeight: 500, letterSpacing: '-0.02em' }}>{signed(a.noiseDb, 0)}</span><span className="muted">dB</span><span className={toneClass(room.tone)} style={{ marginLeft: 6 }}>{room.label}</span></div>
              <span className="small muted" style={{ lineHeight: 1.5 }}>{room.text}</span>
            </div>
            <div className="card col" style={{ gap: 14, padding: 24 }}>
              <span className="small faint">Microphone</span>
              <span className="ellipsis" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.4 }}>{s.inputLabel}</span>
              <span className="small muted" style={{ lineHeight: 1.5 }}>{a.notes.length ? `Mic correction measured: ${a.notes.join(', ')}.` : 'Mic correction measured: your mic is already fairly even.'} Stay 5–15 cm away for the fullest tone.</span>
            </div>
          </section>
          <section aria-label="Recommendation" className="banner-accent row" style={{ gap: 24, padding: '22px 24px' }}>
            <span className="row" style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent)', justifyContent: 'center', color: 'var(--accent-ink)' }}><Icon name="sparkle" size={22} strokeWidth={2} /></span>
            <div className="col grow" style={{ gap: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Recommended for you: {s.profiles.find((p) => p.id === profileId)?.name} profile with Voice Boost {fmtDb(measured!.boostDb, 0)}</span>
              <span style={{ color: 'var(--accent-soft-text)' }}>Brings your voice to about −16 LUFS, the loudness podcasts and radio use, while keeping the room {measured!.noise === 'strong' ? 'quiet' : 'silent'}.</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-outline-accent" onClick={() => hear('before')}><Icon name={playing === 'before' ? 'pause' : 'play'} size={14} />Hear before</button>
              <button className="btn btn-primary" onClick={() => hear('after')}><Icon name={playing === 'after' ? 'pause' : 'play'} size={14} />Hear after</button>
            </div>
          </section>
        </>
      )}

      <Nav onSkip={onSkip} onBack={onBack}>
        {(a || error) && !recording && <button className="btn btn-lg" onClick={record}><Icon name="retry" size={15} />Record again</button>}
        <button className="btn btn-lg btn-primary" disabled={!a} onClick={onNext}>Continue <Icon name="arrowRight" size={15} /></button>
      </Nav>
    </>
  );
}

function LevelMeter({ db, peak }: { db: number; peak: number }) {
  const N = 72;
  const step = 18;
  const lit = Math.round(Math.max(0, Math.min(1, (db + 60) / 60)) * N);
  const pk = Math.round(Math.max(0, Math.min(1, (peak + 60) / 60)) * N);
  return (
    <svg width="100%" height="44" viewBox={`0 0 ${N * step} 44`} preserveAspectRatio="none" role="img" aria-label={`Input level ${Math.round(db)} dB`}>
      <path d={`M${24 * step} 8V2H${40 * step - 4}V8`} fill="none" stroke="var(--range)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {Array.from({ length: N }, (_, i) => (
        <rect key={i} x={i * step} y={14} width={14} height={30} rx={2} fill={i < lit ? 'var(--text-primary)' : i === pk - 1 && pk > lit ? 'var(--meter-raw)' : 'var(--meter-off)'} />
      ))}
    </svg>
  );
}

// ---- Step 3 ---------------------------------------------------------------

function SoundStep({ measured, profileId, onPick, onBack, onNext, onSkip }: { measured: Measured | null; profileId: string; onPick: (id: string) => void; onBack: () => void; onNext: () => void; onSkip: () => void }) {
  const s = useStudio();
  const [key, setKey] = useState<string>(profileId);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const player = useMemo(() => (measured ? new ClipPlayer(measured.sampleRate, s.prefs.monitorId) : null), [measured, s.prefs.monitorId]);
  const profiles = s.profiles.filter((p) => p.builtIn);

  useEffect(() => {
    if (!player) return;
    player.setLoop(true);
    player.onProgress = (t, on) => { setPos(t); setPlaying(on); };
    return () => player.dispose();
  }, [player]);

  const ensure = async (k: string) => {
    if (!player || !measured || player.has(k)) return;
    if (k === 'original') return player.set(k, measured.samples);
    const prof = s.profiles.find((x) => x.id === k)!;
    const settings = { ...cloneSettings(prof.settings), micCorrection: { ...s.micCorrection, ...measured.analysis.correction, measured: true, enabled: true } };
    setNoiseMode(settings, measured.noise);
    await player.set(k, await renderOffline(measured.samples, measured.sampleRate, settings, { ...s.live, boostDb: measured.boostDb, enhancementOn: true, muted: false }));
  };

  const listen = async (k: string) => {
    if (!player) return;
    setBusy(true);
    await ensure(k);
    setBusy(false);
    setKey(k);
    if (k !== 'original') onPick(k);
    if (player.playing) await player.switchTo(k);
    else await player.play(k);
  };

  const recommended = measured?.noise === 'strong' ? 'clear' : 'broadcast';
  return (
    <>
      <Head
        eyebrow="Step 3 of 4"
        title="Choose how you want to sound"
        text={measured ? `Play your own voice from the voice check through each profile. Your Voice Boost of ${fmtDb(measured.boostDb, 0)} is already applied. You can change this any time.` : 'Pick a starting sound. You can change it any time, and hear it on your own voice after a voice check.'}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 16 }}>
        {profiles.map((p) => (
          <button key={p.id} className="pick col" aria-pressed={p.id === profileId} onClick={() => (measured ? listen(p.id) : onPick(p.id))} style={{ gap: 12, padding: '20px', minHeight: 190 }}>
            {p.id === recommended && <span className="badge" style={{ alignSelf: 'flex-start' }}>Recommended for you</span>}
            <span style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</span>
            <span className="small muted" style={{ lineHeight: 1.45 }}>{p.description}</span>
            {measured && (
              <span className="row small" style={{ marginTop: 'auto', gap: 8, fontWeight: 500, color: 'var(--accent-text)' }}>
                <Icon name={playing && key === p.id ? 'pause' : 'play'} size={12} />
                {playing && key === p.id ? 'Playing' : 'Play my voice'}
              </span>
            )}
          </button>
        ))}
      </div>
      {measured && player && (
        <section className="card row" style={{ gap: 20, padding: '18px 24px' }}>
          <button className="row" aria-label={playing ? 'Pause' : 'Play'} onClick={() => (playing ? player.pause() : listen(key))} style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', justifyContent: 'center' }}>
            <Icon name={playing ? 'pause' : 'play'} size={16} />
          </button>
          <div className="col grow" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>{busy ? 'Preparing…' : key === 'original' ? 'Original · from your voice check' : `${s.profiles.find((p) => p.id === key)?.name} · from your voice check`}</span>
              <span className="mono small faint">{fmtTime(pos)} / {fmtTime(player.duration || CLIP_SECONDS)}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--meter-off)' }}><div style={{ width: `${(pos / (player.duration || CLIP_SECONDS)) * 100}%`, height: '100%', borderRadius: 2, background: 'var(--accent)' }} /></div>
          </div>
          <button className="btn" aria-pressed={key === 'original'} onClick={() => listen('original')}>Original</button>
        </section>
      )}
      <p className="small faint">The 10-second clip stays on this PC and is deleted when setup finishes.</p>
      <Nav onSkip={onSkip} onBack={onBack}>
        <button className="btn btn-lg btn-primary" onClick={() => { player?.pause(); onNext(); }}>Continue <Icon name="arrowRight" size={15} /></button>
      </Nav>
    </>
  );
}

// ---- Step 4 ---------------------------------------------------------------

function ConnectStep({ measured, profileId, onBack, onFinish, onSkip }: { measured: Measured | null; profileId: string; onBack: () => void; onFinish: () => void; onSkip: () => void }) {
  const s = useStudio();
  const cable = findCablePlayback(s.outputs);
  return (
    <>
      <Head eyebrow="Step 4 of 4" title="Send your new voice to your apps" text="Aurel sends your enhanced voice through VB-Audio Cable, a free virtual cable for Windows. In each app, choose CABLE Output as the microphone." />
      <section aria-label="VB-Audio Cable" className={cable ? 'card row' : 'banner-accent row'} style={{ gap: 28, padding: '28px 32px', borderRadius: 18 }}>
        <span className="row" style={{ width: 56, height: 56, borderRadius: 14, background: cable ? 'var(--success-tint)' : 'var(--accent)', justifyContent: 'center', color: cable ? 'var(--success-text)' : 'var(--accent-ink)' }}>
          <Icon name={cable ? 'check' : 'download'} size={26} strokeWidth={cable ? 2.4 : 1.8} />
        </span>
        <div className="col grow" style={{ gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{cable ? 'VB-Audio Cable is installed' : 'Install VB-Audio Cable to reach your apps'}</span>
          <span style={{ lineHeight: 1.5, color: cable ? 'var(--text-secondary)' : 'var(--accent-soft-text)' }}>
            {cable ? `Aurel plays your voice into ${CABLE_PLAYBACK_NAME}. Apps hear it on ${CABLE_RECORDING_NAME}.` : 'It’s free and takes about a minute. Run the installer as administrator, then restart your PC. Aurel finds the cable automatically.'}
          </span>
        </div>
        {!cable && <button className="btn btn-lg btn-primary" onClick={() => window.studioAPI?.openVBCableFolder()}>Get VB-Cable</button>}
      </section>
      <section aria-labelledby="found-h" className="col" style={{ gap: 14 }}>
        <div className="row" style={{ alignItems: 'baseline', gap: 12 }}>
          <h2 id="found-h" className="h2">Pick CABLE Output in each app</h2>
          <span className="small faint">Also turn off the app’s own noise suppression. Aurel already does it.</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          {[
            { mono: 'Te', name: 'Microsoft Teams', path: 'Settings › Devices › Microphone' },
            { mono: 'Zo', name: 'Zoom Workplace', path: 'Settings › Audio › Microphone' },
            { mono: 'Ob', name: 'OBS Studio', path: 'Settings › Audio › Mic/Auxiliary Audio' },
            { mono: 'Di', name: 'Discord', path: 'User Settings › Voice & Video › Input Device' },
          ].map((a) => (
            <div key={a.mono} className="card col" style={{ gap: 14, padding: 20, borderRadius: 14 }}>
              <div className="row" style={{ gap: 12 }}>
                <span className="row" style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--bg-selected)', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>{a.mono}</span>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{a.name}</span>
              </div>
              <span className="small muted" style={{ lineHeight: 1.5 }}>{a.path}</span>
            </div>
          ))}
        </div>
      </section>
      <section aria-label="Your setup" className="card row" style={{ gap: 20, padding: '22px 28px', flexWrap: 'wrap' }}>
        <span className="overline" style={{ width: 110 }}>Your setup</span>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{s.inputLabel}</span>
        <Icon name="arrowRight" size={18} style={{ color: 'var(--text-tertiary)' }} />
        <span style={{ fontSize: 15, fontWeight: 500 }}>{s.profiles.find((p) => p.id === profileId)?.name}</span>
        <span className="mono small faint">{fmtDb(measured?.boostDb ?? s.live.boostDb, 0)} · noise {measured ? (measured.noise === 'strong' ? 'Strong' : 'Balanced') : 'Balanced'}</span>
        <Icon name="arrowRight" size={18} style={{ color: 'var(--text-tertiary)' }} />
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--accent-text)' }}>CABLE Output</span>
        {window.studioAPI && (
          <span className="row small muted" style={{ marginLeft: 'auto', gap: 8 }}><Icon name="studio" size={14} />Lives in the system tray after setup</span>
        )}
      </section>
      <Nav onSkip={onSkip} onBack={onBack}>
        <button className="btn btn-lg btn-primary" onClick={onFinish}>Finish and open Aurel <Icon name="arrowRight" size={15} /></button>
      </Nav>
    </>
  );
}
