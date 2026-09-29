import React, { useState, useMemo } from 'react';
import { DSPParameters } from '../types';
import { AurelSlider } from './AurelSlider';

interface FineTuneViewProps {
  params: DSPParameters;
  onUpdateParams: (newParams: DSPParameters) => void;
  selectedMicModel: string;
  onSelectMicModel: (modelId: string) => void;
  onOpenVoiceCheck?: () => void;
  onOpenSaveModal?: () => void;
}

export const FineTuneView: React.FC<FineTuneViewProps> = ({
  params,
  onUpdateParams,
  selectedMicModel,
  onSelectMicModel,
  onOpenVoiceCheck,
  onOpenSaveModal,
}) => {
  const [selectedModule, setSelectedModule] = useState<string>('eq');
  const [selectedBand, setSelectedBand] = useState<number>(4);

  // Module switches state
  const [moduleToggles, setModuleToggles] = useState<Record<string, boolean>>({
    nr: true,
    ai: true,
    mic: true,
    hp: true,
    pop: true,
    click: true,
    eq: true,
    comp: true,
    warm: true,
    ds: true,
    lv: true,
    lim: true,
  });

  // Cleanup sub-switches
  const [removePops, setRemovePops] = useState<boolean>(true);
  const [removeClicks, setRemoveClicks] = useState<boolean>(true);
  const [naturalBreaths, setNaturalBreaths] = useState<boolean>(true);
  const [roomEcho, setRoomEcho] = useState<boolean>(true);
  const [noiseRemovalAmount, setNoiseRemovalAmount] = useState<number>(72);

  // Leveler settings
  const [targetLoudness, setTargetLoudness] = useState<string>('−16 LUFS · Podcast & broadcast');
  const [levelingSpeed, setLevelingSpeed] = useState<string>('Natural');

  // De-esser & Warmth
  const [deEsserAmount, setDeEsserAmount] = useState<number>(40);
  const [warmthCharacter, setWarmthCharacter] = useState<string>('Tape');
  const [warmthDrive, setWarmthDrive] = useState<number>(18);
  const [micCorrectionStrength, setMicCorrectionStrength] = useState<number>(80);

  const toggleModule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModuleToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const modules = [
    { id: 'nr', n: 1, name: 'Noise removal', sum: 'Balanced · floor −74 dB' },
    { id: 'ai', n: 2, name: 'AI Studio mode', sum: 'Recordings only' },
    { id: 'mic', n: 3, name: 'Mic correction', sum: `Measured · ${micCorrectionStrength}%` },
    { id: 'hp', n: 4, name: 'Rumble filter', sum: '80 Hz · 18 dB/oct' },
    { id: 'pop', n: 5, name: 'Pop removal', sum: 'Auto' },
    { id: 'click', n: 6, name: 'Mouth-click removal', sum: 'Light' },
    { id: 'eq', n: 7, name: 'Equalizer', sum: '5 bands · Broadcast' },
    { id: 'comp', n: 8, name: 'Compressor', sum: '3:1 · −24 dB' },
    { id: 'warm', n: 9, name: 'Analog warmth', sum: `${warmthCharacter} · ${warmthDrive}%` },
    { id: 'ds', n: 10, name: 'De-esser', sum: '6.5 kHz · −4 dB' },
    { id: 'lv', n: 11, name: 'Voice Boost & leveler', sum: '+26 dB · auto' },
    { id: 'lim', n: 12, name: 'Limiter', sum: 'Ceiling −1.0 dB' },
  ];

  // Mathematical Equalizer curve synthesis matching Design.html
  const { curveD, fillD, specD, bands, activeBandInfo } = useMemo(() => {
    const W = 836;
    const X = (f: number) => (W * Math.log10(f / 20)) / 3;
    const Y = (db: number) => 150 - db * 10;
    const l2 = (v: number) => Math.log(v) / Math.LN2;

    const resp = (f: number) => {
      const lf = l2(f);
      let db = -10 * Math.log10(1 + Math.pow(80 / f, 6));
      db += 3.5 / (1 + Math.pow(f / 120, 2));
      db += -3 * Math.exp(-Math.pow(lf - l2(300), 2) / (2 * 0.55 * 0.55));
      db += 3 * Math.exp(-Math.pow(lf - l2(3200), 2) / (2 * 0.7 * 0.7));
      db += 2.5 / (1 + Math.pow(10000 / f, 2));
      return db;
    };

    const pts: string[] = [];
    const spec: string[] = [];
    for (let i = 0; i <= 200; i++) {
      const f = 20 * Math.pow(10, (3 * i) / 200);
      pts.push(`${X(f).toFixed(1)} ${Math.max(2, Math.min(298, Y(resp(f)))).toFixed(1)}`);
      const lf = l2(f);
      let s = -10 * Math.log10(1 + Math.pow(150 / f, 4)) - 7 * Math.max(0, lf - l2(700));
      s += 3 * Math.sin(i * 1.7) * Math.exp(-Math.abs(lf - l2(1500)) / 3);
      const h = Math.max(0, 120 + s * 3.2);
      spec.push(`${X(f).toFixed(1)} ${(300 - h).toFixed(1)}`);
    }

    const cD = 'M' + pts.join(' L');
    const fD = cD + ` L${W} 150 L0 150 Z`;
    const sD = `M0 300 L` + spec.join(' L') + ` L${W} 300 Z`;

    const B = [
      { n: 1, name: 'Rumble cut', type: 'High-pass', f: 80, freq: '80 Hz', gain: '18 dB/oct', q: '' },
      { n: 2, name: 'Body', type: 'Low shelf', f: 120, freq: '120 Hz', gain: '+3.5 dB', q: 'Q 0.7' },
      { n: 3, name: 'Mud', type: 'Bell', f: 300, freq: '300 Hz', gain: '−3.0 dB', q: 'Q 1.4' },
      { n: 4, name: 'Presence', type: 'Bell', f: 3200, freq: '3.2 kHz', gain: '+3.0 dB', q: 'Q 1.0' },
      { n: 5, name: 'Air', type: 'High shelf', f: 10000, freq: '10 kHz', gain: '+2.5 dB', q: 'Q 0.7' },
    ];

    const mappedBands = B.map((b) => ({
      ...b,
      x: Number(X(b.f).toFixed(1)),
      y: Math.max(8, Math.min(292, Y(resp(b.f)))),
      selected: b.n === selectedBand,
    }));

    const cur = mappedBands.find((b) => b.n === selectedBand) || mappedBands[3];

    return { curveD: cD, fillD: fD, specD: sD, bands: mappedBands, activeBandInfo: cur };
  }, [selectedBand]);

  // Mic Correction Curves synthesis matching Design Board 28
  const { micD, corrD, resD } = useMemo(() => {
    const W = 836;
    const X = (f: number) => (W * Math.log10(f / 20)) / 3;
    const Y = (db: number) => 139 - db * 13.3;
    const l2 = (v: number) => Math.log(v) / Math.LN2;

    const micCurve = (f: number) => {
      const lf = l2(f);
      let db = -1.5 * Math.log10(1 + Math.pow(90 / f, 3));
      db += 1.8 * Math.exp(-Math.pow(lf - l2(600), 2) / (2 * 0.5 * 0.5));
      db += 2.2 * Math.exp(-Math.pow(lf - l2(4000), 2) / (2 * 0.6 * 0.6));
      return db;
    };

    const micPts: string[] = [];
    const corrPts: string[] = [];
    const resPts: string[] = [];

    const factor = micCorrectionStrength / 100;

    for (let i = 0; i <= 200; i++) {
      const f = 20 * Math.pow(10, (3 * i) / 200);
      const mDb = micCurve(f);
      const cDb = -mDb * factor;
      const rDb = mDb + cDb;

      micPts.push(`${X(f).toFixed(1)} ${Y(mDb).toFixed(1)}`);
      corrPts.push(`${X(f).toFixed(1)} ${Y(cDb).toFixed(1)}`);
      resPts.push(`${X(f).toFixed(1)} ${Y(rDb).toFixed(1)}`);
    }

    return {
      micD: 'M' + micPts.join(' L'),
      corrD: 'M' + corrPts.join(' L'),
      resD: 'M' + resPts.join(' L'),
    };
  }, [micCorrectionStrength]);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Fine-tune
              </h1>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'var(--bg-control)',
                  color: 'var(--text-secondary)',
                }}
              >
                Broadcast
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-amber)' }} />
                Edited
              </span>
            </div>
            <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
              Every stage of the voice chain, in the order Aurel processes it. Changes are heard instantly.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 14px',
                background: 'transparent',
                border: 0,
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Reset to Broadcast
            </button>

            <button
              type="button"
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 16px',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-strong)',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
            >
              Update “Broadcast”
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
                borderRadius: '10px',
                boxSizing: 'border-box',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1B1204',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Save as new profile
            </button>
          </div>
        </div>

        {/* Main 3-column Layout */}
        <div style={{ flexGrow: 1, display: 'flex', gap: '24px', minHeight: 0 }}>
          {/* Column 1: Voice Chain (Width 300px) */}
          <section
            aria-labelledby="chain-h"
            style={{
              width: '300px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '20px 14px',
              boxSizing: 'border-box',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 8px 12px' }}>
              <h2 id="chain-h" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Voice chain
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Processed top to bottom</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
              {modules.map((m) => {
                const isSelected = selectedModule === m.id;
                const isEnabled = !!moduleToggles[m.id];
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModule(m.id)}
                    style={{
                      position: 'relative',
                      height: '54px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '0 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--bg-raised)' : 'transparent',
                      border: isSelected ? '1px solid var(--border-hover)' : '1px solid transparent',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        position: 'relative',
                        width: '24px',
                        height: '24px',
                        borderRadius: '7px',
                        background: 'var(--bg-control)',
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {m.n}
                    </span>
                    <div style={{ position: 'relative', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {m.name}
                      </span>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.sum}
                      </span>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      aria-label={`${m.name} on`}
                      onClick={(e) => toggleModule(m.id, e)}
                      style={{
                        position: 'relative',
                        width: '40px',
                        height: '24px',
                        borderRadius: '12px',
                        background: isEnabled ? 'var(--accent-amber)' : '#666A73',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isEnabled ? 'flex-end' : 'flex-start',
                        padding: '3px',
                        boxSizing: 'border-box',
                        flexShrink: 0,
                        border: 0,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: isEnabled ? '#1B1204' : '#B9BBC1' }} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '14px 8px 0',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Chain latency</span>
                <span className="mono" style={{ color: 'var(--text-secondary)' }}>9.4 ms</span>
              </div>
              <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>CPU</span>
                <span className="mono" style={{ color: 'var(--text-secondary)' }}>2.1%</span>
              </div>
            </div>
          </section>

          {/* Center Column: Equalizer View OR Mic Correction View */}
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
            {selectedModule === 'mic' ? (
              /* Mic Correction Panel - Design Board 28 */
              <section
                aria-labelledby="mc-h"
                style={{
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  padding: '24px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h2 id="mc-h" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Mic correction
                    </h2>
                    <span style={{ maxWidth: '560px', fontSize: '13px', lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                      Every mic colors your voice. Aurel evens out yours first, so every profile sounds the way it should on any mic.
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                    <button
                      type="button"
                      style={{
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-strong)',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      Measured from voice check
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenVoiceCheck}
                      style={{
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-strong)',
                        boxSizing: 'border-box',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                      Measure again
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '14px', height: '3px', borderRadius: '2px', background: 'var(--meter-raw)' }} />
                    Your mic, as heard
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="14" height="4" aria-hidden="true">
                      <path d="M0 2h4M7 2h4" stroke="var(--accent-amber)" strokeWidth="2.5" />
                    </svg>
                    Correction
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '14px', height: '3px', borderRadius: '2px', background: 'var(--text-primary)' }} />
                    Result, before your profile
                  </span>
                </div>

                <div style={{ position: 'relative', width: '100%', height: '300px' }}>
                  <svg width="100%" height="300" viewBox="0 0 836 300" preserveAspectRatio="none" role="img" aria-label="Mic correction curves">
                    <line x1="110.9" y1="0" x2="110.9" y2="278" stroke="#23262B" />
                    <line x1="194.8" y1="0" x2="194.8" y2="278" stroke="#23262B" />
                    <line x1="278.7" y1="0" x2="278.7" y2="278" stroke="#23262B" />
                    <line x1="389.6" y1="0" x2="389.6" y2="278" stroke="#23262B" />
                    <line x1="473.4" y1="0" x2="473.4" y2="278" stroke="#23262B" />
                    <line x1="557.3" y1="0" x2="557.3" y2="278" stroke="#23262B" />
                    <line x1="668.2" y1="0" x2="668.2" y2="278" stroke="#23262B" />
                    <line x1="752.1" y1="0" x2="752.1" y2="278" stroke="#23262B" />
                    <line x1="0" y1="59" x2="836" y2="59" stroke="#23262B" />
                    <line x1="0" y1="139" x2="836" y2="139" stroke="#3A3E46" />
                    <line x1="0" y1="219" x2="836" y2="219" stroke="#23262B" />

                    <path d={micD} fill="none" stroke="var(--meter-raw)" strokeWidth="2.5" />
                    <path d={corrD} fill="none" stroke="var(--accent-amber)" strokeWidth="2.5" strokeDasharray="6 5" />
                    <path d={resD} fill="none" stroke="var(--text-primary)" strokeWidth="3" />

                    <text x="110.9" y="296" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">50</text>
                    <text x="194.8" y="296" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">100</text>
                    <text x="278.7" y="296" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">200</text>
                    <text x="389.6" y="296" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">500</text>
                    <text x="473.4" y="296" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">1k</text>
                    <text x="557.3" y="296" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">2k</text>
                    <text x="668.2" y="296" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">5k</text>
                    <text x="752.1" y="296" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">10k</text>
                  </svg>
                  <div className="mono" style={{ position: 'absolute', left: '8px', top: '51px', display: 'flex', flexDirection: 'column', gap: '64px', fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: '16px' }}>
                    <span>+6</span>
                    <span>0 dB</span>
                    <span>−6</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '14px 16px', borderRadius: '10px', background: '#1B1D21', border: '1px solid var(--border-subtle)' }}>
                    <span className="mono" style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)' }}>+3.2 dB</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Body · 100–250 Hz</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Your mic sounds thin down low</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '14px 16px', borderRadius: '10px', background: '#1B1D21', border: '1px solid var(--border-subtle)' }}>
                    <span className="mono" style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)' }}>−2.0 dB</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Boxiness · 500–800 Hz</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>The “talking into a cup” tone</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '14px 16px', borderRadius: '10px', background: '#1B1D21', border: '1px solid var(--border-subtle)' }}>
                    <span className="mono" style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)' }}>−2.4 dB</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Harshness · 3–5 kHz</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Edgy peak common in budget mics</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <span style={{ fontSize: '13px', width: '70px', color: 'var(--text-primary)' }}>Strength</span>
                  <div style={{ flexGrow: 1, maxWidth: '640px' }}>
                    <AurelSlider
                      value={micCorrectionStrength}
                      onChange={setMicCorrectionStrength}
                      min={0}
                      max={100}
                      ariaLabel="Mic correction strength"
                    />
                  </div>
                  <span className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{micCorrectionStrength}%</span>
                </div>

                <p style={{ margin: 0, marginTop: 'auto', display: 'flex', gap: '8px', fontSize: '12px', lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5M12 8v.01" />
                  </svg>
                  Estimated from your voice, not a lab measurement. A longer voice check gives a more accurate result.
                </p>
              </section>
            ) : (
              /* Equalizer Panel - Design Board 03 */
              <>
                <section
                  aria-labelledby="eq-h"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                    padding: '22px 24px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'space-between', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                      <h2 id="eq-h" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Equalizer
                      </h2>
                      <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                        Drag a point to shape your tone. Scroll to change its width.
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#2A2D33' }} />
                        Your voice, live
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '14px', height: '3px', borderRadius: '2px', background: 'var(--accent-amber)' }} />
                        EQ curve
                      </span>
                    </div>
                  </div>

                  <div style={{ position: 'relative', width: '100%', height: '322px' }}>
                    <svg width="100%" height="322" viewBox="0 0 836 322" preserveAspectRatio="none" role="img" aria-label="Equalizer curve with five bands">
                      <path d={specD} fill="#202328" />
                      <line x1="110.9" y1="0" x2="110.9" y2="300" stroke="#23262B" />
                      <line x1="194.8" y1="0" x2="194.8" y2="300" stroke="#23262B" />
                      <line x1="278.7" y1="0" x2="278.7" y2="300" stroke="#23262B" />
                      <line x1="389.6" y1="0" x2="389.6" y2="300" stroke="#23262B" />
                      <line x1="473.4" y1="0" x2="473.4" y2="300" stroke="#23262B" />
                      <line x1="557.3" y1="0" x2="557.3" y2="300" stroke="#23262B" />
                      <line x1="668.2" y1="0" x2="668.2" y2="300" stroke="#23262B" />
                      <line x1="752.1" y1="0" x2="752.1" y2="300" stroke="#23262B" />
                      <line x1="0" y1="30" x2="836" y2="30" stroke="#23262B" />
                      <line x1="0" y1="90" x2="836" y2="90" stroke="#23262B" />
                      <line x1="0" y1="150" x2="836" y2="150" stroke="#3A3E46" />
                      <line x1="0" y1="210" x2="836" y2="210" stroke="#23262B" />
                      <line x1="0" y1="270" x2="836" y2="270" stroke="#23262B" />

                      <path d={fillD} fill="var(--accent-amber)" opacity="0.1" />
                      <path d={curveD} fill="none" stroke="var(--accent-amber)" strokeWidth="2.5" strokeLinejoin="round" />

                      {/* Active band guideline */}
                      <line x1={activeBandInfo.x} y1="0" x2={activeBandInfo.x} y2="300" stroke="var(--accent-amber)" strokeDasharray="3 4" opacity="0.5" />

                      <text x="110.9" y="318" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">50</text>
                      <text x="194.8" y="318" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">100</text>
                      <text x="278.7" y="318" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">200</text>
                      <text x="389.6" y="318" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">500</text>
                      <text x="473.4" y="318" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">1k</text>
                      <text x="557.3" y="318" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">2k</text>
                      <text x="668.2" y="318" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">5k</text>
                      <text x="752.1" y="318" fill="#8C9098" fontSize="11" textAnchor="middle" fontFamily="Geist Mono, monospace">10k</text>
                    </svg>

                    {/* 5 Band interactive node circles (Always true circular discs, never oval) */}
                    {bands.map((b) => {
                      const pctX = (b.x / 836) * 100;
                      const isSel = b.selected;
                      const size = isSel ? 18 : 14;
                      return (
                        <button
                          key={b.n}
                          type="button"
                          onClick={() => setSelectedBand(b.n)}
                          aria-label={`Select ${b.name} band`}
                          style={{
                            position: 'absolute',
                            left: `${pctX}%`,
                            top: `${b.y}px`,
                            transform: 'translate(-50%, -50%)',
                            width: `${size}px`,
                            height: `${size}px`,
                            borderRadius: '50%',
                            background: isSel ? 'var(--accent-amber)' : '#16181B',
                            border: `2px solid ${isSel ? '#F3F2EF' : 'var(--accent-amber)'}`,
                            boxShadow: isSel ? '0 0 12px rgba(245, 166, 35, 0.7)' : '0 2px 6px rgba(0,0,0,0.5)',
                            cursor: 'pointer',
                            padding: 0,
                            zIndex: 5,
                            transition: 'width 0.12s ease, height 0.12s ease, box-shadow 0.12s ease',
                          }}
                        />
                      );
                    })}

                    <div className="mono" style={{ position: 'absolute', left: '8px', top: '22px', display: 'flex', flexDirection: 'column', gap: '44px', fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: '16px' }}>
                      <span>+12</span>
                      <span>+6</span>
                      <span>0 dB</span>
                      <span>−6</span>
                      <span>−12</span>
                    </div>

                    {/* Node floating tooltip */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `clamp(10px, ${(activeBandInfo.x / 836) * 100}% + 14px, calc(100% - 210px))`,
                        top: `${Math.max(10, activeBandInfo.y - 50)}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: '#2B2E34',
                        border: '1px solid #3A3E46',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        zIndex: 10,
                        pointerEvents: 'none',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {activeBandInfo.n} · {activeBandInfo.name}
                      </span>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {activeBandInfo.freq} · {activeBandInfo.gain} {activeBandInfo.q ? `· ${activeBandInfo.q}` : ''}
                      </span>
                    </div>
                  </div>

                  <div role="list" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '10px' }}>
                    {bands.map((b) => (
                      <div
                        key={b.n}
                        role="listitem"
                        onClick={() => setSelectedBand(b.n)}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: '#1B1D21',
                          border: `1px solid ${b.selected ? 'var(--accent-amber)' : 'var(--border-subtle)'}`,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{b.n} · {b.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{b.type}</span>
                        </div>
                        <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span>{b.freq}</span>
                          <span>{b.gain}</span>
                          <span>{b.q}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Sub-grid below EQ: Cleanup & Voice Boost/Leveler */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
                  {/* Cleanup Box */}
                  <section
                    aria-labelledby="nr-h"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      padding: '20px 22px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h2 id="nr-h" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Cleanup
                      </h2>
                      <span className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Noise removal {noiseRemovalAmount}%
                      </span>
                    </div>

                    <AurelSlider
                      value={noiseRemovalAmount}
                      onChange={setNoiseRemovalAmount}
                      min={0}
                      max={100}
                      ariaLabel="Noise removal amount"
                    />

                    <div style={{ minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Remove pops</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Softens thumps from “p” and “b”</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={removePops}
                        onClick={() => setRemovePops(!removePops)}
                        style={{
                          width: '40px',
                          height: '24px',
                          borderRadius: '12px',
                          background: removePops ? 'var(--accent-amber)' : '#666A73',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: removePops ? 'flex-end' : 'flex-start',
                          padding: '3px',
                          boxSizing: 'border-box',
                          flexShrink: 0,
                          border: 0,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: removePops ? '#1B1204' : '#B9BBC1' }} />
                      </button>
                    </div>

                    <div style={{ minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Remove mouth clicks</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Lip smacks and clicks that boosting makes louder</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={removeClicks}
                        onClick={() => setRemoveClicks(!removeClicks)}
                        style={{
                          width: '40px',
                          height: '24px',
                          borderRadius: '12px',
                          background: removeClicks ? 'var(--accent-amber)' : '#666A73',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: removeClicks ? 'flex-end' : 'flex-start',
                          padding: '3px',
                          boxSizing: 'border-box',
                          flexShrink: 0,
                          border: 0,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: removeClicks ? '#1B1204' : '#B9BBC1' }} />
                      </button>
                    </div>

                    <div style={{ minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Keep breaths natural</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Avoids the gated, robotic sound</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={naturalBreaths}
                        onClick={() => setNaturalBreaths(!naturalBreaths)}
                        style={{
                          width: '40px',
                          height: '24px',
                          borderRadius: '12px',
                          background: naturalBreaths ? 'var(--accent-amber)' : '#666A73',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: naturalBreaths ? 'flex-end' : 'flex-start',
                          padding: '3px',
                          boxSizing: 'border-box',
                          flexShrink: 0,
                          border: 0,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: naturalBreaths ? '#1B1204' : '#B9BBC1' }} />
                      </button>
                    </div>

                    <div style={{ minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Reduce room echo</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Helps in bare, hard-walled rooms</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={roomEcho}
                        onClick={() => setRoomEcho(!roomEcho)}
                        style={{
                          width: '40px',
                          height: '24px',
                          borderRadius: '12px',
                          background: roomEcho ? 'var(--accent-amber)' : '#666A73',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: roomEcho ? 'flex-end' : 'flex-start',
                          padding: '3px',
                          boxSizing: 'border-box',
                          flexShrink: 0,
                          border: 0,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: roomEcho ? '#1B1204' : '#B9BBC1' }} />
                      </button>
                    </div>
                  </section>

                  {/* Voice Boost & Leveler */}
                  <section
                    aria-labelledby="lv-h"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      padding: '20px 22px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h2 id="lv-h" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Voice Boost &amp; leveler
                      </h2>
                      <span className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>+26 dB</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Target loudness</span>
                      <button
                        type="button"
                        style={{
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '0 12px',
                          borderRadius: '8px',
                          background: 'var(--bg-raised)',
                          border: '1px solid var(--border-strong)',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {targetLoudness}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Maximum lift</span>
                      <span className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>30 dB</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Leveling speed</span>
                      <div
                        role="group"
                        aria-label="Leveling speed"
                        style={{
                          display: 'flex',
                          gap: '2px',
                          padding: '3px',
                          background: '#111215',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                        }}
                      >
                        {['Gentle', 'Natural', 'Fast'].map((speed) => {
                          const isSel = levelingSpeed === speed;
                          return (
                            <button
                              key={speed}
                              type="button"
                              aria-pressed={isSel}
                              onClick={() => setLevelingSpeed(speed)}
                              style={{
                                height: '28px',
                                padding: '0 12px',
                                border: 0,
                                borderRadius: '6px',
                                background: isSel ? '#2B2E34' : 'transparent',
                                color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '12px',
                                fontWeight: isSel ? 600 : 500,
                              }}
                            >
                              {speed}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                </div>
              </>
            )}
          </div>

          {/* Right Column: Compressor, De-esser, Analog Warmth (Width 360px) */}
          <div style={{ width: '360px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Compressor Card */}
            <section
              aria-labelledby="comp-h"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                padding: '22px 24px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 id="comp-h" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Compressor
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Evens out loud and soft words</span>
              </div>

              <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                <svg width="100%" height="200" viewBox="0 0 312 200" preserveAspectRatio="none" role="img" aria-label="Compressor transfer curve">
                  <rect width="312" height="200" rx="8" fill="#1B1D21" />
                  <line x1="104" y1="0" x2="104" y2="200" stroke="#26292E" />
                  <line x1="208" y1="0" x2="208" y2="200" stroke="#26292E" />
                  <line x1="0" y1="66.7" x2="312" y2="66.7" stroke="#26292E" />
                  <line x1="0" y1="133.3" x2="312" y2="133.3" stroke="#26292E" />
                  <line x1="0" y1="200" x2="312" y2="0" stroke="#3A3E46" strokeDasharray="3 4" />
                  <line x1="187.2" y1="0" x2="187.2" y2="200" stroke="var(--accent-amber)" strokeDasharray="3 4" opacity="0.5" />
                  <path d="M0 200 L175 88 Q187.2 80 200 76 L312 53.3" fill="none" stroke="var(--accent-amber)" strokeWidth="2.5" strokeLinecap="round" />
                  <text x="192" y="16" fill="var(--accent-amber-text)" fontSize="10" fontFamily="Geist Mono, monospace">−24 dB</text>
                </svg>
                {/* Compressor knee point circular dot - always circular */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${(239 / 312) * 100}%`,
                    top: `${(65 / 200) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#F3F2EF',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    pointerEvents: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Gain reduction</span>
                  <span className="mono" style={{ color: 'var(--text-primary)' }}>−4.2 dB</span>
                </div>
                <svg width="100%" height="6" viewBox="0 0 312 6" preserveAspectRatio="none" aria-hidden="true">
                  <rect width="312" height="6" rx="3" fill="#23262B" />
                  <rect x="232" width="80" height="6" rx="3" fill="#5CC8DF" />
                </svg>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  ['Threshold', '−24 dB'],
                  ['Ratio', '3.0 : 1'],
                  ['Attack', '8 ms'],
                  ['Release', '120 ms'],
                ].map(([k, v]) => (
                  <div key={k} style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #22252A' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{k}</span>
                    <span className="mono" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* De-esser Card */}
            <section
              aria-labelledby="ds-h"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '18px 24px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 id="ds-h" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  De-esser
                </h2>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>6.5 kHz · −4 dB</span>
              </div>
              <AurelSlider
                value={deEsserAmount}
                onChange={setDeEsserAmount}
                min={0}
                max={100}
                ariaLabel="De-esser amount"
              />
            </section>

            {/* Analog Warmth Card */}
            <section
              aria-labelledby="aw-h"
              style={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '18px 24px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 id="aw-h" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Analog warmth
                </h2>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{warmthCharacter} · {warmthDrive}%</span>
              </div>
              <span style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                Subtle saturation, like a studio preamp. Adds richness, never distortion.
              </span>

              <div
                role="group"
                aria-label="Warmth character"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '2px',
                  padding: '3px',
                  background: '#111215',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                }}
              >
                {['Tape', 'Tube', 'Console'].map((char) => {
                  const isSel = warmthCharacter === char;
                  return (
                    <button
                      key={char}
                      type="button"
                      aria-pressed={isSel}
                      onClick={() => setWarmthCharacter(char)}
                      style={{
                        height: '30px',
                        border: 0,
                        borderRadius: '7px',
                        background: isSel ? '#2B2E34' : 'transparent',
                        color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: isSel ? 600 : 500,
                      }}
                    >
                      {char}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '6px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Drive</span>
                <span className="mono" style={{ color: 'var(--text-secondary)' }}>{warmthDrive}%</span>
              </div>
              <AurelSlider
                value={warmthDrive}
                onChange={setWarmthDrive}
                min={0}
                max={100}
                ariaLabel="Warmth drive"
              />
            </section>
          </div>
        </div>
    </div>
  );
};
