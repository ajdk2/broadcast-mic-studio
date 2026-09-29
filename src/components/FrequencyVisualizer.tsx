import React, { useRef, useEffect } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, radii, spacing } from '../stylex/tokens.stylex';
import { dspEngine } from '../audio/dspEngine';
import { Activity } from 'lucide-react';

interface FrequencyVisualizerProps {
  isRunning: boolean;
}

const styles = stylex.create({
  container: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    paddingTop: '12px',
    paddingBottom: '12px',
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    height: '135px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '11px',
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  badge: {
    fontSize: '10px',
    fontWeight: '500',
    color: colors.textMuted,
    backgroundColor: colors.bgSurfaceElevated,
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderRadius: radii.xs,
  },
  canvas: {
    width: '100%',
    height: '80px',
    display: 'block',
    borderRadius: radii.sm,
  },
  axisLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '10px',
    fontWeight: '500',
    color: colors.textMuted,
    paddingLeft: '4px',
    paddingRight: '4px',
  },
});

export const FrequencyVisualizer: React.FC<FrequencyVisualizerProps> = ({ isRunning }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const dataArray = new Uint8Array(256);

    const render = () => {
      animationId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.33);
      ctx.lineTo(width, height * 0.33);
      ctx.moveTo(0, height * 0.66);
      ctx.lineTo(width, height * 0.66);
      ctx.stroke();

      if (!isRunning) {
        // Idle soft baseline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height - 4);
        ctx.lineTo(width, height - 4);
        ctx.stroke();
        return;
      }

      dspEngine.getFrequencyData(dataArray);

      // Smooth curve with filled gradient
      const barCount = 72;
      const barWidth = width / barCount;

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0.0, '#6366f1'); // Low end warmth
      gradient.addColorStop(0.4, '#38bdf8'); // Vocal clarity
      gradient.addColorStop(0.8, '#10b981'); // Presence
      gradient.addColorStop(1.0, '#f59e0b'); // Top sheen

      ctx.fillStyle = gradient;

      let x = 0;
      for (let i = 0; i < barCount; i++) {
        const binIndex = Math.floor(Math.pow(i / barCount, 2.1) * (dataArray.length - 1));
        const val = dataArray[binIndex] || 0;
        const barHeight = Math.max(3, (val / 255) * (height - 8));

        // Soft rounded pill bars
        ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isRunning]);

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.headerRow)}>
        <span {...stylex.props(styles.title)}>
          <Activity size={13} color="#6366f1" /> Live Acoustic Frequency Response
        </span>
        <span {...stylex.props(styles.badge)}>60 FPS • FFT 1024</span>
      </div>
      <canvas ref={canvasRef} width={850} height={100} {...stylex.props(styles.canvas)} />
      <div {...stylex.props(styles.axisLabels)}>
        <span>60 Hz (Sub Rumble)</span>
        <span>160 Hz (Warmth)</span>
        <span>360 Hz (Body)</span>
        <span>1.5 kHz (Clarity)</span>
        <span>4.5 kHz (Presence)</span>
        <span>12 kHz (Air Sheen)</span>
      </div>
    </div>
  );
};
