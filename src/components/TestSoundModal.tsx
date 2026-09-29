import React, { useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../audio/engine';
import { renderOffline } from '../audio/chain';
import { ClipPlayer, fmtTime } from '../audio/playback';
import { useMeters, useStudio } from '../state/store';
import { Icon, Modal, Segmented, Switch } from '../ui/kit';

const SECONDS = 10;

// Board 29 · Test my sound (record & compare).
export function TestSoundModal() {
  const s = useStudio();
  const close = () => s.openModal({ testSound: false });
  const [clip, setClip] = useState<{ samples: Float32Array; sampleRate: number } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [ab, setAb] = useState<'original' | 'enhanced'>('enhanced');
  const [prof, setProf] = useState(s.active.id);
  const [loop, setLoop] = useState(true);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const player = useMemo(() => (clip ? new ClipPlayer(clip.sampleRate, s.prefs.monitorId) : null), [clip, s.prefs.monitorId]);
  const m = useMeters(80);
  const liveBars = useRef<number[]>([]);
  const recording = progress !== null && progress < 1;
  if (recording) liveBars.current = [...liveBars.current, m.raw.peakDb].slice(-140);

  useEffect(() => {
    if (!player) return;
    player.setLoop(loop);
    player.onProgress = (t, on) => { setPos(t); setPlaying(on); };
    return () => player.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);
  useEffect(() => () => engine.cancelRecording(), []);

  const record = async () => {
    setError(null);
    player?.pause();
    liveBars.current = [];
    try {
      setProgress(0);
      const c = await engine.record(SECONDS, setProgress);
      setClip(c);
      setProgress(null);
    } catch (e) {
      setError((e as Error).message);
      setProgress(null);
    }
  };

  // Render the clip through `id`'s profile (current edits for the active one) the first time it's needed.
  const keyFor = (which: 'original' | 'enhanced', id: string) => (which === 'original' ? 'original' : `p:${id}`);
  const ensure = async (key: string) => {
    if (!player || !clip || player.has(key)) return;
    if (key === 'original') return player.set(key, clip.samples);
    const id = key.slice(2);
    const base = id === s.active.id ? s.working : s.profiles.find((p) => p.id === id)!.settings;
    setBusy(true);
    const out = await renderOffline(clip.samples, clip.sampleRate, { ...base, micCorrection: s.micCorrection }, { ...s.live, enhancementOn: true, muted: false }, s.prefs.quality);
    await player.set(key, out);
    setBusy(false);
  };

  const listen = async (which: 'original' | 'enhanced', id: string, restart = false) => {
    if (!player) return;
    const key = keyFor(which, id);
    await ensure(key);
    if (restart || !player.playing) await player.play(key);
    else await player.switchTo(key);
  };

  useEffect(() => {
    if (clip && player) listen(ab, prof, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip, player]);

  const dur = player?.duration || SECONDS;
  const waveFrom = (samples: Float32Array | null) => {
    if (!samples) return liveBars.current.map((db) => db);
    const bars: number[] = [];
    const per = Math.floor(samples.length / 140);
    for (let i = 0; i < 140; i++) {
      let mx = 0;
      for (let j = i * per; j < (i + 1) * per; j++) mx = Math.max(mx, Math.abs(samples[j]));
      bars.push(mx > 1e-6 ? 20 * Math.log10(mx) : -120);
    }
    return bars;
  };
  const bars = useMemo(() => waveFrom(clip?.samples ?? null), [clip, progress]); // eslint-disable-line react-hooks/exhaustive-deps
  const playedTo = clip ? Math.floor((pos / dur) * 140) : Math.floor((progress ?? 0) * 140);
  const selectedName = s.profiles.find((p) => p.id === prof)?.name || '';

  return (
    <Modal label="Test my sound" onClose={close} width={840}>
      <div className="col" style={{ gap: 24, padding: '30px 32px' }}>
        <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div className="col" style={{ gap: 6 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>Test my sound</h2>
            <span className="muted" style={{ lineHeight: 1.5 }}>Record 10 seconds, then flip between original and enhanced. Much easier to judge than listening live.</span>
          </div>
          <button className="icon-btn" aria-label="Close" onClick={close}><Icon name="close" size={16} /></button>
        </div>

        <div className="inset col" style={{ gap: 10, padding: 20, borderRadius: 12 }}>
          <svg width="100%" height="120" viewBox="0 0 1120 120" preserveAspectRatio="none" role="img" aria-label="Recording waveform">
            {bars.map((db, i) => {
              const h = Math.max(1.2, ((db + 60) / 60) * 56);
              const played = i < playedTo;
              return <line key={i} x1={4 + i * 8} x2={4 + i * 8} y1={60 - h} y2={60 + h} stroke={recording ? 'var(--live)' : played ? 'var(--accent)' : 'var(--meter-raw)'} strokeWidth={4.5} strokeLinecap="round" />;
            })}
          </svg>
          <div className="mono row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)' }}>
            <span>0:00</span>
            <span>{recording ? `Recording ${fmtTime((progress || 0) * SECONDS)} / 0:10` : clip ? `${fmtTime(pos)} / ${fmtTime(dur)}` : '0:10'}</span>
          </div>
        </div>

        {!clip ? (
          <div className="row" style={{ gap: 16 }}>
            <button className="btn btn-lg btn-primary" onClick={record} disabled={recording || s.status.state !== 'running'}>
              <Icon name="record" size={14} />
              {recording ? 'Recording… keep talking' : 'Start recording'}
            </button>
            <span className="small faint">{s.status.state !== 'running' ? 'Waiting for the microphone…' : 'Talk the way you do in meetings.'}</span>
          </div>
        ) : (
          <>
            <div className="row" style={{ gap: 18 }}>
              <button aria-label={playing ? 'Pause' : 'Play'} className="row" onClick={() => (playing ? player?.pause() : listen(ab, prof, pos >= dur - 0.05))} style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', justifyContent: 'center' }}>
                <Icon name={playing ? 'pause' : 'play'} size={20} />
              </button>
              <Segmented
                label="What you hear"
                value={ab}
                options={[{ value: 'original', label: 'Original' }, { value: 'enhanced', label: 'Enhanced' }]}
                onChange={(v) => { setAb(v); listen(v, prof); }}
              />
              <span className="small faint">{busy ? 'Preparing…' : 'Switch while it plays'}</span>
              <label className="row small" style={{ marginLeft: 'auto', gap: 10, fontWeight: 500 }}>
                Loop
                <Switch small label="Loop" checked={loop} onChange={(v) => { setLoop(v); player?.setLoop(v); }} />
              </label>
            </div>
            <div className="col" style={{ gap: 10 }}>
              <span className="small" style={{ fontWeight: 500 }}>Hear it as</span>
              <div role="radiogroup" aria-label="Profile for this test" className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {s.profiles.map((p) => (
                  <button
                    key={p.id}
                    role="radio"
                    aria-checked={p.id === prof}
                    onClick={() => { setProf(p.id); setAb('enhanced'); listen('enhanced', p.id); }}
                    style={{ height: 36, padding: '0 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, background: p.id === prof ? 'var(--accent-tint)' : 'transparent', border: `1px solid ${p.id === prof ? 'var(--accent-border)' : 'var(--border-strong)'}`, color: p.id === prof ? 'var(--accent-text)' : 'var(--text-secondary)' }}
                  >
                    {p.name}{p.id === s.active.id && s.edited ? ' (edited)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {error && <p className="small" role="alert" style={{ color: 'var(--error-text)' }}>{error}</p>}

        <div className="row divider-top" style={{ justifyContent: 'space-between', paddingTop: 18 }}>
          <span className="row xsmall faint" style={{ gap: 8 }}><Icon name="shield" size={14} />Stays on this PC. Deleted when you close this.</span>
          <div className="row" style={{ gap: 10 }}>
            {clip && <button className="btn" onClick={() => { setClip(null); record(); }}><Icon name="retry" size={14} />Record again</button>}
            <button
              className="btn btn-primary"
              onClick={() => {
                if (prof !== s.active.id) s.selectProfile(prof);
                close();
              }}
            >
              {prof === s.active.id ? 'Done' : `Use ${selectedName}`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
