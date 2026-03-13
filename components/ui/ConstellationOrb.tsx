// components/ui/ConstellationOrb.tsx
import type React from 'react';

export type OrbState =
  | 'idle'
  | 'connecting'
  | 'agent_speaking'
  | 'user_speaking'
  | 'error';

interface ConstellationOrbProps {
  state: OrbState;
  size?: number;
}

// Ring config: [dotCount, radiusFraction, baseDurationSeconds, direction]
const RINGS: [number, number, number, 1 | -1][] = [
  [6,  0.28, 8,  1],
  [10, 0.44, 14, -1],
  [14, 0.60, 20, 1],
];

const STATE_COLORS: Record<OrbState, { dot: string; glow: string; speed: number }> = {
  idle:           { dot: '#4fa8ff', glow: 'rgba(79,168,255,0.18)',  speed: 1   },
  connecting:     { dot: '#f59e0b', glow: 'rgba(245,158,11,0.22)',  speed: 2.2 },
  agent_speaking: { dot: '#4ade80', glow: 'rgba(74,222,128,0.28)',  speed: 3.5 },
  user_speaking:  { dot: '#38bdf8', glow: 'rgba(56,189,248,0.28)',  speed: 2.8 },
  error:          { dot: '#f87171', glow: 'rgba(248,113,113,0.22)', speed: 1   },
};

// Keyframes declared once — not inside any render loop
const KEYFRAMES_CSS = RINGS.map(([, , , dir], i) => {
  const name = `orbRing${i}${dir > 0 ? 'CW' : 'CCW'}`;
  return `@keyframes ${name} {
    from { transform: rotate(${dir > 0 ? '0deg' : '360deg'}); }
    to   { transform: rotate(${dir > 0 ? '360deg' : '0deg'}); }
  }`;
}).join('\n');

const ConstellationOrb: React.FC<ConstellationOrbProps> = ({ state, size = 160 }) => {
  const { dot: dotColor, glow, speed } = STATE_COLORS[state];
  const center = size / 2;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        transition: 'width 0.5s ease, height 0.5s ease',
      }}
      aria-hidden="true"
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-700"
        style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)` }}
      />

      {/* SVG rings */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          position: 'absolute',
          inset: 0,
          transition: 'width 0.5s ease, height 0.5s ease',
        }}
      >
        <style>{KEYFRAMES_CSS}</style>

        {RINGS.map(([count, radiusFraction, baseDuration, dir], ringIndex) => {
          const radius = center * radiusFraction;
          const duration = (baseDuration / speed).toFixed(2);
          const animName = `orbRing${ringIndex}${dir > 0 ? 'CW' : 'CCW'}`;

          return (
            <g
              key={`ring-${ringIndex}`}
              style={{
                transformOrigin: `${center}px ${center}px`,
                animation: `${animName} ${duration}s linear infinite`,
              }}
            >
              {Array.from({ length: count }).map((_, i) => {
                const angle = (i / count) * Math.PI * 2;
                const x = center + Math.cos(angle) * radius;
                const y = center + Math.sin(angle) * radius;
                const dotR = ringIndex === 0 ? 2.2 : ringIndex === 1 ? 1.8 : 1.4;
                const opacity = 0.55 + (i % 3) * 0.15;
                return (
                  <circle
                    key={`dot-${ringIndex}-${i}`}
                    cx={x}
                    cy={y}
                    r={dotR}
                    fill={dotColor}
                    opacity={opacity}
                    style={{ transition: 'fill 0.6s ease, opacity 0.6s ease' }}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Center core */}
      <div
        className="relative rounded-full transition-all duration-700"
        style={{
          width: size * 0.14,
          height: size * 0.14,
          background: dotColor,
          boxShadow: `0 0 ${size * 0.1}px ${dotColor}`,
          opacity: state === 'idle' ? 0.7 : 1,
        }}
      />
    </div>
  );
};

export default ConstellationOrb;
