import React, { useState } from 'react';
import { AudioDeviceOption } from '../types';
import { CABLE_PLAYBACK_NAME, CABLE_RECORDING_NAME, findCablePlayback, isCablePlayback } from '../routing';

interface ConnectAppsViewProps {
  outputDevices: AudioDeviceOption[];
  selectedOutputId: string;
  inputDeviceLabel: string;
  onOpenSettings: () => void;
}

export const ConnectAppsView: React.FC<ConnectAppsViewProps> = ({
  outputDevices,
  selectedOutputId,
  inputDeviceLabel,
  onOpenSettings,
}) => {
  const [selectedAppId, setSelectedAppId] = useState<string>('discord');
  const [copied, setCopied] = useState<boolean>(false);
  const [checkedSuccess, setCheckedSuccess] = useState<boolean>(false);

  const apps = [
    {
      id: 'teams',
      mono: 'Te',
      name: 'Microsoft Teams',
      sub: 'Live now · in a meeting',
      live: true,
      device: 'CABLE Output',
      st: 'ok',
      path: 'Open Teams, then Settings › Devices.',
    },
    {
      id: 'obs',
      mono: 'Ob',
      name: 'OBS Studio',
      sub: 'Live now · recording',
      live: true,
      device: 'CABLE Output',
      st: 'ok',
      path: 'Open OBS, then Settings › Audio.',
    },
    {
      id: 'zoom',
      mono: 'Zo',
      name: 'Zoom Workplace',
      sub: 'Follows Windows default',
      live: false,
      device: 'CABLE Output',
      st: 'ok',
      path: 'Open Zoom, then Settings › Audio.',
    },
    {
      id: 'discord',
      mono: 'Di',
      name: 'Discord',
      sub: 'Set to a specific mic',
      live: false,
      device: checkedSuccess ? 'CABLE Output' : 'USB Microphone (unprocessed)',
      st: checkedSuccess ? 'ok' : 'warn',
      path: 'Open Discord, then User Settings › Voice & Video.',
    },
    {
      id: 'chrome',
      mono: 'Ch',
      name: 'Google Chrome',
      sub: 'Meet and other web apps',
      live: false,
      device: 'CABLE Output',
      st: 'ok',
      path: 'In Chrome, open Settings › Privacy › Site settings › Microphone.',
    },
    {
      id: 'audacity',
      mono: 'Au',
      name: 'Audacity',
      sub: 'Not opened since setup',
      live: false,
      device: 'Follows Windows default',
      st: 'idle',
      path: 'Open Audacity, then Audio Setup › Recording Device.',
    },
  ];

  const currentApp = apps.find((a) => a.id === selectedAppId) || apps[3];
  const isWarn = currentApp.st === 'warn';
  const eyebrow = isWarn ? 'Needs one change' : 'Already connected';
  const eyebrowColor = isWarn ? '#FFC869' : '#6BE3A4';
  const guideWhy = isWarn
    ? `${currentApp.name} is set to your microphone directly, so people hear the raw, quiet mic. It takes about 20 seconds to fix.`
    : `${currentApp.name} already hears your enhanced voice. If you ever pick a specific mic in it, choose CABLE Output.`;

  const cableDevice = findCablePlayback(outputDevices);
  const selectedOutput = outputDevices.find((d) => d.deviceId === selectedOutputId);
  const isSendingToCable = !!selectedOutput && isCablePlayback(selectedOutput.label);

  const handleCopyDeviceName = () => {
    navigator.clipboard?.writeText(CABLE_RECORDING_NAME);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenSoundSettings = () => {
    window.studioAPI?.openSoundSettings?.();
  };

  const handleGetCable = () => {
    window.studioAPI?.openVBCableFolder?.();
  };

  const handleCheckAgain = () => {
    if (selectedAppId === 'discord') {
      setCheckedSuccess(true);
    }
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
              Connect apps
            </h1>
            <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
              Aurel sends your enhanced voice through VB-Audio Cable. Any app set to “CABLE Output” as its microphone hears it.
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenSoundSettings}
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
            Open Windows sound settings
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
            </svg>
          </button>
        </div>

        {/* How your voice is routed (Height 208px Banner) */}
        <section
          aria-label="How your voice is routed"
          style={{
            height: '208px',
            flexShrink: 0,
            display: 'flex',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          {/* Left Routing diagram */}
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '12px', padding: '0 32px' }}>
            <div style={{ width: '170px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'var(--bg-control)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inputDeviceLabel}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Your microphone</span>
              </div>
            </div>

            <svg width="70" height="20" viewBox="0 0 70 20" aria-hidden="true" style={{ flexShrink: 0, marginTop: '-52px' }}>
              <path d="M4 10h56" stroke="#3A3E46" strokeWidth="2" strokeDasharray="4 5" />
              <path d="m56 5 6 5-6 5" fill="none" stroke="#3A3E46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div style={{ width: '210px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <svg width="52" height="52" viewBox="0 0 28 28" aria-hidden="true">
                <rect width="28" height="28" rx="8" fill="#F5A623" />
                <path d="M8 14v0M11 10.5v7M14 7.5v13M17 10.5v7M20 13.5v1" stroke="#1B1204" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Aurel engine</span>
                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Broadcast · +26 dB · noise removed</span>
              </div>
            </div>

            <svg width="70" height="20" viewBox="0 0 70 20" aria-hidden="true" style={{ flexShrink: 0, marginTop: '-52px' }}>
              <path d="M4 10h56" stroke="var(--accent-amber)" strokeWidth="2" />
              <path d="m56 5 6 5-6 5" fill="none" stroke="var(--accent-amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'var(--accent-amber-tint)',
                  border: '1px solid var(--accent-amber-border)',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber-text)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>VB-Audio Cable</span>
                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>CABLE Input › CABLE Output</span>
              </div>
            </div>

            <svg width="70" height="20" viewBox="0 0 70 20" aria-hidden="true" style={{ flexShrink: 0, marginTop: '-52px' }}>
              <path d="M4 10h56" stroke="var(--accent-amber)" strokeWidth="2" />
              <path d="m56 5 6 5-6 5" fill="none" stroke="var(--accent-amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex' }}>
                <span style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#2B2E34', border: '2px solid var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#F3F2EF' }}>Te</span>
                <span style={{ width: '52px', height: '52px', marginLeft: '-14px', borderRadius: '14px', background: '#2B2E34', border: '2px solid var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#F3F2EF' }}>Zo</span>
                <span style={{ width: '52px', height: '52px', marginLeft: '-14px', borderRadius: '14px', background: '#2B2E34', border: '2px solid var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#F3F2EF' }}>Ob</span>
                <span className="mono" style={{ width: '52px', height: '52px', marginLeft: '-14px', borderRadius: '14px', background: '#23262B', border: '2px solid var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>+3</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Your apps</span>
                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Meetings, streaming, recording</span>
              </div>
            </div>
          </div>

          {/* Right: VB-Cable status */}
          <div
            style={{
              width: '460px',
              flexShrink: 0,
              borderLeft: '1px solid var(--border-subtle)',
              background: 'var(--bg-sidebar)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '14px',
              padding: '0 28px',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                alignSelf: 'flex-start',
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '999px',
                background: isSendingToCable ? 'var(--color-success-tint)' : 'var(--accent-amber-tint)',
                color: isSendingToCable ? 'var(--color-success-text)' : 'var(--accent-amber-text)',
              }}
            >
              {isSendingToCable ? 'Connected' : cableDevice ? 'Not sending to the cable' : 'VB-Audio Cable not found'}
            </span>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {isSendingToCable
                ? 'Your voice is going into VB-Audio Cable'
                : cableDevice
                ? 'Aurel is sending your voice somewhere else'
                : 'Install VB-Audio Cable to reach your apps'}
            </span>
            <span style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              {isSendingToCable
                ? `Aurel plays into ${CABLE_PLAYBACK_NAME}. Apps set to CABLE Output hear it.`
                : cableDevice
                ? `Apps can’t hear you until Aurel’s output is set to ${CABLE_PLAYBACK_NAME}.`
                : 'It’s free. Run the installer as administrator, then restart your PC. Aurel finds the cable automatically.'}
            </span>
            {!isSendingToCable && (
              <button
                type="button"
                onClick={cableDevice ? onOpenSettings : handleGetCable}
                style={{
                  alignSelf: 'flex-start',
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: 'var(--accent-amber)',
                  border: 0,
                  color: '#1B1204',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {cableDevice ? 'Choose output in Settings' : 'Get VB-Cable'}
              </button>
            )}
          </div>
        </section>

        {/* Bottom 2-column Layout */}
        <div style={{ flexGrow: 1, display: 'flex', gap: '24px', minHeight: 0 }}>
          {/* Left Apps list */}
          <section
            aria-labelledby="apps-h"
            style={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px 12px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <h2 id="apps-h" style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Apps on this PC
                </h2>
                <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                  {checkedSuccess ? '5 of 6 hear your enhanced voice' : '4 of 6 hear your enhanced voice · 1 needs a fix'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCheckAgain}
                style={{
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid var(--border-strong)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                Checked just now
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1fr',
                padding: '0 16px 8px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
                borderBottom: '1px solid #22252A',
              }}
            >
              <span>App</span>
              <span>Microphone in use</span>
              <span style={{ textAlign: 'right' }}>Status</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              {apps.map((a) => {
                const isSelected = selectedAppId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAppId(a.id)}
                    style={{
                      position: 'relative',
                      height: '70px',
                      flexShrink: 0,
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 1fr 1fr',
                      alignItems: 'center',
                      padding: '0 16px',
                      border: 0,
                      borderBottom: '1px solid #1F2226',
                      borderRadius: isSelected ? '10px' : 0,
                      background: isSelected ? 'var(--bg-raised)' : 'transparent',
                      textAlign: 'left',
                      transition: 'background 0.12s ease',
                    }}
                  >
                    <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '11px',
                          background: '#2B2E34',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#F3F2EF',
                          flexShrink: 0,
                        }}
                      >
                        {a.mono}
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{a.name}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          {a.live && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF6A5C' }} />}
                          {a.sub}
                        </span>
                      </span>
                    </span>

                    <span style={{ position: 'relative', fontSize: '13px', color: 'var(--text-secondary)' }}>{a.device}</span>

                    <span style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
                      {a.st === 'ok' && (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '5px 10px',
                            borderRadius: '999px',
                            background: '#16301F',
                            color: '#6BE3A4',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m5 12 5 5 9-10" />
                          </svg>
                          Enhanced
                        </span>
                      )}
                      {a.st === 'warn' && (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '5px 10px',
                            borderRadius: '999px',
                            background: '#2A2111',
                            color: '#FFC869',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                            <path d="M12 8v5M12 16.5v.5" />
                            <circle cx="12" cy="12" r="9" />
                          </svg>
                          Raw mic · fix
                        </span>
                      )}
                      {a.st === 'idle' && (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            padding: '5px 10px',
                            borderRadius: '999px',
                            background: '#22252A',
                            color: '#B9BBC1',
                          }}
                        >
                          Ready when opened
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Right Guide Aside */}
          <aside
            aria-labelledby="guide-h"
            style={{
              width: '560px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              padding: '24px 26px',
              boxSizing: 'border-box',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: eyebrowColor,
                }}
              >
                {eyebrow}
              </span>
              <h2 id="guide-h" style={{ margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                Switch {currentApp.name} to Aurel
              </h2>
              <span style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                {guideWhy}
              </span>
            </div>

            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <li style={{ display: 'flex', gap: '14px' }}>
                <span
                  className="mono"
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--bg-control)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--text-primary)',
                  }}
                >
                  1
                </span>
                <span style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--text-primary)' }}>
                  {currentApp.path}
                </span>
              </li>

              <li style={{ display: 'flex', gap: '14px' }}>
                <span
                  className="mono"
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--bg-control)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--text-primary)',
                  }}
                >
                  2
                </span>
                <span style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--text-primary)' }}>
                  Under <strong>Input device</strong>, choose <strong>{CABLE_RECORDING_NAME}</strong>.
                </span>
              </li>

              <li style={{ display: 'flex', gap: '14px' }}>
                <span
                  className="mono"
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--bg-control)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--text-primary)',
                  }}
                >
                  3
                </span>
                <span style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--text-primary)' }}>
                  Turn off the app’s own noise suppression and auto volume. Aurel already does both — doubling up makes voices thin.
                </span>
              </li>
            </ol>

            {/* Simulated dropdown illustration from design */}
            <div
              aria-hidden="true"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '18px',
                borderRadius: '12px',
                background: '#111215',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                Input device
              </span>
              <div
                style={{
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--accent-amber)',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                }}
              >
                {CABLE_RECORDING_NAME}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="m6 15 6-6 6 6" />
                </svg>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '4px',
                  borderRadius: '8px',
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <span style={{ height: '34px', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Default
                </span>
                <span
                  style={{
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 10px',
                    borderRadius: '6px',
                    background: 'var(--accent-amber-tint)',
                    fontSize: '13px',
                    color: 'var(--accent-amber-text)',
                  }}
                >
                  {CABLE_RECORDING_NAME}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                </span>
                <span style={{ height: '34px', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {inputDeviceLabel}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleCopyDeviceName}
                style={{
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  background: 'var(--bg-surface)',
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
                {copied ? 'Copied!' : 'Copy device name'}
              </button>

              <button
                type="button"
                onClick={handleCheckAgain}
                style={{
                  flexGrow: 1,
                  height: '42px',
                  borderRadius: '10px',
                  background: 'var(--accent-amber)',
                  border: 0,
                  color: '#1B1204',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                I’ve switched — check again
              </button>
            </div>
          </aside>
        </div>
    </div>
  );
};
