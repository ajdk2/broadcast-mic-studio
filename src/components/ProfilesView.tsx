import React, { useEffect, useState } from 'react';
import { useStudio } from '../state/store';
import { NOISE_MODES, Profile, RULE_APPS, builtInById, curvePath, effectiveBands, fmtDb, modeForAmount, settingsEqual, signed } from '../voice/model';
import { Icon, Switch } from '../ui/kit';

function ago(ts: number): string {
  if (!ts) return '';
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d <= 0) return 'Edited today';
  if (d === 1) return 'Edited yesterday';
  if (d < 7) return `Edited ${d} days ago`;
  if (d < 14) return 'Edited last week';
  return `Edited ${new Date(ts).toLocaleDateString()}`;
}

function stats(p: Profile, boostDb: number) {
  const s = p.settings;
  const nm = s.noise.enabled && s.noise.mode !== 'off' ? NOISE_MODES[modeForAmount(s.noise.amount)].label : 'Off';
  const warm = s.eq.bands[1].gainDb + s.tone.warmthDb;
  const pres = s.eq.bands[3].gainDb + s.tone.presenceDb;
  return [
    ['Voice Boost', fmtDb(boostDb, 0)],
    ['Noise removal', nm],
    ['Warmth', fmtDb(warm)],
    ['Presence', fmtDb(pres)],
    ['Compressor', s.compressor.enabled ? `${s.compressor.ratio} : 1` : 'Off'],
    ['De-esser', s.deEsser.enabled ? fmtDb(s.deEsser.reductionDb, 0) : 'Off'],
    ['Target', s.leveler.enabled ? `${signed(s.leveler.targetLufs, 0)} LUFS` : 'Leveler off'],
    ['Analog warmth', s.warmth.enabled ? `${s.warmth.character[0].toUpperCase() + s.warmth.character.slice(1)} · ${s.warmth.drive}%` : 'Off'],
  ];
}

export function ProfilesView() {
  const s = useStudio();
  const [selId, setSelId] = useState(s.active.id);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sel = s.profiles.find((p) => p.id === selId) || s.active;
  const inUse = sel.id === s.active.id;
  const mine = s.profiles.filter((p) => !p.builtIn);
  const builtIn = s.profiles.filter((p) => p.builtIn);
  const factory = builtInById(sel.builtIn ? sel.id : sel.basedOn || '');
  const isFactory = sel.builtIn && factory ? settingsEqual(sel.settings, factory.settings) : false;
  // The selected profile's settings, or the live edits when it's the one in use.
  const shown = inUse ? { ...sel, settings: s.working } : sel;

  useEffect(() => {
    if (!s.profiles.some((p) => p.id === selId)) setSelId(s.active.id);
  }, [s.profiles, selId, s.active.id]);

  // Press a digit to set the Ctrl + Alt shortcut.
  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'Escape') setCapturing(false);
      else if (e.key === 'Backspace' || e.key === 'Delete') {
        s.patchProfile(sel.id, { shortcut: undefined });
        setCapturing(false);
      } else if (/^[0-9]$/.test(e.key)) {
        s.patchProfile(sel.id, { shortcut: e.key });
        setCapturing(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [capturing, sel.id, s]);

  const flash = (m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 3000);
  };

  const row = (p: Profile) => {
    const active = p.id === s.active.id;
    const sub = p.builtIn ? `${p.description.split('.')[0]}${p.shortcut ? ` · Ctrl Alt ${p.shortcut}` : ''}` : `From ${builtInById(p.basedOn || '')?.name || 'your settings'}${p.shortcut ? ` · Ctrl Alt ${p.shortcut}` : ''}`;
    return (
      <button key={p.id} className="row" aria-current={p.id === sel.id ? 'true' : undefined} onClick={() => { setSelId(p.id); setRenaming(false); }} style={{ position: 'relative', height: 64, flexShrink: 0, gap: 14, padding: '0 12px', borderRadius: 10, textAlign: 'left', background: p.id === sel.id ? 'var(--bg-raised)' : 'transparent' }}>
        {p.id === sel.id && <span style={{ position: 'absolute', left: 0, top: 18, bottom: 18, width: 3, borderRadius: 2, background: 'var(--accent)' }} />}
        <svg width="64" height="28" viewBox="0 0 64 28" aria-hidden="true" style={{ borderRadius: 6, background: 'var(--bg-inset)' }}>
          <path d={curvePath(effectiveBands(p.settings), 64, 28, 10, 32)} fill="none" stroke={active ? 'var(--accent)' : 'var(--meter-raw)'} strokeWidth="1.6" />
        </svg>
        <span className="col grow" style={{ gap: 3 }}>
          <span className="ellipsis" style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</span>
          <span className="xsmall faint ellipsis">{sub}</span>
        </span>
        {active && <span className="badge" style={{ background: 'var(--success-tint)', color: 'var(--success-text)' }}>In use</span>}
      </button>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <div className="col" style={{ gap: 6 }}>
          <h1 className="h1">Profiles</h1>
          <span className="faint">A profile saves every setting in the voice chain. Switch with a shortcut, or let Aurel switch for you.</span>
        </div>
        <div className="row" style={{ gap: 10 }}>
          {message && <span className="small" role="status" style={{ color: 'var(--accent-text)' }}>{message}</span>}
          <button
            className="btn"
            onClick={async () => {
              try {
                const p = await s.importProfile();
                if (p) { setSelId(p.id); flash(`Imported “${p.name}”`); }
              } catch (e) {
                flash((e as Error).message);
              }
            }}
          >
            <Icon name="upload" size={15} />
            Import .aurel file
          </button>
          <button className="btn btn-primary" onClick={() => s.openModal({ saveProfile: true })}>
            <Icon name="plus" size={15} />
            New profile
          </button>
        </div>
      </div>

      <div style={{ flexGrow: 1, display: 'flex', gap: 24, minHeight: 0 }}>
        <nav aria-label="Profiles" className="card col" style={{ width: 420, flexShrink: 0, gap: 4, padding: 18, overflow: 'auto' }}>
          <span className="overline" style={{ padding: '4px 12px 8px' }}>Yours</span>
          {mine.length ? mine.map(row) : <span className="small faint" style={{ padding: '4px 12px 8px' }}>Profiles you save appear here.</span>}
          <span className="overline" style={{ padding: '16px 12px 8px' }}>Built in</span>
          {builtIn.map(row)}
        </nav>

        <section aria-labelledby="pd-h" className="card col grow" style={{ gap: 22, padding: '28px 32px', overflow: 'auto' }}>
          <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
            <div className="col" style={{ gap: 8, minWidth: 0 }}>
              <div className="row" style={{ gap: 10 }}>
                {renaming ? (
                  <form
                    className="row"
                    style={{ gap: 8 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (name.trim()) s.patchProfile(sel.id, { name: name.trim().slice(0, 60) });
                      setRenaming(false);
                    }}
                  >
                    <input autoFocus className="text-input" style={{ width: 320, fontSize: 20, fontWeight: 600 }} value={name} aria-label="Profile name" maxLength={60} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setRenaming(false)} />
                    <button className="btn btn-primary" type="submit">Save</button>
                  </form>
                ) : (
                  <h2 id="pd-h" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{sel.name}</h2>
                )}
                {!sel.builtIn && !renaming && (
                  <button className="icon-btn" aria-label="Rename profile" onClick={() => { setName(sel.name); setRenaming(true); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" /></svg>
                  </button>
                )}
                {sel.builtIn && <span className="chip"><Icon name="lock" size={12} />Built in</span>}
              </div>
              <span className="faint">
                {sel.builtIn ? sel.description : `Based on ${factory?.name || 'your settings'} · ${ago(sel.updatedAt)}`}
                {inUse && s.edited ? ' · has unsaved edits' : ''}
              </span>
            </div>
            <div className="row" style={{ gap: 10, flexShrink: 0 }}>
              <button className="btn" onClick={() => { if (!inUse) s.selectProfile(sel.id); s.setTab('finetune'); }}>Edit in Fine-tune</button>
              {inUse ? (
                <span className="chip chip-ok" style={{ height: 40, padding: '0 16px', fontSize: 13 }}><Icon name="check" size={14} strokeWidth={2.6} />In use now</span>
              ) : (
                <button className="btn btn-primary" onClick={() => s.selectProfile(sel.id)}>Use this profile</button>
              )}
            </div>
          </div>

          <div className="inset col" style={{ gap: 8, padding: '18px 20px', borderRadius: 12 }}>
            <div className="row xsmall faint" style={{ justifyContent: 'space-between' }}><span>Sound signature</span><span className="mono">20 Hz · 200 Hz · 2 kHz · 20 kHz</span></div>
            <svg width="100%" height="96" viewBox="0 0 800 96" preserveAspectRatio="none" role="img" aria-label={`${sel.name} EQ curve`}>
              <line x1={0} x2={800} y1={48} y2={48} stroke="var(--border-row)" vectorEffect="non-scaling-stroke" />
              <path d={curvePath(effectiveBands(shown.settings), 800, 96, 10, 120)} fill="none" stroke="var(--accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            {stats(shown, s.live.boostDb).map(([k, v]) => (
              <div key={k} className="inset col" style={{ gap: 6, padding: '14px 16px' }}>
                <span className="xsmall faint">{k}</span>
                <span className="mono" style={{ fontSize: 15, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
            <RuleEditor profile={sel} />
            <div className="col" style={{ gap: 10 }}>
              <span className="h3">Shortcut</span>
              <div className="inset row" style={{ minHeight: 56, justifyContent: 'space-between', padding: '0 12px 0 16px', borderRadius: 12 }}>
                {capturing ? (
                  <span className="small" style={{ color: 'var(--accent-text)' }}>Press a number key 0–9 · Backspace clears · Esc cancels</span>
                ) : sel.shortcut ? (
                  <span className="row" style={{ gap: 4 }}><kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>{sel.shortcut}</kbd></span>
                ) : (
                  <span className="small faint">No shortcut</span>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setCapturing(!capturing)}>{capturing ? 'Cancel' : sel.shortcut ? 'Change' : 'Set'}</button>
              </div>
              <span className="xsmall faint">Works in any app, even full screen.</span>
            </div>
          </div>

          <div className="row" style={{ marginTop: 'auto', gap: 10, paddingTop: 18, borderTop: '1px solid var(--border-subtle)' }}>
            <button className="btn" onClick={async () => { const p = await s.duplicateProfile(sel.id); setSelId(p.id); flash(`Made “${p.name}”`); }}>
              <Icon name="copy" size={15} />Duplicate
            </button>
            <button className="btn" onClick={async () => { if (await s.exportProfile(sel.id)) flash('Saved to file'); }}>
              <Icon name="download" size={15} />Export as file
            </button>
            {factory && !(sel.builtIn && isFactory) && (
              <button className="btn btn-ghost" style={{ border: '1px solid var(--border-strong)' }} onClick={() => s.resetProfile(sel.id)}>
                Reset to original{!sel.builtIn ? ` ${factory.name}` : ''}
              </button>
            )}
            {!sel.builtIn && (
              <button className="btn btn-ghost" style={{ marginLeft: 'auto', color: 'var(--error-text)' }} onClick={() => s.openModal({ deleteProfileId: sel.id })}>
                <Icon name="trash" size={15} />Delete profile
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function RuleEditor({ profile }: { profile: Profile }) {
  const s = useStudio();
  const [adding, setAdding] = useState(false);
  const rule = profile.rule;
  return (
    <div className="col" style={{ gap: 10 }}>
      <span className="h3">Switch to this profile automatically</span>
      {rule && !adding ? (
        <div className="inset row" style={{ minHeight: 56, justifyContent: 'space-between', gap: 16, padding: '0 16px', borderRadius: 12 }}>
          <span className="small muted">When {rule.app} is open</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => s.patchProfile(profile.id, { rule: undefined })}>Remove</button>
            <Switch small label="Automatic switching rule" checked={rule.enabled} onChange={(v) => s.patchProfile(profile.id, { rule: { ...rule, enabled: v } })} />
          </div>
        </div>
      ) : adding ? (
        <div className="inset row" style={{ minHeight: 56, gap: 10, padding: '0 12px 0 16px', borderRadius: 12 }}>
          <span className="small muted">When</span>
          <select
            className="select"
            aria-label="App that switches to this profile"
            defaultValue=""
            onChange={(e) => {
              const app = RULE_APPS.find((a) => a.exe === e.target.value);
              if (app) s.patchProfile(profile.id, { rule: { ...app, enabled: true } });
              setAdding(false);
            }}
          >
            <option value="" disabled>Choose an app…</option>
            {RULE_APPS.map((a) => <option key={a.exe} value={a.exe}>{a.app}</option>)}
          </select>
          <span className="small muted">is open</span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : (
        <span className="small faint">Aurel can switch to this profile when an app opens, and back when it closes.</span>
      )}
      {!adding && !rule && (
        <button className="btn btn-sm" style={{ alignSelf: 'flex-start', height: 34 }} onClick={() => setAdding(true)}>
          <Icon name="plus" size={14} />Add a rule
        </button>
      )}
      {!window.studioAPI && rule && <span className="xsmall faint">Rules only run in the Aurel desktop app.</span>}
    </div>
  );
}
