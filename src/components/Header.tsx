import React from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, spacing, radii } from '../stylex/tokens.stylex';
import { Radio, Headphones, Volume2, HelpCircle, Sparkles } from 'lucide-react';

interface HeaderProps {
  isRunning: boolean;
  onTogglePower: () => void;
  listenToSelf: boolean;
  onToggleListenToSelf: () => void;
  monitorVolume: number;
  onMonitorVolumeChange: (vol: number) => void;
  onOpenGuide: () => void;
  activePresetName: string;
}

const styles = stylex.create({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    backgroundColor: 'rgba(18, 20, 28, 0.75)',
    backdropFilter: 'blur(16px)',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.borderSubtle,
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  leftCol: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoBadge: {
    width: '36px',
    height: '36px',
    borderRadius: radii.md,
    background: 'linear-gradient(135deg, #4f46e5 0%, #38bdf8 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(79, 70, 229, 0.35)',
    color: '#ffffff',
  },
  brandGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  brandTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: '-0.02em',
    display: 'flex',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tagPill: {
    fontSize: '10px',
    fontWeight: '600',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#a5b4fc',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: radii.full,
    paddingTop: '1px',
    paddingBottom: '1px',
    paddingLeft: '6px',
    paddingRight: '6px',
  },
  subInfo: {
    fontSize: '11px',
    color: colors.textMuted,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  centerCol: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  onAirBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingTop: '8px',
    paddingBottom: '8px',
    paddingLeft: '18px',
    paddingRight: '18px',
    borderRadius: radii.full,
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.02em',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    borderWidth: 1,
    borderStyle: 'solid',
  },
  onAirActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    color: '#34d399',
    boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
  },
  onAirInactive: {
    backgroundColor: colors.bgSurfaceElevated,
    borderColor: colors.borderMedium,
    color: colors.textSecondary,
  },
  pulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: radii.full,
  },
  pulseLive: {
    backgroundColor: '#10b981',
    boxShadow: '0 0 10px #10b981',
  },
  pulseStandby: {
    backgroundColor: '#64748b',
  },
  monitorPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: colors.bgSurfaceElevated,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.full,
    paddingTop: '4px',
    paddingBottom: '4px',
    paddingLeft: '12px',
    paddingRight: '12px',
  },
  monitorBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: '600',
    transition: 'color 0.15s ease',
  },
  monitorActive: {
    color: colors.accentAmber,
  },
  monitorInactive: {
    color: colors.textMuted,
  },
  monitorSlider: {
    width: '64px',
    height: '4px',
    accentColor: '#f59e0b',
  },
  rightCol: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  },
  guidePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: colors.bgSurfaceElevated,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.full,
    color: colors.textSecondary,
    fontSize: '12px',
    fontWeight: '500',
    paddingTop: '7px',
    paddingBottom: '7px',
    paddingLeft: '14px',
    paddingRight: '14px',
    transition: 'all 0.15s ease',
  },
});

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  onTogglePower,
  listenToSelf,
  onToggleListenToSelf,
  monitorVolume,
  onMonitorVolumeChange,
  onOpenGuide,
  activePresetName,
}) => {
  return (
    <header {...stylex.props(styles.header)}>
      {/* Brand & Active State */}
      <div {...stylex.props(styles.leftCol)}>
        <div {...stylex.props(styles.logoBadge)}>
          <Radio size={18} />
        </div>
        <div {...stylex.props(styles.brandGroup)}>
          <div {...stylex.props(styles.brandTitle)}>
            AuraMic <span {...stylex.props(styles.tagPill)}>STUDIO</span>
          </div>
          <div {...stylex.props(styles.subInfo)}>
            <span>{activePresetName}</span>
            <span>•</span>
            <span>48 kHz</span>
            <span>•</span>
            <span style={{ color: '#10b981' }}>5ms Latency</span>
          </div>
        </div>
      </div>

      {/* Center: Tactile Master Switch & Monitor Control */}
      <div {...stylex.props(styles.centerCol)}>
        <button
          onClick={onTogglePower}
          {...stylex.props(styles.onAirBtn, isRunning ? styles.onAirActive : styles.onAirInactive)}
        >
          <div {...stylex.props(styles.pulseDot, isRunning ? styles.pulseLive : styles.pulseStandby)} />
          <span>{isRunning ? 'ON AIR' : 'START BROADCAST'}</span>
        </button>

        <div {...stylex.props(styles.monitorPill)} title="Hear your broadcast voice directly in your headphones">
          <button
            onClick={onToggleListenToSelf}
            {...stylex.props(styles.monitorBtn, listenToSelf ? styles.monitorActive : styles.monitorInactive)}
          >
            <Headphones size={13} />
            <span>Hear Self</span>
          </button>
          <Volume2 size={12} color={listenToSelf ? '#f59e0b' : '#64748b'} />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={monitorVolume}
            onChange={(e) => onMonitorVolumeChange(parseFloat(e.target.value))}
            {...stylex.props(styles.monitorSlider)}
          />
        </div>
      </div>

      {/* Right: Setup Guide Button */}
      <div {...stylex.props(styles.rightCol)}>
        <button onClick={onOpenGuide} {...stylex.props(styles.guidePill)}>
          <HelpCircle size={14} color="#6366f1" />
          <span>Zoom / Discord Routing</span>
        </button>
      </div>
    </header>
  );
};
