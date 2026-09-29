import React from 'react';

interface AurelSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel: string;
  className?: string;
  style?: React.CSSProperties;
}

export const AurelSlider: React.FC<AurelSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  ariaLabel,
  className,
  style,
}) => {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const thumbFactor = pct / 100;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        ...style,
      }}
      className={className}
    >
      {/* Inactive background track */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '4px',
          borderRadius: '2px',
          background: '#666A73',
          pointerEvents: 'none',
        }}
      />

      {/* Active amber track */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: `${pct}%`,
          height: '4px',
          borderRadius: '2px',
          background: 'var(--accent-amber)',
          pointerEvents: 'none',
        }}
      />

      {/* True 18px x 18px circular knob - will never stretch or distort into an oval */}
      <div
        style={{
          position: 'absolute',
          left: `calc(${thumbFactor} * (100% - 18px))`,
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#F3F2EF',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.45)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Transparent native range input for seamless drag, click, and keyboard accessibility */}
      <input
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          margin: 0,
          padding: 0,
          opacity: 0,
          cursor: 'pointer',
          zIndex: 3,
        }}
      />
    </div>
  );
};
