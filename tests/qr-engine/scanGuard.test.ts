import { describe, expect, it } from 'vitest';
import { validateQrStyle } from '@/lib/qr/engine/scanGuard';
import { QRStyleEngineInput } from '@/lib/qr/engine/types';

function baseStyle(): QRStyleEngineInput {
  return {
    shape: 'square',
    renderMode: 'safe',
    dotsType: 'rounded',
    dotsColor: '#111111',
    backgroundColor: '#ffffff',
    cornerSquareType: 'extra-rounded',
    cornerSquareColor: '#111111',
    quietZone: 4,
    gradient: {
      enabled: false,
      type: 'linear',
      colorStops: [],
    },
    logo: {
      enabled: false,
      imageDataUrl: null,
      sizeRatio: 0.2,
      margin: 8,
    },
    mask: {
      enabled: false,
      svgPath: null,
      name: null,
    },
  };
}

describe('scanGuard', () => {
  it('passes for conservative safe style', () => {
    const result = validateQrStyle(baseStyle());
    expect(result.pass).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('blocks risky clipping in safe mode', () => {
    const style = baseStyle();
    style.shape = 'circle';
    const result = validateQrStyle(style);

    expect(result.pass).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'safe-mode-protected-risk')).toBe(true);
  });

  it('blocks very low contrast combinations', () => {
    const style = baseStyle();
    style.dotsColor = '#666666';
    style.backgroundColor = '#777777';

    const result = validateQrStyle(style);

    expect(result.pass).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'low-contrast')).toBe(true);
  });

  it('warns but allows art mode', () => {
    const style = baseStyle();
    style.renderMode = 'art';
    style.shape = 'star';

    const result = validateQrStyle(style);

    expect(result.pass).toBe(true);
    expect(result.issues.some((issue) => issue.code === 'art-mode-risk')).toBe(true);
  });
});
