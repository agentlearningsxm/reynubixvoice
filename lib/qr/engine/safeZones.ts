import { QRShape } from './types';

const SHAPE_COVERAGE: Record<QRShape, number> = {
  square: 1,
  circle: 0.785,
  heart: 0.72,
  star: 0.56,
  shield: 0.82,
};

const SHAPES_WITH_CORNER_RISK = new Set<QRShape>(['circle', 'heart', 'star', 'shield']);

export function estimateShapeCoverage(shape: QRShape): number {
  return SHAPE_COVERAGE[shape] ?? 1;
}

export function shapeLikelyCutsProtectedPatterns(shape: QRShape): boolean {
  return SHAPES_WITH_CORNER_RISK.has(shape);
}

export function quietZonePasses(quietZoneModules: number): boolean {
  return quietZoneModules >= 4;
}
