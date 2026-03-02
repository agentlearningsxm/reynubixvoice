// Helper function to detect if light mode is active
export const isLightMode = (): boolean =>
{
  return document.documentElement.classList.contains('light');
};

// Helper function to get the current accent color
export const getAccentColor = (): { primary: string; secondary: string; glow: string } =>
{
  const accent = document.documentElement.getAttribute('data-accent') || 'blue';

  switch (accent)
  {
    case 'green':
      return {
        primary: '#22C55E',
        secondary: '#4ADE80',
        glow: 'rgba(34, 197, 94, 0.4)'
      };
    case 'orange':
      return {
        primary: '#F97316',
        secondary: '#FB923C',
        glow: 'rgba(249, 115, 22, 0.4)'
      };
    case 'blue':
    default:
      return {
        primary: '#3B82F6',
        secondary: '#60A5FA',
        glow: 'rgba(59, 130, 246, 0.4)'
      };
  }
};

export interface Particle
{
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
