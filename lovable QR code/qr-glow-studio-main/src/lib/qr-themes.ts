export interface QRTheme {
  name: string;
  id: string;
  colors: string[];
  dotColor: string;
  eyeColor: string;
  bgColor: string;
  cardBg: string;
  cardText: string;
  cardAccent: string;
  category: 'rasta' | 'professional' | 'creative';
}

export const QR_THEMES: QRTheme[] = [
  // Rasta
  {
    name: 'Rastafari',
    id: 'rasta',
    colors: ['#008000', '#FFD700', '#FF0000'],
    dotColor: '#008000',
    eyeColor: '#FF0000',
    bgColor: '#0a0a0f',
    cardBg: 'linear-gradient(145deg, #0d1a0d, #1a0d0d)',
    cardText: '#f0e6d0',
    cardAccent: '#FFD700',
    category: 'rasta',
  },
  {
    name: 'Rasta Gold',
    id: 'rasta-gold',
    colors: ['#FFD700', '#FF8C00', '#008000'],
    dotColor: '#FFD700',
    eyeColor: '#008000',
    bgColor: '#0f0a00',
    cardBg: 'linear-gradient(145deg, #1a1500, #0d1a0d)',
    cardText: '#fff8e0',
    cardAccent: '#FFD700',
    category: 'rasta',
  },
  // Professional
  {
    name: 'Corporate Navy',
    id: 'navy',
    colors: ['#1a2744', '#3a5a8c'],
    dotColor: '#1a2744',
    eyeColor: '#3a5a8c',
    bgColor: '#ffffff',
    cardBg: 'linear-gradient(145deg, #1a2744, #2d4a6f)',
    cardText: '#e8edf4',
    cardAccent: '#6b9fd4',
    category: 'professional',
  },
  {
    name: 'Executive Black',
    id: 'exec-black',
    colors: ['#1a1a1a', '#4a4a4a'],
    dotColor: '#1a1a1a',
    eyeColor: '#4a4a4a',
    bgColor: '#ffffff',
    cardBg: 'linear-gradient(145deg, #111111, #2a2a2a)',
    cardText: '#e0e0e0',
    cardAccent: '#888888',
    category: 'professional',
  },
  {
    name: 'Business Blue',
    id: 'business',
    colors: ['#0a1628', '#00bcd4'],
    dotColor: '#00bcd4',
    eyeColor: '#0a1628',
    bgColor: '#ffffff',
    cardBg: 'linear-gradient(145deg, #0a1628, #0d2137)',
    cardText: '#d0eaf4',
    cardAccent: '#00bcd4',
    category: 'professional',
  },
  {
    name: 'Clean White',
    id: 'clean-white',
    colors: ['#333333', '#666666'],
    dotColor: '#333333',
    eyeColor: '#666666',
    bgColor: '#ffffff',
    cardBg: 'linear-gradient(145deg, #f8f8f8, #e8e8e8)',
    cardText: '#222222',
    cardAccent: '#555555',
    category: 'professional',
  },
  {
    name: 'Slate Pro',
    id: 'slate',
    colors: ['#334155', '#64748b'],
    dotColor: '#334155',
    eyeColor: '#64748b',
    bgColor: '#f1f5f9',
    cardBg: 'linear-gradient(145deg, #1e293b, #334155)',
    cardText: '#e2e8f0',
    cardAccent: '#94a3b8',
    category: 'professional',
  },
  // Creative
  {
    name: 'Neon Green',
    id: 'neon',
    colors: ['#00ff41', '#39ff14'],
    dotColor: '#00ff41',
    eyeColor: '#39ff14',
    bgColor: '#0a0a0f',
    cardBg: 'linear-gradient(145deg, #020d04, #0a0a0f)',
    cardText: '#c0ffc8',
    cardAccent: '#00ff41',
    category: 'creative',
  },
  {
    name: 'Gold Luxury',
    id: 'gold',
    colors: ['#FFD700', '#B8860B'],
    dotColor: '#FFD700',
    eyeColor: '#B8860B',
    bgColor: '#1a1a2e',
    cardBg: 'linear-gradient(145deg, #1a1a2e, #16213e)',
    cardText: '#fff8dc',
    cardAccent: '#FFD700',
    category: 'creative',
  },
  {
    name: 'Royal Purple',
    id: 'purple',
    colors: ['#6b21a8', '#a855f7'],
    dotColor: '#6b21a8',
    eyeColor: '#a855f7',
    bgColor: '#0f0520',
    cardBg: 'linear-gradient(145deg, #1a0a2e, #2d1050)',
    cardText: '#e8d5f5',
    cardAccent: '#a855f7',
    category: 'creative',
  },
];

export type DotStyle = 'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy' | 'classy-rounded';
export type EyeStyle = 'square' | 'dot' | 'extra-rounded';
export type LogoShape = 'original' | 'round' | 'oval';

export const DOT_STYLES: { label: string; value: DotStyle }[] = [
  { label: 'Squares', value: 'square' },
  { label: 'Dots', value: 'dots' },
  { label: 'Rounded', value: 'rounded' },
  { label: 'Extra Round', value: 'extra-rounded' },
  { label: 'Classy', value: 'classy' },
  { label: 'Classy Round', value: 'classy-rounded' },
];

export const EYE_STYLES: { label: string; value: EyeStyle }[] = [
  { label: 'Square', value: 'square' },
  { label: 'Circle', value: 'dot' },
  { label: 'Rounded', value: 'extra-rounded' },
];

export const LOGO_SHAPES: { label: string; value: LogoShape }[] = [
  { label: 'Original', value: 'original' },
  { label: 'Round', value: 'round' },
  { label: 'Oval', value: 'oval' },
];

export const EXPORT_SIZES = [
  { label: 'Phone (1080×1920)', width: 1080, height: 1920 },
  { label: 'Social Media (1080×1080)', width: 1080, height: 1080 },
  { label: 'Business Card (1050×600)', width: 1050, height: 600 },
  { label: 'Poster (3000×3000)', width: 3000, height: 3000 },
];
