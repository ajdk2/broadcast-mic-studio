import React from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, spacing, radii } from '../stylex/tokens.stylex';
import { X, ExternalLink, Check, Volume2, Shield } from 'lucide-react';

interface VirtualCableGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const styles = stylex.create({
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: spacing.md,
  },
  modal: {
    backgroundColor: '#12141c',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderMedium,
    borderRadius: radii.xl,
    maxWidth: '620px',
    width: '100%',
    maxHeight: '88vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '16px',
    paddingBottom: '16px',
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.borderSubtle,
  },
  title: {
    fontSize: '15px',
    fontWeight: '700',
    color: colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  closeBtn: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: colors.textMuted,
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: radii.sm,
    transition: 'color 0.15s ease',
  },
  body: {
    padding: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
    fontSize: '13px',
    color: colors.textSecondary,
    lineHeight: '1.6',
  },
  stepCard: {
    backgroundColor: colors.bgSurfaceElevated,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  stepTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tag: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: '#38bdf8',
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderRadius: radii.xs,
    fontSize: '12px',
  },
  proTip: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: radii.md,
    padding: spacing.md,
    color: '#f8fafc',
    fontSize: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
});

export const VirtualCableGuide: React.FC<VirtualCableGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div {...stylex.props(styles.overlay)} onClick={onClose}>
      <div {...stylex.props(styles.modal)} onClick={(e) => e.stopPropagation()}>
        <div {...stylex.props(styles.header)}>
          <span {...stylex.props(styles.title)}>
            <Volume2 size={18} color="#6366f1" />
            Connect to Zoom, Discord, Teams & OBS
          </span>
          <button onClick={onClose} {...stylex.props(styles.closeBtn)}>
            <X size={18} />
          </button>
        </div>

        <div {...stylex.props(styles.body)}>
          <p>
            Because Windows requires an audio driver to create a microphone input for other apps,
            AuraMic routes its enhanced broadcast voice through an invisible virtual audio bridge.
          </p>

          <div {...stylex.props(styles.stepCard)}>
            <div {...stylex.props(styles.stepTitle)}>
              <Check size={14} color="#10b981" />
              1. Install Virtual Audio Cable (Free & Offline)
            </div>
            <p>
              Download and install the free virtual audio cable from{' '}
              <a
                href="https://vb-audio.com/Cable/"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#38bdf8', textDecoration: 'underline' }}
              >
                vb-audio.com/Cable <ExternalLink size={12} style={{ display: 'inline' }} />
              </a>. Once installed, Windows adds a virtual audio input and output.
            </p>
          </div>

          <div {...stylex.props(styles.stepCard)}>
            <div {...stylex.props(styles.stepTitle)}>
              <Check size={14} color="#10b981" />
              2. Select Routing in AuraMic
            </div>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>
                <strong>Microphone Input:</strong> Select <span {...stylex.props(styles.tag)}>Maono PD100</span>.
              </li>
              <li>
                <strong>Broadcast Route:</strong> Select <span {...stylex.props(styles.tag)}>CABLE Input (VB-Audio)</span>.
              </li>
            </ul>
          </div>

          <div {...stylex.props(styles.stepCard)}>
            <div {...stylex.props(styles.stepTitle)}>
              <Check size={14} color="#10b981" />
              3. Set Meeting Microphone to CABLE Output
            </div>
            <p>
              In Zoom, Google Meet, Microsoft Teams, or Discord:
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              <li>
                Set <strong>Microphone (Input Device)</strong> to: <span {...stylex.props(styles.tag)}>CABLE Output (VB-Audio)</span>.
              </li>
              <li>
                Keep your <strong>Speakers / Headphones</strong> set to your normal headphones.
              </li>
            </ul>
          </div>

          <div {...stylex.props(styles.proTip)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: '700' }}>
              <Shield size={14} /> Pro Tip for Maximum Clarity
            </div>
            <p>
              Inside Discord or Zoom audio settings, turn off or lower built-in "Automatic Gain Control" and "Echo Cancellation", since AuraMic already performs clean studio leveling and noise gating at 48kHz!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
