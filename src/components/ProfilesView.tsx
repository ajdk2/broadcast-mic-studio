import React, { useState } from 'react';
import { AurelProfile } from '../types';

interface ProfilesViewProps {
  currentProfileId: string;
  onSelectProfile: (profile: AurelProfile) => void;
  onOpenSaveModal: () => void;
  onOpenFineTune: () => void;
  onOpenDeleteModal: (profileId: string) => void;
}

export const ProfilesView: React.FC<ProfilesViewProps> = ({
  currentProfileId,
  onSelectProfile,
  onOpenSaveModal,
  onOpenFineTune,
  onOpenDeleteModal,
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>('stream');

  const C: Record<string, string> = {
    broadcast: 'M0 30 C18 30 28 11 58 12 S108 25 140 25 S198 17 228 19 S254 27 260 29',
    podcast: 'M0 33 C25 33 40 17 72 17 S120 23 150 22 S210 16 240 18 S258 25 260 27',
    clear: 'M0 39 C20 39 34 27 60 25 S120 23 150 21 S190 9 215 11 S250 21 260 25',
    condenser: 'M0 34 C30 34 50 24 90 24 S150 25 180 21 S230 8 260 7',
    natural: 'M0 29 C30 26 60 24 130 24 S230 24 260 25',
    stream: 'M0 28 C16 28 26 8 56 9 S106 26 138 26 S196 16 226 17 S254 25 260 27',
    standup: 'M0 39 C20 39 36 29 62 27 S122 24 152 22 S192 12 216 13 S250 22 260 25',
  };

  const allProfiles = [
    {
      id: 'stream',
      custom: true,
      name: 'Late-night stream',
      sub: 'From Broadcast · Ctrl Alt 1',
      meta: 'Based on Broadcast · Edited 2 days ago',
      key: '1',
      rule: 'When OBS Studio starts streaming or recording',
      ruleOn: true,
      stats: [
        { k: 'Voice Boost', v: '+30 dB' },
        { k: 'Noise removal', v: 'Strong' },
        { k: 'Warmth', v: '+3.6 dB' },
        { k: 'Presence', v: '+1.2 dB' },
        { k: 'Compressor', v: '4 : 1' },
        { k: 'De-esser', v: '−5 dB' },
        { k: 'Target', v: '−14 LUFS' },
        { k: 'Analog warmth', v: 'Tape · 18%' },
      ],
    },
    {
      id: 'standup',
      custom: true,
      name: 'Morning standup',
      sub: 'From Clear Speech · Ctrl Alt 2',
      meta: 'Based on Clear Speech · Edited last week',
      key: '2',
      rule: 'When Microsoft Teams joins a meeting',
      ruleOn: true,
      stats: [
        { k: 'Voice Boost', v: '+24 dB' },
        { k: 'Noise removal', v: 'Balanced' },
        { k: 'Warmth', v: '−0.6 dB' },
        { k: 'Presence', v: '+3.0 dB' },
        { k: 'Compressor', v: '3 : 1' },
        { k: 'De-esser', v: '−4 dB' },
        { k: 'Target', v: '−16 LUFS' },
        { k: 'Analog warmth', v: 'Tape · 18%' },
      ],
    },
    {
      id: 'broadcast',
      custom: false,
      name: 'Broadcast',
      sub: 'Deep and controlled · Ctrl Alt 3',
      meta: 'Built in · Your Voice Boost is kept when you switch',
      key: '3',
      rule: 'No rules yet. Add one to switch when an app starts.',
      ruleOn: false,
      stats: [
        { k: 'Voice Boost', v: '+26 dB' },
        { k: 'Noise removal', v: 'Balanced' },
        { k: 'Warmth', v: '+1.4 dB' },
        { k: 'Presence', v: '−0.2 dB' },
        { k: 'Compressor', v: '3 : 1' },
        { k: 'De-esser', v: '−4 dB' },
        { k: 'Target', v: '−16 LUFS' },
        { k: 'Analog warmth', v: 'Tape · 18%' },
      ],
    },
    {
      id: 'podcast',
      custom: false,
      name: 'Podcast',
      sub: 'Rich and even · Ctrl Alt 4',
      meta: 'Built in · Your Voice Boost is kept when you switch',
      key: '4',
      rule: 'No rules yet. Add one to switch when an app starts.',
      ruleOn: false,
      stats: [
        { k: 'Voice Boost', v: '+24 dB' },
        { k: 'Noise removal', v: 'Balanced' },
        { k: 'Warmth', v: '+2.0 dB' },
        { k: 'Presence', v: '+1.0 dB' },
        { k: 'Compressor', v: '2.5 : 1' },
        { k: 'De-esser', v: '−3 dB' },
        { k: 'Target', v: '−16 LUFS' },
        { k: 'Analog warmth', v: 'Tube · 12%' },
      ],
    },
    {
      id: 'clear',
      custom: false,
      name: 'Clear Speech',
      sub: 'Crisp for meetings · Ctrl Alt 5',
      meta: 'Built in · Your Voice Boost is kept when you switch',
      key: '5',
      rule: 'No rules yet. Add one to switch when an app starts.',
      ruleOn: false,
      stats: [
        { k: 'Voice Boost', v: '+20 dB' },
        { k: 'Noise removal', v: 'Light' },
        { k: 'Warmth', v: '−1.0 dB' },
        { k: 'Presence', v: '+3.5 dB' },
        { k: 'Compressor', v: '3 : 1' },
        { k: 'De-esser', v: '−4 dB' },
        { k: 'Target', v: '−18 LUFS' },
        { k: 'Analog warmth', v: 'Console · 10%' },
      ],
    },
    {
      id: 'condenser',
      custom: false,
      name: 'Studio Condenser',
      sub: 'Airy and detailed · Ctrl Alt 6',
      meta: 'Built in · Your Voice Boost is kept when you switch',
      key: '6',
      rule: 'No rules yet. Add one to switch when an app starts.',
      ruleOn: false,
      stats: [
        { k: 'Voice Boost', v: '+22 dB' },
        { k: 'Noise removal', v: 'Light' },
        { k: 'Warmth', v: '+0.5 dB' },
        { k: 'Presence', v: '+2.5 dB' },
        { k: 'Compressor', v: '2 : 1' },
        { k: 'De-esser', v: '−3 dB' },
        { k: 'Target', v: '−16 LUFS' },
        { k: 'Analog warmth', v: 'Tape · 14%' },
      ],
    },
    {
      id: 'natural',
      custom: false,
      name: 'Natural',
      sub: 'Light cleanup · Ctrl Alt 7',
      meta: 'Built in · Your Voice Boost is kept when you switch',
      key: '7',
      rule: 'No rules yet. Add one to switch when an app starts.',
      ruleOn: false,
      stats: [
        { k: 'Voice Boost', v: '+16 dB' },
        { k: 'Noise removal', v: 'Light' },
        { k: 'Warmth', v: '0.0 dB' },
        { k: 'Presence', v: '0.0 dB' },
        { k: 'Compressor', v: '1.5 : 1' },
        { k: 'De-esser', v: '−2 dB' },
        { k: 'Target', v: '−20 LUFS' },
        { k: 'Analog warmth', v: 'Off' },
      ],
    },
  ];

  const sel = allProfiles.find((p) => p.id === selectedProfileId) || allProfiles[0];
  const inUse = currentProfileId === sel.id;

  const handleUseThisProfile = () => {
    onSelectProfile({
      id: sel.id,
      name: sel.name,
      desc: sel.sub,
      tags: '',
      curve: C[sel.id] || C.broadcast,
      isBuiltIn: !sel.custom,
    });
  };

  return (
    <div
      style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '30px 40px 28px',
        boxSizing: 'border-box',
      }}
    >
        {/* Top Header (Height 60px) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Profiles
            </h1>
            <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
              A profile saves every setting in the voice chain. Switch with a shortcut, or let Aurel switch for you.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 15V3M7 10l5 5 5-5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              Import .aurel file
            </button>

            <button
              type="button"
              onClick={onOpenSaveModal}
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 18px',
                background: 'var(--accent-amber)',
                border: 0,
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1B1204',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New profile
            </button>
          </div>
        </div>

        {/* 2-column Layout */}
        <div style={{ flexGrow: 1, display: 'flex', gap: '24px', minHeight: 0 }}>
          {/* Left Navigation (Width 420px) */}
          <nav
            aria-label="Profiles"
            style={{
              width: '420px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '18px 12px',
              boxSizing: 'border-box',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              overflowY: 'auto',
            }}
          >
            <span
              style={{
                padding: '4px 12px 8px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              Yours
            </span>
            {allProfiles.filter((p) => p.custom).map((p) => {
              const isSel = selectedProfileId === p.id;
              const isCurrent = currentProfileId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProfileId(p.id)}
                  style={{
                    position: 'relative',
                    height: '64px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '0 12px',
                    border: 0,
                    borderRadius: '10px',
                    background: isSel ? 'var(--bg-raised)' : 'transparent',
                    borderLeft: isSel ? '1px solid var(--border-hover)' : 'none',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'background 0.12s ease',
                  }}
                >
                  {isSel && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: '10px',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-hover)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  <svg width="64" height="28" viewBox="0 0 260 40" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'relative', flexShrink: 0 }}>
                    <path d={C[p.id]} fill="none" stroke={isSel ? 'var(--accent-amber)' : 'var(--text-tertiary)'} strokeWidth="5" strokeLinecap="round" />
                  </svg>
                  <span style={{ position: 'relative', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{p.sub}</span>
                  </span>
                  {isCurrent && (
                    <span
                      style={{
                        position: 'relative',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'var(--accent-amber-tint)',
                        color: 'var(--accent-amber-text)',
                      }}
                    >
                      In use
                    </span>
                  )}
                </button>
              );
            })}

            <span
              style={{
                padding: '16px 12px 8px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              Built in
            </span>
            {allProfiles.filter((p) => !p.custom).map((p) => {
              const isSel = selectedProfileId === p.id;
              const isCurrent = currentProfileId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProfileId(p.id)}
                  style={{
                    position: 'relative',
                    height: '64px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '0 12px',
                    border: 0,
                    borderRadius: '10px',
                    background: isSel ? 'var(--bg-raised)' : 'transparent',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'background 0.12s ease',
                  }}
                >
                  {isSel && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        right: 0,
                        bottom: 0,
                        borderRadius: '10px',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-hover)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  <svg width="64" height="28" viewBox="0 0 260 40" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'relative', flexShrink: 0 }}>
                    <path d={C[p.id]} fill="none" stroke={isSel ? 'var(--accent-amber)' : 'var(--text-tertiary)'} strokeWidth="5" strokeLinecap="round" />
                  </svg>
                  <span style={{ position: 'relative', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{p.sub}</span>
                  </span>
                  {isCurrent && (
                    <span
                      style={{
                        position: 'relative',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'var(--accent-amber-tint)',
                        color: 'var(--accent-amber-text)',
                      }}
                    >
                      In use
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Profile Details */}
          <section
            aria-labelledby="pd-h"
            style={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '22px',
              padding: '28px 32px',
              boxSizing: 'border-box',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 id="pd-h" style={{ margin: 0, fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    {sel.name}
                  </h2>
                  {sel.custom ? (
                    <button
                      type="button"
                      aria-label="Rename profile"
                      style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: 0,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                        <path d="m13.5 6.5 4 4" />
                      </svg>
                    </button>
                  ) : (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'var(--bg-control)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                      Built in
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>{sel.meta}</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={onOpenFineTune}
                  style={{
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    borderRadius: '10px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-strong)',
                    boxSizing: 'border-box',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                  }}
                >
                  Edit in Fine-tune
                </button>

                {inUse ? (
                  <span
                    style={{
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0 16px',
                      borderRadius: '10px',
                      background: 'var(--accent-amber-tint)',
                      color: 'var(--accent-amber-text)',
                      fontSize: '13px',
                      fontWeight: 600,
                      boxSizing: 'border-box',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                    In use now
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleUseThisProfile}
                    style={{
                      height: '40px',
                      padding: '0 18px',
                      borderRadius: '10px',
                      background: 'var(--accent-amber)',
                      border: 0,
                      color: '#1B1204',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Use this profile
                  </button>
                )}
              </div>
            </div>

            {/* Sound signature card */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '18px 20px',
                borderRadius: '12px',
                background: '#111215',
                border: '1px solid #22252A',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                <span>Sound signature</span>
                <span className="mono">20 Hz · 200 Hz · 2 kHz · 20 kHz</span>
              </div>
              <svg width="100%" height="120" viewBox="0 0 260 40" preserveAspectRatio="none" aria-hidden="true">
                <line x1="0" y1="24" x2="260" y2="24" stroke="#2A2D33" strokeWidth="0.4" strokeDasharray="1 1.5" />
                <path d={C[sel.id]} fill="none" stroke="var(--accent-amber)" strokeWidth="0.9" strokeLinecap="round" />
              </svg>
            </div>

            {/* 8 Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
              {sel.stats.map((t) => (
                <div
                  key={t.k}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: '#1B1D21',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t.k}</span>
                  <span className="mono" style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{t.v}</span>
                </div>
              ))}
            </div>

            {/* Rules and shortcut */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Switch to this profile automatically
                </span>
                <div
                  style={{
                    minHeight: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '0 16px',
                    borderRadius: '10px',
                    background: '#1B1D21',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{sel.rule}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={sel.ruleOn}
                    aria-label="Automatic switching rule"
                    style={{
                      width: '40px',
                      height: '24px',
                      borderRadius: '12px',
                      background: sel.ruleOn ? 'var(--accent-amber)' : '#666A73',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: sel.ruleOn ? 'flex-end' : 'flex-start',
                      padding: '3px',
                      boxSizing: 'border-box',
                      flexShrink: 0,
                      border: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: sel.ruleOn ? '#1B1204' : '#B9BBC1' }} />
                  </button>
                </div>
                <button
                  type="button"
                  style={{
                    alignSelf: 'flex-start',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px dashed #3A3E46',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add a rule
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Shortcut</span>
                <div
                  style={{
                    minHeight: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    borderRadius: '10px',
                    background: '#1B1D21',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ display: 'flex', gap: '4px' }}>
                    <kbd className="mono" style={{ height: '28px', padding: '0 8px', display: 'flex', alignItems: 'center', borderRadius: '6px', background: 'var(--bg-control)', border: '1px solid var(--border-hover)', borderBottomWidth: '2px', fontSize: '12px' }}>Ctrl</kbd>
                    <kbd className="mono" style={{ height: '28px', padding: '0 8px', display: 'flex', alignItems: 'center', borderRadius: '6px', background: 'var(--bg-control)', border: '1px solid var(--border-hover)', borderBottomWidth: '2px', fontSize: '12px' }}>Alt</kbd>
                    <kbd className="mono" style={{ height: '28px', padding: '0 8px', display: 'flex', alignItems: 'center', borderRadius: '6px', background: 'var(--bg-control)', border: '1px solid var(--border-hover)', borderBottomWidth: '2px', fontSize: '12px' }}>{sel.key}</kbd>
                  </span>
                  <button
                    type="button"
                    style={{
                      height: '30px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      background: 'transparent',
                      border: 0,
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--accent-amber)',
                    }}
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                paddingTop: '18px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                style={{
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid var(--border-strong)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V5a1 1 0 0 1 1-1h10" />
                </svg>
                Duplicate
              </button>

              <button
                type="button"
                style={{
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid var(--border-strong)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3v12M7 8l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
                Export as file
              </button>

              {!sel.custom && (
                <button
                  type="button"
                  style={{
                    height: '38px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: '1px solid var(--border-strong)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                  }}
                >
                  Reset to original
                </button>
              )}

              {sel.custom && (
                <button
                  type="button"
                  onClick={() => onOpenDeleteModal(sel.id)}
                  style={{
                    marginLeft: 'auto',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: '1px solid #5C2A24',
                    color: '#FF8A7E',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                  </svg>
                  Delete profile
                </button>
              )}
            </div>
          </section>
        </div>
    </div>
  );
};
