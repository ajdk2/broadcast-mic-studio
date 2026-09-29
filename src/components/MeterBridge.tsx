import React from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, spacing, radii } from '../stylex/tokens.stylex';
import { MeterData } from '../types';

interface MeterBridgeProps {
  meters: MeterData;
  isRunning: boolean;
}

const styles = stylex.create({
  container: {
    display: 'grid',
    gridTemplateColumns: '2fr auto 1.5fr 2fr',
    alignItems: 'center',
    gap: spacing.lg,
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
  meterChannel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  dbValue: {
    fontFamily: 'monospace',
    fontSize: '12px',
    fontWeight: '700',
    color: colors.textPrimary,
  },
  track: {
    width: '100%',
    height: '8px',
    backgroundColor: '#0e111a',
    borderRadius: radii.full,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  bar: {
    height: '100%',
    borderRadius: radii.full,
    transition: 'width 0.05s cubic-bezier(0.1, 0.9, 0.2, 1)',
  },
  gateStatusCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    borderLeftWidth: 1,
    borderLeftStyle: 'solid',
    borderLeftColor: colors.borderSubtle,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: colors.borderSubtle,
  },
  gateLabel: {
    fontSize: '10px',
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  gatePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '3px',
    paddingBottom: '3px',
    paddingLeft: '10px',
    paddingRight: '10px',
    borderRadius: radii.full,
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.04em',
    transition: 'all 0.15s ease',
  },
  gateOpen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  gateClosed: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    color: '#fbbf24',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: radii.full,
  },
});

function dbToPercent(db: number): number {
  if (db <= -60) return 0;
  if (db >= 0) return 100;
  return ((db + 60) / 60) * 100;
}

export const MeterBridge: React.FC<MeterBridgeProps> = ({ meters, isRunning }) => {
  const inPct = isRunning ? dbToPercent(meters.inputPeakDb) : 0;
  const outPct = isRunning ? dbToPercent(meters.outputPeakDb) : 0;
  const grPct = isRunning ? Math.min(100, (meters.gainReductionDb / 16) * 100) : 0;

  return (
    <div {...stylex.props(styles.container)}>
      {/* 1. Raw Mic Input Meter */}
      <div {...stylex.props(styles.meterChannel)}>
        <div {...stylex.props(styles.labelRow)}>
          <span>Mic Input (Raw)</span>
          <span {...stylex.props(styles.dbValue)}>
            {isRunning ? `${meters.inputPeakDb.toFixed(1)} dB` : '-INF'}
          </span>
        </div>
        <div {...stylex.props(styles.track)}>
          <div
            {...stylex.props(styles.bar)}
            style={{
              width: `${inPct}%`,
              background: 'linear-gradient(90deg, #4f46e5 0%, #38bdf8 80%, #f43f5e 100%)',
            }}
          />
        </div>
      </div>

      {/* 2. Noise Gate Expander Status */}
      <div {...stylex.props(styles.gateStatusCol)}>
        <span {...stylex.props(styles.gateLabel)}>Noise Gate</span>
        <div
          {...stylex.props(
            styles.gatePill,
            meters.gateOpen || !isRunning ? styles.gateOpen : styles.gateClosed
          )}
        >
          <div
            {...stylex.props(styles.dot)}
            style={{ backgroundColor: meters.gateOpen || !isRunning ? '#10b981' : '#f59e0b' }}
          />
          <span>{meters.gateOpen ? 'OPEN' : 'MUTING HISS'}</span>
        </div>
      </div>

      {/* 3. Leveler Compression (Gain Reduction) */}
      <div {...stylex.props(styles.meterChannel)}>
        <div {...stylex.props(styles.labelRow)}>
          <span>Voice Leveler (GR)</span>
          <span {...stylex.props(styles.dbValue)} style={{ color: '#f59e0b' }}>
            {isRunning && meters.gainReductionDb > 0.1 ? `-${meters.gainReductionDb.toFixed(1)} dB` : '0.0 dB'}
          </span>
        </div>
        <div {...stylex.props(styles.track)}>
          <div
            {...stylex.props(styles.bar)}
            style={{
              width: `${grPct}%`,
              background: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)',
            }}
          />
        </div>
      </div>

      {/* 4. Broadcast Output Meter */}
      <div {...stylex.props(styles.meterChannel)}>
        <div {...stylex.props(styles.labelRow)}>
          <span>Broadcast Target Level</span>
          <span
            {...stylex.props(styles.dbValue)}
            style={{ color: meters.outputPeakDb > -1 ? '#f43f5e' : '#34d399' }}
          >
            {isRunning ? `${meters.outputPeakDb.toFixed(1)} dB` : '-INF'}
          </span>
        </div>
        <div {...stylex.props(styles.track)}>
          <div
            {...stylex.props(styles.bar)}
            style={{
              width: `${outPct}%`,
              background: 'linear-gradient(90deg, #10b981 0%, #34d399 75%, #f59e0b 90%, #f43f5e 100%)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
