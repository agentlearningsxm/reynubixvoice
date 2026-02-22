export type QRShape = 'square' | 'circle' | 'heart' | 'star' | 'shield';
export type QRDotsType = 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
export type QRCornerSquareType = 'dot' | 'square' | 'extra-rounded';
export type QRRenderMode = 'safe' | 'art';

export interface QRLogo
{
  enabled: boolean;
  imageDataUrl: string | null;
  sizeRatio: number;
  margin: number;
}

export interface QRMask
{
  enabled: boolean;
  svgPath: string | null;
  name: string | null;
}

export interface QRScanGuardState
{
  enabled: boolean;
  score: number;
  pass: boolean;
  warnings: string[];
}

export interface QRGradient
{
  enabled: boolean;
  type: 'linear' | 'radial';
  colorStops: { offset: number; color: string }[];
}

export interface QRStyleEngineInput
{
  shape: QRShape;
  renderMode: QRRenderMode;
  dotsType: QRDotsType;
  dotsColor: string;
  backgroundColor: string;
  cornerSquareType: QRCornerSquareType;
  cornerSquareColor: string;
  quietZone: number;
  gradient?: QRGradient;
  logo: QRLogo;
  mask: QRMask;
}
