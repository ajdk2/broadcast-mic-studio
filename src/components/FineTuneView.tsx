import React, { useCallback, useEffect, useRef, useState } from 'react';
import { engine } from '../audio/engine';
import { useMeters, useStudio } from '../state/store';
import {
  EqBand,
  LEVELING_SPEEDS,
  LevelingSpeed,
  NOISE_MODES,
  VoiceSettings,
  WarmthCharacter,
  biquadDb,
  builtInById,
  effectiveBands,
  eqResponseDb,
  fmtDb,
  fmtFreq,
  micCorrectionBands,
  modeForAmount,
  signed,
} from '../voice/model';
import { Icon, Segmented, Slider, Switch } from '../ui/kit';
import { useCpu } from '../ui/useCpu';

type ModuleId = 'nr' | 'mic' | 'hp' | 'pop' | 'click' | 'eq' | 'comp' | 'warm' | 'ds' | 'lv' | 'lim';

const TARGETS = [
  { lufs: -14, label: '−14 LUFS · Streaming' },
  { lufs: -16, label: '−16 LUFS · Podcast & broadcast' },
  { lufs: -19, label: '−19 LUFS · Calls & meetings' },
  { lufs: -23, label: '−23 LUFS · TV (EBU R128)' },
];

function modules(w: VoiceSettings, profileName: string): { id: ModuleId; name: string; sum: string; on: boolean; set: (s: VoiceSettings, v: boolean) => void }[] {
  // w.micCorrection here is the current mic's correction (see FineTuneView).
  const nm = w.noise.enabled && w.noise.mode !== 'off';
  return [
    { id: 'nr', name: 'Noise removal', sum: nm ? `${NOISE_MODES[modeForAmount(w.noise.amount)].label} · ${w.noise.amount}%` : 'Off', on: nm, set: (s, v) => { s.noise.enabled = v; if (v && s.noise.mode === 'off') { s.noise.mode = 'balanced'; s.noise.amount = NOISE_MODES.balanced.amount; } } },
    { id: 'mic', name: 'Mic correction', sum: `${w.micCorrection.measured ? 'Measured' : 'Not measured'} · ${w.micCorrection.strength}%`, on: w.micCorrection.enabled, set: (s, v) => void (s.micCorrection.enabled = v) },
    { id: 'hp', name: 'Rumble filter', sum: `${fmtFreq(w.eq.bands[0].freq)} · 18 dB/oct`, on: w.rumble.enabled, set: (s, v) => void (s.rumble.enabled = v) },
    { id: 'pop', name: 'Pop removal', sum: w.pops.enabled ? 'Auto' : 'Off', on: w.pops.enabled, set: (s, v) => void (s.pops.enabled = v) },
    { id: 'click', name: 'Mouth-click removal', sum: w.clicks.enabled ? 'Auto' : 'Off', on: w.clicks.enabled, set: (s, v) => void (s.clicks.enabled = v) },
    { id: 'eq', name: 'Equalizer', sum: `4 bands · ${profileName}`, on: w.eq.enabled, set: (s, v) => void (s.eq.enabled = v) },
    { id: 'comp', name: 'Compressor', sum: `${w.compressor.ratio}:1 · ${signed(w.compressor.thresholdDb, 0)} dB`, on: w.compressor.enabled, set: (s, v) => void (s.compressor.enabled = v) },
    { id: 'warm', name: 'Analog warmth', sum: `${cap(w.warmth.character)} · ${w.warmth.drive}%`, on: w.warmth.enabled, set: (s, v) => void (s.warmth.enabled = v) },
    { id: 'ds', name: 'De-esser', sum: `${fmtFreq(w.deEsser.freq)} · ${fmtDb(w.deEsser.reductionDb, 0)}`, on: w.deEsser.enabled, set: (s, v) => void (s.deEsser.enabled = v) },
    { id: 'lv', name: 'Voice Boost & leveler', sum: w.leveler.enabled ? `auto · ${signed(w.leveler.targetLufs, 0)} LUFS` : 'Boost only', on: w.leveler.enabled, set: (s, v) => void (s.leveler.enabled = v) },
    { id: 'lim', name: 'Limiter', sum: `Ceiling ${fmtDb(w.limiter.ceilingDb, 1)}`, on: w.limiter.enabled, set: (s, v) => void (s.limiter.enabled = v) },
  ];
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function FineTuneView() {
  const s = useStudio();
  const [mod, setMod] = useState<ModuleId>('eq');
  const w = s.working;
  const cpu = useCpu();
  const factoryName = s.active.builtIn ? s.active.name : builtInById(s.active.basedOn || '')?.name;
  const mods = modules({ ...w, micCorrection: s.micCorrection }, s.active.name);
  const highlight = (id: ModuleId): React.CSSProperties => (mod === id ? { borderColor: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' } : {});

  return (
    <div className="page">
      <div className="page-head">
        <div className="col" style={{ gap: 6 }}>
          <div className="row" style={{ gap: 12 }}>
            <h1 className="h1">Fine-tune</h1>
            <span className="chip" style={{ fontWeight: 500 }}>
              {s.active.name}
              {s.edited && <><span className="dot" style={{ width: 6, height: 6, background: 'var(--accent)' }} />Edited</>}
            </span>
          </div>
          <span className="small faint">Every stage of the voice chain, in the order Aurel processes it. Changes are heard instantly.</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" disabled={!s.edited} onClick={s.resetWorking}>
            <Icon name="retry" size={14} />
            Reset to {s.active.name}
          </button>
          <button className="btn" disabled={!s.edited} onClick={() => s.updateActiveFromWorking()}>Update “{s.active.name}”</button>
          <button className="btn btn-primary" onClick={() => s.openModal({ saveProfile: true })}>
            <Icon name="plus" size={14} />
            Save as new profile
          </button>
        </div>
      </div>

      <div className="ft-grid">
        <section aria-labelledby="chain-h" className="card col" style={{ padding: '18px 12px 12px', minHeight: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between', padding: '0 10px 12px' }}>
            <h2 id="chain-h" className="h3">Voice chain</h2>
            <span className="xsmall faint">Processed top to bottom</span>
          </div>
          <div className="col" style={{ gap: 2, overflow: 'auto', minHeight: 0 }}>
            {mods.map((m, i) => (
              <div key={m.id} className="row" style={{ position: 'relative', gap: 8, padding: '0 6px 0 0', borderRadius: 10, background: mod === m.id ? 'var(--bg-raised)' : 'transparent' }}>
                {mod === m.id && <span style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, background: 'var(--accent)' }} />}
                <button className="row grow" aria-pressed={mod === m.id} onClick={() => setMod(m.id)} style={{ gap: 12, padding: '9px 10px', textAlign: 'left' }}>
                  <span className="mono xsmall faint" style={{ width: 16 }}>{i + 1}</span>
                  <span className="col grow" style={{ gap: 2 }}>
                    <span className="small ellipsis" style={{ fontWeight: 500, color: m.on ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{m.name}</span>
                    <span className="mono ellipsis" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.sum}</span>
                  </span>
                </button>
                <Switch small label={`${m.name} on`} checked={m.on} onChange={(v) => (m.id === 'mic' ? s.setMicCorrection({ enabled: v }) : s.updateWorking((x) => m.set(x, v)))} />
              </div>
            ))}
          </div>
          <div className="col xsmall" style={{ marginTop: 'auto', gap: 6, padding: '14px 10px 4px', borderTop: '1px solid var(--border-subtle)' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="faint">Chain latency</span><span className="mono">{s.status.state === 'running' ? `${s.status.latencyMs.toFixed(1)} ms` : '—'}</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="faint">CPU</span><span className="mono">{cpu !== null ? `${cpu.toFixed(1)}%` : '—'}</span></div>
          </div>
        </section>

        <div className="col" style={{ gap: 24, minWidth: 0, minHeight: 0 }}>
          {mod === 'mic' ? <MicCorrectionPanel /> : <EqPanel style={highlight(mod === 'hp' ? 'hp' : 'eq')} />}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24 }}>
            <section aria-labelledby="nr-h" className="card col" style={{ gap: 14, padding: '18px 22px', ...(mod === 'nr' || mod === 'pop' || mod === 'click' ? highlight(mod) : {}) }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h2 id="nr-h" className="h3">Cleanup</h2>
                <span className="mono xsmall muted">Noise removal {w.noise.enabled ? `${w.noise.amount}%` : 'off'}</span>
              </div>
              <Slider
                label="Noise removal amount"
                value={w.noise.enabled ? w.noise.amount : 0}
                valueText={`${w.noise.amount}%`}
                onChange={(v) => s.updateWorking((x) => { x.noise.amount = v; x.noise.mode = modeForAmount(v); x.noise.enabled = v > 0; })}
              />
              <ToggleRow title="Remove pops" sub="Softens thumps from “p” and “b”" checked={w.pops.enabled} onChange={(v) => s.updateWorking((x) => void (x.pops.enabled = v))} />
              <ToggleRow title="Remove mouth clicks" sub="Lip smacks and clicks that boosting makes louder" checked={w.clicks.enabled} onChange={(v) => s.updateWorking((x) => void (x.clicks.enabled = v))} />
              <ToggleRow title="Keep breaths natural" sub="Avoids the gated, robotic sound" checked={w.noise.keepBreaths} onChange={(v) => s.updateWorking((x) => void (x.noise.keepBreaths = v))} />
              <ToggleRow title="Reduce room echo" sub="Helps in bare, hard-walled rooms" checked={w.noise.reduceEcho} onChange={(v) => s.updateWorking((x) => void (x.noise.reduceEcho = v))} />
            </section>
            <LevelerCard style={highlight('lv')} />
          </div>
        </div>

        <div className="ft-right">
          <CompressorCard style={highlight('comp')} />
          <section aria-labelledby="ds-h" className="card col" style={{ gap: 14, padding: '18px 22px', ...highlight('ds') }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 id="ds-h" className="h3">De-esser</h2>
              <span className="mono xsmall muted">{fmtFreq(w.deEsser.freq)} · {fmtDb(w.deEsser.reductionDb, 0)}</span>
            </div>
            <Slider label="De-esser amount" value={-w.deEsser.reductionDb} min={0} max={10} step={0.5} valueText={fmtDb(w.deEsser.reductionDb, 1)} onChange={(v) => s.updateWorking((x) => void (x.deEsser.reductionDb = -v))} />
            <Segmented
              fill
              label="Sibilance frequency"
              value={w.deEsser.freq}
              options={[5000, 6500, 8000].map((f) => ({ value: f, label: fmtFreq(f) }))}
              onChange={(f) => s.updateWorking((x) => void (x.deEsser.freq = f))}
            />
            <DeEssMeter />
          </section>
          <section aria-labelledby="aw-h" className="card col" style={{ gap: 14, padding: '18px 22px', ...highlight('warm') }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 id="aw-h" className="h3">Analog warmth</h2>
              <span className="mono xsmall muted">{cap(w.warmth.character)} · {w.warmth.drive}%</span>
            </div>
            <span className="small muted" style={{ lineHeight: 1.5 }}>Subtle saturation, like a studio preamp. Adds richness, never distortion.</span>
            <Segmented<WarmthCharacter>
              fill
              label="Warmth character"
              value={w.warmth.character}
              options={(['tape', 'tube', 'console'] as WarmthCharacter[]).map((c) => ({ value: c, label: cap(c) }))}
              onChange={(c) => s.updateWorking((x) => void (x.warmth.character = c))}
            />
            <div className="row small" style={{ justifyContent: 'space-between' }}><span>Drive</span><span className="mono muted">{w.warmth.drive}%</span></div>
            <Slider label="Warmth drive" value={w.warmth.drive} valueText={`${w.warmth.drive}%`} onChange={(v) => s.updateWorking((x) => void (x.warmth.drive = v))} />
          </section>
          <section aria-labelledby="lim-h" className="card col" style={{ gap: 12, padding: '18px 22px', ...highlight('lim') }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 id="lim-h" className="h3">Limiter</h2>
              <span className="mono xsmall muted">Ceiling {fmtDb(w.limiter.ceilingDb, 1)}</span>
            </div>
            <Slider label="Limiter ceiling" value={w.limiter.ceilingDb} min={-6} max={-0.5} step={0.5} valueText={fmtDb(w.limiter.ceilingDb, 1)} onChange={(v) => s.updateWorking((x) => void (x.limiter.ceilingDb = v))} />
            <span className="xsmall faint">Nothing goes louder than this, so loud laughs never distort.</span>
          </section>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ title, sub, checked, onChange }: { title: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', gap: 16 }}>
      <div className="col" style={{ gap: 2 }}>
        <span className="small" style={{ fontWeight: 500 }}>{title}</span>
        <span className="xsmall faint">{sub}</span>
      </div>
      <Switch small label={title} checked={checked} onChange={onChange} />
    </div>
  );
}

// ---- Equalizer ---------------------------------------------------------------

const EQ_W = 836;
const EQ_H = 300;
const fx = (f: number, w = EQ_W) => (w * Math.log10(f / 20)) / 3;
const dy = (db: number) => EQ_H / 2 - db * 10;
const yd = (y: number) => (EQ_H / 2 - y) / 10;

function EqPanel({ style }: { style?: React.CSSProperties }) {
  const s = useStudio();
  const w = s.working;
  const [sel, setSel] = useState(3);
  const svgRef = useRef<SVGSVGElement>(null);
  // Draw at the real pixel width so the handles stay round at any window size.
  const [W, setW] = useState(EQ_W);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(300, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fxW = useCallback((f: number) => fx(f, W), [W]);
  const xf = (x: number) => 20 * Math.pow(10, (3 * x) / W);
  const drag = useRef<number | null>(null);
  const bands = effectiveBands(w);
  const shown = bands.map((b, i) => (i === 0 && !w.rumble.enabled ? { ...b } : b));

  const curve: string[] = [];
  for (let i = 0; i <= 200; i++) {
    const f = 20 * Math.pow(1000, i / 200);
    const db = (w.eq.enabled ? eqResponseDb(shown.slice(1), f) : 0) + (w.rumble.enabled ? eqResponseDb([shown[0]], f) : 0);
    curve.push(`${fxW(f).toFixed(1)} ${Math.max(2, Math.min(EQ_H - 2, dy(db))).toFixed(1)}`);
  }
  const curveD = 'M' + curve.join(' L');
  const fillD = `${curveD} L${W} ${EQ_H / 2} L0 ${EQ_H / 2} Z`;

  // Handles sit on the combined curve (the sum of every band), so overlapping bands never pull the
  // line away from them. A shelf reaches half its gain at its corner, a bell its full gain at its centre.
  const isShelf = (i: number) => bands[i].type === 'lowshelf' || bands[i].type === 'highshelf';
  const others = (i: number, f: number) =>
    eqResponseDb(bands.filter((_, j) => j !== i && j > 0), f) + (i !== 0 && w.rumble.enabled ? eqResponseDb([bands[0]], f) : 0);
  const pointFor = (i: number) => {
    const b = bands[i];
    const db = others(i, b.freq) + eqResponseDb([b], b.freq);
    return { x: fxW(b.freq), y: Math.max(8, Math.min(EQ_H - 8, dy(db))) };
  };

  // Bands keep their order, so they can't cross over and cancel each other out.
  const limits: [number, number][] = [[20, 300], [40, 500], [100, 2000], [500, 12000], [2000, 18000]];
  const freqRange = (i: number, fs: number[]): [number, number] => {
    const [lo, hi] = limits[i];
    if (i === 0) return [lo, hi];
    return [Math.max(lo, i > 1 ? fs[i - 1] * 1.15 : lo), Math.min(hi, i < 4 ? fs[i + 1] / 1.15 : hi)];
  };
  const clampFreq = (i: number, f: number, fs: number[]) => {
    const [lo, hi] = freqRange(i, fs);
    return Math.round(Math.max(lo, Math.min(hi, f)));
  };

  const move = (e: React.PointerEvent) => {
    if (drag.current === null || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * EQ_H;
    const i = drag.current;
    const freq = clampFreq(i, xf(x), bands.map((b) => b.freq));
    s.updateWorking((d) => {
      d.eq.bands[i].freq = freq;
      if (i > 0) {
        // The point goes where the pointer is: this band makes up whatever the others don't.
        // The tone sliders' share is taken back out, since effectiveBands adds it on.
        const tone = i === 1 ? d.tone.warmthDb : i === 3 ? d.tone.presenceDb : 0;
        const own = (yd(y) - others(i, freq)) * (isShelf(i) ? 2 : 1);
        d.eq.bands[i].gainDb = Math.round(Math.max(-12, Math.min(12, own - tone)) * 10) / 10;
      }
    });
  };

  const wheel = (i: number, e: React.WheelEvent) => {
    if (i === 0) return;
    s.updateWorking((d) => {
      const q = d.eq.bands[i].q * (e.deltaY > 0 ? 0.9 : 1.1);
      d.eq.bands[i].q = Math.round(Math.max(0.3, Math.min(6, q)) * 100) / 100;
    });
  };

  const selBand = bands[sel];
  const describe = (b: EqBand, i: number) =>
    i === 0 ? `${fmtFreq(b.freq)} · 18 dB/oct` : `${fmtFreq(b.freq)} · ${fmtDb(b.gainDb)}${b.type === 'peaking' ? ` · Q ${b.q.toFixed(1)}` : ''}`;

  return (
    <section aria-labelledby="eq-h" className="card col" style={{ gap: 14, padding: '18px 22px', ...style }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row" style={{ alignItems: 'baseline', gap: 12 }}>
          <h2 id="eq-h" className="h3">Equalizer</h2>
          <span className="xsmall faint hide-narrow">Drag a point to shape your tone. Scroll to change its width.</span>
        </div>
        <div className="row xsmall muted" style={{ gap: 16 }}>
          <span className="row" style={{ gap: 6 }}><span style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--bg-control)' }} />Your voice, live</span>
          <span className="row" style={{ gap: 6 }}><span style={{ width: 14, height: 3, borderRadius: 2, background: 'var(--accent)' }} />EQ curve</span>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          width="100%"
          height={EQ_H}
          viewBox={`0 0 ${W} ${EQ_H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Equalizer curve with five bands"
          onPointerMove={move}
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => (drag.current = null)}
          style={{ display: 'block', touchAction: 'none', borderRadius: 10, background: 'var(--bg-inset)' }}
        >
          {[-12, -6, 0, 6, 12].map((d) => <line key={d} x1={0} x2={W} y1={dy(d)} y2={dy(d)} stroke="var(--border-row)" strokeWidth={d === 0 ? 1.5 : 1} vectorEffect="non-scaling-stroke" />)}
          {[100, 1000, 10000].map((f) => <line key={f} y1={0} y2={EQ_H} x1={fxW(f)} x2={fxW(f)} stroke="var(--border-row)" vectorEffect="non-scaling-stroke" />)}
          <Spectrum width={W} height={EQ_H} fx={fxW} />
          <path d={fillD} fill="var(--accent)" opacity={0.1} />
          <path d={curveD} fill="none" stroke={w.eq.enabled ? 'var(--accent)' : 'var(--text-tertiary)'} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
          {bands.map((b, i) => {
            const p = pointFor(i);
            const on = i === 0 ? w.rumble.enabled : w.eq.enabled;
            return (
              <g
                key={i}
                role="slider"
                tabIndex={0}
                aria-label={`${b.name}: ${describe(b, i)}`}
                aria-valuenow={i === 0 ? b.freq : b.gainDb}
                style={{ cursor: 'grab', opacity: on ? 1 : 0.4 }}
                onPointerDown={(e) => {
                  setSel(i);
                  drag.current = i;
                  (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(e.pointerId);
                }}
                onWheel={(e) => wheel(i, e)}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? 1 : 0.5;
                  if (e.key === 'ArrowUp' && i > 0) s.updateWorking((d) => void (d.eq.bands[i].gainDb = Math.min(12, d.eq.bands[i].gainDb + step)));
                  else if (e.key === 'ArrowDown' && i > 0) s.updateWorking((d) => void (d.eq.bands[i].gainDb = Math.max(-12, d.eq.bands[i].gainDb - step)));
                  else if (e.key === 'ArrowRight') s.updateWorking((d) => void (d.eq.bands[i].freq = clampFreq(i, d.eq.bands[i].freq * 1.05, d.eq.bands.map((b) => b.freq))));
                  else if (e.key === 'ArrowLeft') s.updateWorking((d) => void (d.eq.bands[i].freq = clampFreq(i, d.eq.bands[i].freq / 1.05, d.eq.bands.map((b) => b.freq))));
                  else return;
                  e.preventDefault();
                  setSel(i);
                }}
              >
                <circle cx={p.x} cy={p.y} r={16} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={sel === i ? 9 : 7} fill={sel === i ? 'var(--accent)' : 'var(--bg-surface)'} stroke={sel === i ? 'var(--text-primary)' : 'var(--accent)'} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>
        <div className="mono col" style={{ position: 'absolute', left: 8, top: 0, height: EQ_H, justifyContent: 'space-between', padding: '24px 0', fontSize: 10, color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
          <span>+12</span><span>+6</span><span>0 dB</span><span>−6</span><span>−12</span>
        </div>
        <div className="row" style={{ position: 'absolute', right: 12, top: 10, gap: 10, padding: '6px 10px', borderRadius: 8, background: 'var(--bg-popover)', border: '1px solid var(--border-strong)', fontSize: 12, pointerEvents: 'none' }}>
          <span style={{ fontWeight: 600 }}>{sel + 1} · {selBand.name}</span>
          <span className="mono muted">{describe(selBand, sel)}</span>
        </div>
      </div>
      <div role="list" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
        {bands.map((b, i) => (
          <button key={i} role="listitem" className="pick col" aria-pressed={sel === i} onClick={() => setSel(i)} style={{ gap: 6, padding: '10px 12px', borderRadius: 10 }}>
            <span className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
              <span className="xsmall ellipsis" style={{ fontWeight: 600 }}>{i + 1} · {b.name}</span>
              <span className="ellipsis" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{typeLabel(b.type)}</span>
            </span>
            <span className="mono row" style={{ gap: '2px 8px', fontSize: 11, color: 'var(--text-secondary)', flexWrap: 'wrap', whiteSpace: 'nowrap' }}>
              <span>{fmtFreq(b.freq)}</span>
              <span>{i === 0 ? '18 dB/oct' : fmtDb(b.gainDb)}</span>
              {b.type === 'peaking' && <span>Q {b.q.toFixed(1)}</span>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

const typeLabel = (t: EqBand['type']) => ({ highpass: 'High-pass', lowshelf: 'Low shelf', peaking: 'Bell', highshelf: 'High shelf' })[t];

// Live output spectrum under the EQ curve.
function Spectrum({ width, height, fx, which = 'out' }: { width: number; height: number; fx: (f: number) => number; which?: 'out' | 'raw' }) {
  const ref = useRef<SVGPathElement>(null);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let data = new Float32Array(engine.spectrumBins);
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 50 || !ref.current) return;
      last = t;
      if (data.length !== engine.spectrumBins) data = new Float32Array(engine.spectrumBins);
      if (!engine.getSpectrum(data, which)) {
        ref.current.setAttribute('d', '');
        return;
      }
      const sr = engine.status.sampleRate || 48000;
      const binHz = sr / 2 / data.length;
      const pts: string[] = [`M0 ${height}`];
      for (let i = 0; i <= 120; i++) {
        const f = 20 * Math.pow(1000, i / 120);
        const bin = Math.min(data.length - 1, Math.round(f / binHz));
        // Average a few bins so the shape is readable.
        let sum = 0, n = 0;
        for (let k = Math.max(1, bin - 2); k <= Math.min(data.length - 1, bin + 2); k++) { sum += data[k]; n++; }
        const db = n ? sum / n : -120;
        const h = Math.max(0, Math.min(height, ((db + 100) / 70) * height * 0.75));
        pts.push(`L${fx(f).toFixed(1)} ${(height - h).toFixed(1)}`);
      }
      pts.push(`L${width} ${height} Z`);
      ref.current.setAttribute('d', pts.join(' '));
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, height, fx, which]);
  return <path ref={ref} fill="var(--bg-control)" opacity={0.9} />;
}

// ---- Mic correction (board 28) --------------------------------------------

function MicCorrectionPanel() {
  const s = useStudio();
  const mc = s.micCorrection;
  const H = 240;
  const y = (db: number) => H / 2 - db * 14;
  const full = micCorrectionBands({ ...s.working, micCorrection: { ...mc, strength: 100 } });
  const applied = micCorrectionBands({ ...s.working, micCorrection: mc });
  const path = (fn: (f: number) => number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 160; i++) {
      const f = 20 * Math.pow(1000, i / 160);
      pts.push(`${i ? 'L' : 'M'}${fx(f).toFixed(1)} ${Math.max(2, Math.min(H - 2, y(fn(f)))).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  const resp = (bands: EqBand[], f: number) => bands.reduce((a, b) => a + (b.gainDb ? biquadDb(b.type, b.freq, b.gainDb, b.q, f) : 0), 0);
  // What the mic does to your voice is the opposite of the full correction.
  const heard = (f: number) => -resp(full, f);
  const corr = (f: number) => (mc.enabled ? resp(applied, f) : 0);
  const rows = [
    { key: 'bodyDb' as const, name: 'Body', range: '100–250 Hz', hint: (v: number) => (v > 0.5 ? 'Your mic sounds thin down low' : v < -0.5 ? 'Your mic is boomy down low' : 'Your mic’s low end is even') },
    { key: 'boxinessDb' as const, name: 'Boxiness', range: '500–800 Hz', hint: (v: number) => (v < -0.5 ? 'The “talking into a cup” tone' : 'No boxy tone found') },
    { key: 'harshnessDb' as const, name: 'Harshness', range: '3–5 kHz', hint: (v: number) => (v < -0.5 ? 'Edgy peak common in budget mics' : v > 0.5 ? 'Your mic sounds a little dull' : 'No harsh peak found') },
  ];
  return (
    <section aria-labelledby="mc-h" className="card col" style={{ gap: 16, padding: '18px 22px', borderColor: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 20 }}>
        <div className="col" style={{ gap: 4 }}>
          <h2 id="mc-h" className="h3">Mic correction</h2>
          <span className="xsmall faint">Every mic colors your voice. Aurel evens out yours first, so every profile sounds the way it should on any mic.</span>
        </div>
        <div className="row" style={{ gap: 10, flexShrink: 0 }}>
          <span className={mc.measured ? 'chip chip-ok' : 'chip'}>{mc.measured ? 'Measured from voice check' : 'Not measured yet'}</span>
          <button className="btn" onClick={() => s.openModal({ setup: true })}>
            <Icon name="retry" size={14} />
            {mc.measured ? 'Measure again' : 'Run voice check'}
          </button>
        </div>
      </div>
      <div className="row xsmall muted" style={{ gap: 18 }}>
        <span className="row" style={{ gap: 6 }}><span style={{ width: 14, height: 3, borderRadius: 2, background: 'var(--meter-raw)' }} />Your mic, as heard</span>
        <span className="row" style={{ gap: 6 }}><span style={{ width: 14, height: 0, borderTop: '2px dashed var(--accent)' }} />Correction</span>
        <span className="row" style={{ gap: 6 }}><span style={{ width: 14, height: 3, borderRadius: 2, background: 'var(--text-primary)' }} />Result, before your profile</span>
      </div>
      <div style={{ position: 'relative' }}>
        <svg width="100%" height={H} viewBox={`0 0 ${EQ_W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Mic correction curves" style={{ display: 'block', borderRadius: 10, background: 'var(--bg-inset)' }}>
          {[-6, 0, 6].map((d) => <line key={d} x1={0} x2={EQ_W} y1={y(d)} y2={y(d)} stroke="var(--border-row)" strokeWidth={d === 0 ? 1.5 : 1} vectorEffect="non-scaling-stroke" />)}
          <path d={path(heard)} fill="none" stroke="var(--meter-raw)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <path d={path(corr)} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
          <path d={path((f) => heard(f) + corr(f))} fill="none" stroke="var(--text-primary)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mono col" style={{ position: 'absolute', left: 8, top: 0, height: H, justifyContent: 'space-between', padding: '30px 0', fontSize: 10, color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
          <span>+6</span><span>0 dB</span><span>−6</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        {rows.map((r) => (
          <div key={r.key} className="inset col" style={{ gap: 6, padding: '12px 14px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="small" style={{ fontWeight: 600 }}>{r.name} · <span className="faint" style={{ fontWeight: 400 }}>{r.range}</span></span>
              <span className="mono small">{fmtDb(mc[r.key])}</span>
            </div>
            <Slider label={`${r.name} correction`} value={mc[r.key]} min={-6} max={6} step={0.1} valueText={fmtDb(mc[r.key])} onChange={(v) => s.setMicCorrection({ [r.key]: v })} />
            <span className="xsmall faint">{r.hint(mc[r.key])}</span>
          </div>
        ))}
      </div>
      <div className="row" style={{ gap: 16 }}>
        <span className="small" style={{ width: 70 }}>Strength</span>
        <Slider label="Mic correction strength" value={mc.strength} valueText={`${mc.strength}%`} onChange={(v) => s.setMicCorrection({ strength: v })} />
        <span className="mono small" style={{ width: 44, textAlign: 'right' }}>{mc.strength}%</span>
      </div>
      <p className="row xsmall faint" style={{ gap: 8 }}>
        <Icon name="sparkle" size={14} />
        Estimated from your voice, not a lab measurement. A longer voice check gives a more accurate result.
      </p>
    </section>
  );
}

// ---- Leveler, compressor, de-esser meters -------------------------------

function LevelerCard({ style }: { style?: React.CSSProperties }) {
  const s = useStudio();
  const lv = s.working.leveler;
  const m = useMeters(200);
  return (
    <section aria-labelledby="lv-h" className="card col" style={{ gap: 14, padding: '18px 22px', ...style }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 id="lv-h" className="h3">Voice Boost &amp; leveler</h2>
        <span className="mono small muted" title="Voice Boost plus the leveler's current correction">{s.status.state === 'running' ? fmtDb(m.out.gainDb, 1) : fmtDb(s.live.boostDb, 0)}</span>
      </div>
      <div className="row small" style={{ justifyContent: 'space-between', gap: 12 }}>
        <span>Voice Boost</span>
        <span className="mono muted">{fmtDb(s.live.boostDb, 0)}</span>
      </div>
      <Slider label="Voice Boost" value={s.live.boostDb} min={0} max={38} valueText={fmtDb(s.live.boostDb, 0)} onChange={(v) => s.setLive({ boostDb: v })} />
      <div className="row small" style={{ justifyContent: 'space-between', gap: 12 }}>
        <span>Target loudness</span>
        <select className="select" style={{ minWidth: 0, width: 230 }} aria-label="Target loudness" value={lv.targetLufs} onChange={(e) => s.updateWorking((d) => void (d.leveler.targetLufs = Number(e.target.value)))}>
          {TARGETS.map((t) => <option key={t.lufs} value={t.lufs}>{t.label}</option>)}
        </select>
      </div>
      <div className="row small" style={{ justifyContent: 'space-between', gap: 12 }}>
        <span>Maximum lift</span>
        <span className="mono muted">{lv.maxLiftDb} dB</span>
      </div>
      <Slider label="Maximum lift" value={lv.maxLiftDb} min={10} max={38} valueText={`${lv.maxLiftDb} dB`} onChange={(v) => s.updateWorking((d) => void (d.leveler.maxLiftDb = v))} />
      <div className="row small" style={{ justifyContent: 'space-between', gap: 12 }}>
        <span>Leveling speed</span>
        <Segmented<LevelingSpeed>
          label="Leveling speed"
          value={lv.speed}
          options={(['gentle', 'natural', 'fast'] as LevelingSpeed[]).map((v) => ({ value: v, label: LEVELING_SPEEDS[v].label }))}
          onChange={(v) => s.updateWorking((d) => void (d.leveler.speed = v))}
        />
      </div>
    </section>
  );
}

function CompressorCard({ style }: { style?: React.CSSProperties }) {
  const s = useStudio();
  const c = s.working.compressor;
  const m = useMeters(100);
  const W = 312, H = 180;
  const x = (db: number) => ((db + 60) / 60) * W;
  const yy = (db: number) => H - ((db + 60) / 60) * H;
  const knee = 6;
  const outFor = (i: number) => {
    if (!c.enabled) return i;
    const over = i - c.thresholdDb;
    if (over <= -knee / 2) return i;
    if (over >= knee / 2) return c.thresholdDb + over / c.ratio;
    return i + ((1 / c.ratio - 1) * Math.pow(over + knee / 2, 2)) / (2 * knee);
  };
  const pts: string[] = [];
  for (let i = -60; i <= 0; i += 1) pts.push(`${i === -60 ? 'M' : 'L'}${x(i).toFixed(1)} ${yy(outFor(i)).toFixed(1)}`);
  const gr = m.compressorDb;
  const params: { k: string; v: string; min: number; max: number; step: number; value: number; set: (d: VoiceSettings, v: number) => void }[] = [
    { k: 'Threshold', v: `${signed(c.thresholdDb, 0)} dB`, min: -50, max: -5, step: 1, value: c.thresholdDb, set: (d, v) => void (d.compressor.thresholdDb = v) },
    { k: 'Ratio', v: `${c.ratio.toFixed(1)} : 1`, min: 1, max: 10, step: 0.5, value: c.ratio, set: (d, v) => void (d.compressor.ratio = v) },
    { k: 'Attack', v: `${c.attackMs} ms`, min: 1, max: 60, step: 1, value: c.attackMs, set: (d, v) => void (d.compressor.attackMs = v) },
    { k: 'Release', v: `${c.releaseMs} ms`, min: 30, max: 500, step: 10, value: c.releaseMs, set: (d, v) => void (d.compressor.releaseMs = v) },
  ];
  return (
    <section aria-labelledby="comp-h" className="card col" style={{ gap: 14, padding: '18px 22px', ...style }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 id="comp-h" className="h3">Compressor</h2>
        <span className="xsmall faint">Evens out loud and soft words</span>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Compressor transfer curve" style={{ borderRadius: 10, background: 'var(--bg-inset)' }}>
        <line x1={0} y1={H} x2={W} y2={0} stroke="var(--border-row)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <line x1={x(c.thresholdDb)} x2={x(c.thresholdDb)} y1={0} y2={H} stroke="var(--border-strong)" vectorEffect="non-scaling-stroke" />
        <path d={pts.join(' ')} fill="none" stroke={c.enabled ? 'var(--accent)' : 'var(--text-tertiary)'} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="col" style={{ gap: 6 }}>
        <div className="row xsmall" style={{ justifyContent: 'space-between' }}><span className="muted">Gain reduction</span><span className="mono">{fmtDb(gr, 1)}</span></div>
        <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'var(--meter-off)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${Math.min(100, (-gr / 20) * 100)}%`, background: 'var(--accent)', transition: 'width 80ms linear' }} />
        </div>
      </div>
      <div className="col" style={{ gap: 10 }}>
        {params.map((p) => (
          <div key={p.k} className="col" style={{ gap: 4 }}>
            <div className="row xsmall" style={{ justifyContent: 'space-between' }}><span className="muted">{p.k}</span><span className="mono">{p.v}</span></div>
            <Slider label={`Compressor ${p.k.toLowerCase()}`} value={p.value} min={p.min} max={p.max} step={p.step} valueText={p.v} onChange={(v) => s.updateWorking((d) => p.set(d, v))} />
          </div>
        ))}
      </div>
    </section>
  );
}

function DeEssMeter() {
  const m = useMeters(100);
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="row xsmall" style={{ justifyContent: 'space-between' }}><span className="muted">Taking off now</span><span className="mono">{fmtDb(m.deEssDb, 1)}</span></div>
      <div style={{ position: 'relative', height: 6, borderRadius: 3, background: 'var(--meter-off)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${Math.min(100, (-m.deEssDb / 10) * 100)}%`, background: 'var(--accent)', transition: 'width 80ms linear' }} />
      </div>
    </div>
  );
}
