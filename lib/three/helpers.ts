// Helper function to detect if light mode is active
export const isLightMode = (): boolean => {
  return document.documentElement.classList.contains('light');
};

// Helper function to get the current accent color
export const getAccentColor = (): {
  primary: string;
  secondary: string;
  glow: string;
} => {
  const accent = document.documentElement.getAttribute('data-accent') || 'blue';

  switch (accent) {
    case 'green':
      return {
        primary: '#22C55E',
        secondary: '#4ADE80',
        glow: 'rgba(34, 197, 94, 0.4)',
      };
    case 'orange':
      return {
        primary: '#F97316',
        secondary: '#FB923C',
        glow: 'rgba(249, 115, 22, 0.4)',
      };
    default:
      return {
        primary: '#3B82F6',
        secondary: '#60A5FA',
        glow: 'rgba(59, 130, 246, 0.4)',
      };
  }
};

// Shared hex-to-RGB parser (used by ParticleSystem + ParticleScanner)
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 59, g: 130, b: 246 };
};

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  originalAlpha: number;
  life: number;
  time: number;
  startX: number;
  twinkleSpeed: number;
  twinkleAmount: number;
}
