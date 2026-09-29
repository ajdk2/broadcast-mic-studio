import React, { useState } from 'react';
import { useStudio } from '../state/store';
import { RULE_APPS } from '../voice/model';
import { Modal, Switch } from '../ui/kit';

// Board 25 · Save as new profile.
export function SaveProfileModal() {
  const s = useStudio();
  const close = () => s.openModal({ saveProfile: false });
  const taken = new Set(s.profiles.map((p) => p.shortcut).filter(Boolean));
  const firstFree = ['1', '2', '8', '9', '0', '3', '4', '5', '6', '7'].find((d) => !taken.has(d)) || '';
  const [name, setName] = useState('');
  const [shortcut, setShortcut] = useState(firstFree);
  const [ruleExe, setRuleExe] = useState('');
  const [useNow, setUseNow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const owner = s.profiles.find((p) => p.shortcut === shortcut);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give the profile a name.');
      return;
    }
    setSaving(true);
    try {
      const app = RULE_APPS.find((a) => a.exe === ruleExe);
      await s.saveAsNew({ name, shortcut: shortcut || undefined, rule: app ? { ...app, enabled: true } : undefined, useNow });
      close();
    } catch (err) {
      setError(`Couldn’t save the profile: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  return (
    <Modal label="Save as new profile" onClose={close} width={560}>
      <form className="col" style={{ gap: 20, padding: 28 }} onSubmit={submit}>
        <div className="col" style={{ gap: 6 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>Save as new profile</h2>
          <p className="small muted" style={{ lineHeight: 1.5 }}>
            {s.edited ? `Your edits move into the new profile. ${s.active.name} goes back to how it was.` : `Starts as a copy of ${s.active.name}.`}
          </p>
        </div>
        <label className="col" style={{ gap: 8 }}>
          <span className="small" style={{ fontWeight: 500 }}>Name</span>
          <input autoFocus className="text-input" value={name} maxLength={60} placeholder="Late-night stream" onChange={(e) => { setName(e.target.value); setError(null); }} />
          <span className="xsmall faint">Shown in the tray and in the profile picker</span>
        </label>
        <div className="row" style={{ justifyContent: 'space-between', gap: 16 }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="small" style={{ fontWeight: 500 }}>Shortcut</span>
            <span className="xsmall faint">{owner && shortcut ? `Takes Ctrl Alt ${shortcut} from ${owner.name}` : 'Switch to it from any app'}</span>
          </div>
          <select className="select" aria-label="Shortcut" value={shortcut} onChange={(e) => setShortcut(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">None</option>
            {'1234567890'.split('').map((d) => (
              <option key={d} value={d}>Ctrl Alt {d}{taken.has(d) ? ' (in use)' : ''}</option>
            ))}
          </select>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', gap: 16 }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="small" style={{ fontWeight: 500 }}>Switch automatically</span>
            <span className="xsmall faint">When this app is open</span>
          </div>
          <select className="select" aria-label="Switch automatically" value={ruleExe} onChange={(e) => setRuleExe(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">Never</option>
            {RULE_APPS.map((a) => <option key={a.exe} value={a.exe}>When {a.app} is open</option>)}
          </select>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="small" style={{ fontWeight: 500 }}>Start using it now</span>
          <Switch label="Start using it now" checked={useNow} onChange={setUseNow} />
        </div>
        {error && <p className="small" role="alert" style={{ color: 'var(--error-text)' }}>{error}</p>}
        <div className="row" style={{ justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <button type="button" className="btn btn-lg" onClick={close}>Cancel</button>
          <button type="submit" className="btn btn-lg btn-primary" disabled={saving}>Save profile</button>
        </div>
      </form>
    </Modal>
  );
}
