import { describe, expect, it } from 'vitest';
import { estimateShapeCoverage, quietZonePasses, shapeLikelyCutsProtectedPatterns } from '@/lib/qr/engine/safeZones';

describe('safeZones', () => {
  it('validates quiet zone minimum', () => {
    expect(quietZonePasses(4)).toBe(true);
    expect(quietZonePasses(3)).toBe(false);
  });

  it('flags corner-risk shapes', () => {
    expect(shapeLikelyCutsProtectedPatterns('square')).toBe(false);
    expect(shapeLikelyCutsProtectedPatterns('circle')).toBe(true);
    expect(shapeLikelyCutsProtectedPatterns('heart')).toBe(true);
  });

  it('returns expected shape coverage ordering', () => {
    const square = estimateShapeCoverage('square');
    const circle = estimateShapeCoverage('circle');
    const star = estimateShapeCoverage('star');

    expect(square).toBeGreaterThan(circle);
    expect(circle).toBeGreaterThan(star);
  });
});
