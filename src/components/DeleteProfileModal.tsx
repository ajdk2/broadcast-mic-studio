import React, { useState } from 'react';
import { useStudio } from '../state/store';
import { Icon, Modal } from '../ui/kit';

// Board 26 · Delete profile.
export function DeleteProfileModal() {
  const s = useStudio();
  const p = s.profiles.find((x) => x.id === s.modals.deleteProfileId);
  const [exported, setExported] = useState(false);
  const close = () => s.openModal({ deleteProfileId: null });
  if (!p) return null;
  const parts = ['Its settings'];
  if (p.shortcut) parts.push(`its Ctrl Alt ${p.shortcut} shortcut`);
  if (p.rule) parts.push(`its ${p.rule.app} rule`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return (
    <Modal label={`Delete ${p.name}`} onClose={close} width={520}>
      <div className="col" style={{ gap: 18, padding: 28 }}>
        <span className="row" style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--error-tint)', justifyContent: 'center', color: 'var(--error-text)' }}>
          <Icon name="trash" size={22} />
        </span>
        <div className="col" style={{ gap: 8 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>Delete “{p.name}”?</h2>
          <p className="small muted" style={{ lineHeight: 1.55 }}>
            {list} are removed. This can’t be undone, but you can export it to a file first.
          </p>
        </div>
        <div className="row" style={{ gap: 10, paddingTop: 4 }}>
          <button className="btn btn-lg" onClick={async () => setExported(await s.exportProfile(p.id))}>
            <Icon name="download" size={15} />
            {exported ? 'Exported' : 'Export first'}
          </button>
          <span className="grow" />
          <button className="btn btn-lg" onClick={close}>Cancel</button>
          <button className="btn btn-lg btn-danger" onClick={async () => { await s.deleteProfile(p.id); close(); }}>Delete profile</button>
        </div>
      </div>
    </Modal>
  );
}
