import { QRStyleEngineInput } from './types';

export interface ValidationIssue
{
  code: string;
  severity: 'warning' | 'error';
  message: string;
}

export interface ValidationResult
{
  score: number;
  pass: boolean;
  issues: ValidationIssue[];
}

function getLuminance(hex: string): number
{
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3)
  {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length !== 6) return 0;

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const [R, G, B] = [r, g, b].map(c =>
  {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function validateQrStyle(style: QRStyleEngineInput): ValidationResult
{
  let score = 100;
  const issues: ValidationIssue[] = [];

  if (style.quietZone < 2)
  {
    score -= 20;
    issues.push({ code: 'small-quiet-zone', severity: 'warning', message: 'Quiet zone is very small, scanning might be difficult.' });
  }

  const bgStr = style.backgroundColor === 'transparent' ? '#ffffff' : style.backgroundColor;
  const fgStr = style.dotsColor;

  if (bgStr && fgStr)
  {
    const bgLum = getLuminance(bgStr);
    const fgLum = getLuminance(fgStr);

    const maxLum = Math.max(bgLum, fgLum);
    const minLum = Math.min(bgLum, fgLum);
    const contrastRatio = (maxLum + 0.05) / (minLum + 0.05);

    if (contrastRatio < 1.5)
    {
      score -= 40;
      issues.push({ code: 'low-contrast', severity: 'error', message: 'Low contrast between foreground and background. Scanning will fail.' });
    } else if (contrastRatio < 3)
    {
      score -= 20;
      issues.push({ code: 'low-contrast', severity: 'warning', message: 'Contrast ratio is low, some phones may fail to scan.' });
    }
  }

  if (style.renderMode === 'safe' && style.shape !== 'square')
  {
    score -= 100;
    issues.push({ code: 'safe-mode-protected-risk', severity: 'error', message: 'Safe mode requires a square shape.' });
  }

  if (style.renderMode === 'art')
  {
    score -= 10;
    issues.push({ code: 'art-mode-risk', severity: 'warning', message: 'Art mode uses custom clipping which may impact scannability.' });

    if (style.mask.enabled)
    {
      score -= 10;
      issues.push({ code: 'custom-mask-risk', severity: 'warning', message: 'Custom masks can hide important timing/alignment patterns. Test thoroughly.' });
    }
  }

  if (style.logo.enabled)
  {
    if (style.logo.sizeRatio > 0.4)
    {
      score -= 30;
      issues.push({ code: 'large-logo', severity: 'error', message: 'Logo is too large and may obscure too many QR data modules.' });
    } else if (style.logo.sizeRatio > 0.25)
    {
      score -= 10;
      issues.push({ code: 'large-logo', severity: 'warning', message: 'Large logo might require higher error correction.' });
    }
  }

  return {
    score: Math.max(0, score),
    pass: score >= 50 && !issues.some(i => i.severity === 'error'),
    issues,
  };
}
