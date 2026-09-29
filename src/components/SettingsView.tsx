import React, { useState } from 'react';
import { AudioDeviceOption } from '../types';
import { CABLE_PLAYBACK_NAME, findCablePlayback, isCablePlayback } from '../routing';

interface SettingsViewProps {
  inputDevices: AudioDeviceOption[];
  outputDevices: AudioDeviceOption[];
  selectedInputId: string;
  selectedOutputId: string;
  selectedMonitorId: string;
  onSelectInputId: (id: string) => void;
  onSelectOutputId: (id: string) => void;
  onSelectMonitorId: (id: string) => void;
  theme: 'dark' | 'light' | 'system';
  onThemeChange: (theme: 'dark' | 'light' | 'system') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  inputDevices,
  outputDevices,
  selectedInputId,
  selectedOutputId,
  selectedMonitorId,
  onSelectInputId,
  onSelectOutputId,
  onSelectMonitorId,
  theme,
  onThemeChange,
}) => {
  const [startWithWindows, setStartWithWindows] = useState<boolean>(true);
  const [startInTray, setStartInTray] = useState<boolean>(true);
  const [closeAction, setCloseAction] = useState<string>('Keep running in the tray');
  const [alertDisconnect, setAlertDisconnect] = useState<boolean>(true);
  const [sampleRate, setSampleRate] = useState<string>('48 kHz');
  const [bufferOption, setBufferOption] = useState<string>('256 samples · 5.3 ms buffer');
  const [processingQuality, setProcessingQuality] = useState<string>('Balanced');
  const [aiStudioMode, setAiStudioMode] = useState<string>('Recordings only');

  const selectedInput = inputDevices.find((d) => d.deviceId === selectedInputId) || inputDevices[0];
  const selectedOutput = outputDevices.find((d) => d.deviceId === selectedOutputId);
  const cableDevice = findCablePlayback(outputDevices);
  const isSendingToCable = !!selectedOutput && isCablePlayback(selectedOutput.label);
  const outputHint = isSendingToCable
    ? 'Apps set to CABLE Output hear your enhanced voice'
    : cableDevice
    ? `Choose ${CABLE_PLAYBACK_NAME} so your apps can hear you`
    : 'Install VB-Audio Cable so your apps can hear you';

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
              Settings
            </h1>
            <span style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Changes save automatically.</span>
          </div>
        </div>

        {/* 2-column Grid */}
        <div style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px', alignItems: 'start' }}>
          {/* Column 1: General, Audio Engine, Appearance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* General */}
            <section
              aria-labelledby="gen-h"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 24px 8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
              }}
            >
              <h2 id="gen-h" style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                General
              </h2>

              <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', borderTop: '1px solid #22252A' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Start Aurel when Windows starts</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Your voice is enhanced before your first meeting</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={startWithWindows}
                  onClick={() => setStartWithWindows(!startWithWindows)}
                  aria-label="Start with Windows"
                  style={{
                    width: '40px',
                    height: '24px',
                    borderRadius: '12px',
                    background: startWithWindows ? 'var(--accent-amber)' : '#666A73',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: startWithWindows ? 'flex-end' : 'flex-start',
                    padding: '3px',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    border: 0,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: startWithWindows ? '#1B1204' : '#B9BBC1' }} />
                </button>
              </div>

              <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', borderTop: '1px solid #22252A' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Start in the system tray</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Opens quietly without showing this window</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={startInTray}
                  onClick={() => setStartInTray(!startInTray)}
                  aria-label="Start in tray"
                  style={{
                    width: '40px',
                    height: '24px',
                    borderRadius: '12px',
                    background: startInTray ? 'var(--accent-amber)' : '#666A73',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: startInTray ? 'flex-end' : 'flex-start',
                    padding: '3px',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    border: 0,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: startInTray ? '#1B1204' : '#B9BBC1' }} />
                </button>
              </div>

              <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', borderTop: '1px solid #22252A' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>When I close the window</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Apps using CABLE Output keep working</span>
                </div>
                <button
                  type="button"
                  style={{
                    height: '36px',
                    minWidth: '220px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {closeAction}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>

              <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', borderTop: '1px solid #22252A' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Alert me if my mic disconnects</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>A Windows notification, so you’re never silent by surprise</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={alertDisconnect}
                  onClick={() => setAlertDisconnect(!alertDisconnect)}
                  aria-label="Disconnect alerts"
                  style={{
                    width: '40px',
                    height: '24px',
                    borderRadius: '12px',
                    background: alertDisconnect ? 'var(--accent-amber)' : '#666A73',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: alertDisconnect ? 'flex-end' : 'flex-start',
                    padding: '3px',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    border: 0,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: alertDisconnect ? '#1B1204' : '#B9BBC1' }} />
                </button>
              </div>
            </section>

            {/* Audio engine */}
            <section
              aria-labelledby="eng-h"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 24px 8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
              }}
            >
              <h2 id="eng-h" style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Audio engine
              </h2>

              <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', borderTop: '1px solid #22252A' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Microphone</span>
                <select
                  value={selectedInputId}
                  onChange={(e) => onSelectInputId(e.target.value)}
                  style={{
                    height: '36px',
                    minWidth: '260px',
                    borderRadius: '8px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-strong)',
                    padding: '0 12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                  }}
                >
                  {inputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || 'USB Microphone'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', borderTop: '1px solid #22252A' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 0' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Send my voice to</span>
                  <span style={{ fontSize: '12px', color: isSendingToCable ? 'var(--text-tertiary)' : 'var(--accent-amber-text)' }}>{outputHint}</span>
                </div>
                <select
                  aria-label="Send my voice to"
                  value={selectedOutputId}
                  onChange={(e) => onSelectOutputId(e.target.value)}
                  style={{
                    height: '36px',
                    minWidth: '260px',
                    maxWidth: '340px',
                    borderRadius: '8px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-strong)',
                    padding: '0 12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                  }}
                >
                  <option value="">Nowhere yet</option>
                  {outputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || 'Output device'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', borderTop: '1px solid #22252A' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Monitor through</span>
                <select
                  aria-label="Monitor through"
                  value={selectedMonitorId}
                  onChange={(e) => onSelectMonitorId(e.target.value)}
                  style={{
                    height: '36px',
                    minWidth: '260px',
                    maxWidth: '340px',
                    borderRadius: '8px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-strong)',
                    padding: '0 12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                  }}
                >
                  <option value="">Windows default output</option>
                  {outputDevices
                    .filter((d) => !isCablePlayback(d.label))
                    .map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || 'Headphones'}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', borderTop: '1px solid #22252A' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Sample rate</span>
                <div
                  role="group"
                  aria-label="Sample rate"
                  style={{
                    display: 'flex',
                    gap: '2px',
                    padding: '3px',
                    background: '#111215',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                  }}
                >
                  {['44.1 kHz', '48 kHz', '96 kHz'].map((sr) => {
                    const isSel = sampleRate === sr;
                    return (
                      <button
                        key={sr}
                        type="button"
                        aria-pressed={isSel}
                        onClick={() => setSampleRate(sr)}
                        className="mono"
                        style={{
                          height: '30px',
                          padding: '0 12px',
                          border: 0,
                          borderRadius: '6px',
                          background: isSel ? '#2B2E34' : 'transparent',
                          color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: isSel ? 600 : 500,
                        }}
                      >
                        {sr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', borderTop: '1px solid #22252A' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Latency</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Lower is snappier; raise it if you hear crackles</span>
                </div>
                <button
                  type="button"
                  className="mono"
                  style={{
                    height: '36px',
                    minWidth: '260px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {bufferOption}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>

              <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', borderTop: '1px solid #22252A' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Processing quality</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Best uses more CPU for cleaner noise removal</span>
                </div>
                <div
                  role="group"
                  aria-label="Processing quality"
                  style={{
                    display: 'flex',
                    gap: '2px',
                    padding: '3px',
                    background: '#111215',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                  }}
                >
                  {['Light on CPU', 'Balanced', 'Best'].map((q) => {
                    const isSel = processingQuality === q;
                    return (
                      <button
                        key={q}
                        type="button"
                        aria-pressed={isSel}
                        onClick={() => setProcessingQuality(q)}
                        style={{
                          height: '30px',
                          padding: '0 12px',
                          border: 0,
                          borderRadius: '6px',
                          background: isSel ? '#2B2E34' : 'transparent',
                          color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: isSel ? 600 : 500,
                        }}
                      >
                        {q}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Appearance */}
            <section
              aria-labelledby="app-h"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 24px 8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
              }}
            >
              <h2 id="app-h" style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Appearance
              </h2>

              <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #22252A' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Theme</span>
                <div
                  role="group"
                  aria-label="Theme"
                  style={{
                    display: 'flex',
                    gap: '2px',
                    padding: '3px',
                    background: '#111215',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                  }}
                >
                  <button
                    type="button"
                    aria-pressed={theme === 'dark'}
                    onClick={() => onThemeChange('dark')}
                    style={{
                      height: '30px',
                      padding: '0 14px',
                      border: 0,
                      borderRadius: '6px',
                      background: theme === 'dark' ? '#2B2E34' : 'transparent',
                      color: theme === 'dark' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: theme === 'dark' ? 600 : 500,
                    }}
                  >
                    Dark
                  </button>
                  <button
                    type="button"
                    aria-pressed={theme === 'light'}
                    onClick={() => onThemeChange('light')}
                    style={{
                      height: '30px',
                      padding: '0 14px',
                      border: 0,
                      borderRadius: '6px',
                      background: theme === 'light' ? '#2B2E34' : 'transparent',
                      color: theme === 'light' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: theme === 'light' ? 600 : 500,
                    }}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    aria-pressed={theme === 'system'}
                    onClick={() => onThemeChange('system')}
                    style={{
                      height: '30px',
                      padding: '0 14px',
                      border: 0,
                      borderRadius: '6px',
                      background: theme === 'system' ? '#2B2E34' : 'transparent',
                      color: theme === 'system' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: theme === 'system' ? 600 : 500,
                    }}
                  >
                    Match Windows
                  </button>
                </div>
              </div>

              <div style={{ minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #22252A', fontSize: '13px', color: 'var(--text-tertiary)' }}>
                <span>Aurel 1.0 · Engine 1.0.0</span>
                <a href="#" style={{ fontSize: '13px' }}>Open-source licenses</a>
              </div>
            </section>
          </div>

          {/* Column 2: Keyboard shortcuts, Private & Offline, AI Studio Mode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Keyboard shortcuts */}
            <section
              aria-labelledby="key-h"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 24px 8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h2 id="key-h" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Keyboard shortcuts
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Work in any app, even full screen</span>
              </div>

              <div style={{ minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #22252A' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Mute my mic</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <kbd className="mono" style={{ minWidth: '28px', height: '28px', padding: '0 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'var(--bg-control)', border: '1px solid var(--border-hover)', borderBottomWidth: '2px', fontSize: '12px', color: 'var(--text-primary)' }}>Ctrl</kbd>
                  <kbd className="mono" style={{ minWidth: '28px', height: '28px', padding: '0 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'var(--bg-control)', border: '1px solid var(--border-hover)', borderBottomWidth: '2px', fontSize: '12px', color: 'var(--text-primary)' }}>Alt</kbd>
                  <kbd className="mono" style={{ minWidth: '28px', height: '28px', padding: '0 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'var(--bg-control)', border: '1px solid var(--border-hover)', borderBottomWidth: '2px', fontSize: '12px', color: 'var(--text-primary)' }}>M</kbd>
                </span>
              </div>

              <div style={{ minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #22252A' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Hear original (hold)</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <kbd className="mono" style={{ minWidth: '28px', height: '28px', padding: '0 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'var(--bg-control)', border: '1px solid var(--border-hover)', borderBottomWidth: '2px', fontSize: '12px', color: 'var(--text-primary)' }}>Ctrl</kbd>
                  <kbd className="mono" style={{ minWidth: '28px', height: '28px', padding: '0 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'var(--bg-control)', border: '1px solid var(--border-hover)', borderBottomWidth: '2px', fontSize: '12px', color: 'var(--text-primary)' }}>Alt</kbd>
                  <kbd className="mono" style={{ minWidth: '28px', height: '28px', padding: '0 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'var(--bg-control)', border: '1px solid var(--border-hover)', borderBottomWidth: '2px', fontSize: '12px', color: 'var(--text-primary)' }}>B</kbd>
                </span>
              </div>

              <div style={{ minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #22252A' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Next profile</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <kbd className="mono" style={{ minWidth: '28px', height: '28px', padding: '0 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'var(--bg-control)', border: '1px solid var(--border-hover)', borderBottomWidth: '2px', fontSize: '12px', color: 'var(--text-primary)' }}>Ctrl</kbd>
                  <kbd className="mono" style={{ minWidth: '28px', height: '28px', padding: '0 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'var(--bg-control)', border: '1px solid var(--border-hover)', borderBottomWidth: '2px', fontSize: '12px', color: 'var(--text-primary)' }}>Alt</kbd>
                  <kbd className="mono" style={{ minWidth: '28px', height: '28px', padding: '0 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: 'var(--bg-control)', border: '1px solid var(--border-hover)', borderBottomWidth: '2px', fontSize: '12px', color: 'var(--text-primary)' }}>P</kbd>
                </span>
              </div>

              <div style={{ minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #22252A' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Push to talk</span>
                <button
                  type="button"
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px dashed #3A3E46',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Set shortcut
                </button>
              </div>
            </section>

            {/* Private & fully offline */}
            <section
              aria-labelledby="priv-h"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: '22px 24px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#16301F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6BE3A4" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3z" />
                    <path d="m9 12 2 2 4-4" strokeLinecap="round" />
                  </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h2 id="priv-h" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Private and fully offline
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Nothing about your voice ever leaves this PC</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                {['No account or sign-in', 'All processing on this PC', 'No recordings kept', 'No usage tracking'].map((text) => (
                  <span key={text} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6BE3A4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                    {text}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #22252A' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Updates</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Aurel never checks online. Install a new version from a file.</span>
                </div>
                <button
                  type="button"
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                  }}
                >
                  Install update from file…
                </button>
              </div>
            </section>

            {/* AI Studio Mode */}
            <section
              aria-labelledby="ai-h"
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'var(--accent-amber-tint)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber-text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
                      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <h2 id="ai-h" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      AI Studio mode
                    </h2>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Rebuilds detail a budget mic can’t capture</span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#16301F',
                    color: '#6BE3A4',
                  }}
                >
                  Runs offline
                </span>
              </div>

              <div style={{ minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', borderTop: '1px solid #22252A' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Use it for</span>
                <div
                  role="group"
                  aria-label="AI Studio mode"
                  style={{
                    display: 'flex',
                    gap: '2px',
                    padding: '3px',
                    background: '#111215',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                  }}
                >
                  {['Off', 'Recordings only', 'Calls too'].map((mode) => {
                    const isSel = aiStudioMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={isSel}
                        onClick={() => setAiStudioMode(mode)}
                        style={{
                          height: '30px',
                          padding: '0 12px',
                          border: 0,
                          borderRadius: '6px',
                          background: isSel ? '#2B2E34' : 'transparent',
                          color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: isSel ? 600 : 500,
                        }}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', borderTop: '1px solid #22252A' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Voice model</span>
                  <span className="mono" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Installed · 48 MB · uses your graphics card
                  </span>
                </div>
                <button
                  type="button"
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-strong)',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                  }}
                >
                  Remove model
                </button>
              </div>

              <span style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                On calls it adds a small delay, so “Recordings only” is best for most people. Your voice is processed on this PC and never uploaded.
              </span>
            </section>
          </div>
        </div>
    </div>
  );
};
