import React from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, spacing, radii } from '../stylex/tokens.stylex';
import { Mic, ArrowRight, Share2, Headphones, RotateCw } from 'lucide-react';
import { AudioDeviceOption } from '../types';

interface DeviceSelectorProps {
  inputDevices: AudioDeviceOption[];
  outputDevices: AudioDeviceOption[];
  selectedInputId: string;
  selectedOutputId: string;
  selectedMonitorId: string;
  onSelectInput: (id: string) => void;
  onSelectOutput: (id: string) => void;
  onSelectMonitor: (id: string) => void;
  onRefreshDevices: () => void;
}

const styles = stylex.create({
  container: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr 1fr auto',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    paddingTop: '14px',
    paddingBottom: '14px',
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
  },
  channelCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 0,
  },
  channelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  selectBox: {
    backgroundColor: colors.bgSurfaceElevated,
    color: colors.textPrimary,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.sm,
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '12px',
    paddingRight: '28px',
    fontSize: '13px',
    fontWeight: '500',
    width: '100%',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  arrowCol: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.textMuted,
    paddingTop: '18px',
  },
  refreshBtn: {
    backgroundColor: colors.bgSurfaceElevated,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.sm,
    color: colors.textSecondary,
    width: '34px',
    height: '34px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '18px',
    transition: 'all 0.15s ease',
  },
});

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  inputDevices,
  outputDevices,
  selectedInputId,
  selectedOutputId,
  selectedMonitorId,
  onSelectInput,
  onSelectOutput,
  onSelectMonitor,
  onRefreshDevices,
}) => {
  return (
    <div {...stylex.props(styles.container)}>
      {/* 1. Microphone Source */}
      <div {...stylex.props(styles.channelCard)}>
        <div {...stylex.props(styles.channelHeader)}>
          <Mic size={13} color="#38bdf8" />
          <span>Microphone Input (Maono / USB)</span>
        </div>
        <select
          value={selectedInputId}
          onChange={(e) => onSelectInput(e.target.value)}
          {...stylex.props(styles.selectBox)}
        >
          {inputDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Microphone (${d.deviceId.slice(0, 6)}...)`}
            </option>
          ))}
        </select>
      </div>

      <div {...stylex.props(styles.arrowCol)}>
        <ArrowRight size={16} />
      </div>

      {/* 2. Broadcast Route (Virtual Cable) */}
      <div {...stylex.props(styles.channelCard)}>
        <div {...stylex.props(styles.channelHeader)}>
          <Share2 size={13} color="#10b981" />
          <span>Broadcast Route (Send To Virtual Cable)</span>
        </div>
        <select
          value={selectedOutputId}
          onChange={(e) => onSelectOutput(e.target.value)}
          {...stylex.props(styles.selectBox)}
        >
          {outputDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label.toLowerCase().includes('cable') ? `✨ ${d.label} (Recommended)` : d.label || `Audio Output (${d.deviceId.slice(0, 6)}...)`}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Headphone Monitor */}
      <div {...stylex.props(styles.channelCard)}>
        <div {...stylex.props(styles.channelHeader)}>
          <Headphones size={13} color="#f59e0b" />
          <span>Self-Monitoring Device (Headphones)</span>
        </div>
        <select
          value={selectedMonitorId}
          onChange={(e) => onSelectMonitor(e.target.value)}
          {...stylex.props(styles.selectBox)}
        >
          {outputDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Playback Device (${d.deviceId.slice(0, 6)}...)`}
            </option>
          ))}
        </select>
      </div>

      {/* Refresh Hardware Devices */}
      <button
        onClick={onRefreshDevices}
        {...stylex.props(styles.refreshBtn)}
        title="Refresh Audio Hardware Devices"
      >
        <RotateCw size={14} />
      </button>
    </div>
  );
};
