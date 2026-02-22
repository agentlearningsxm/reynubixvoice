import { QRShape, QRRenderMode } from './types';
import qrcode from 'qrcode-generator';

export function buildClipSpec(
  shape: QRShape,
  renderMode: QRRenderMode,
  maskSvgPath: string | null
): { kind: 'none' | 'circle' | 'path', pathData?: string }
{
  if (renderMode === 'safe')
  {
    return { kind: 'none' };
  }

  if (maskSvgPath)
  {
    return { kind: 'path', pathData: maskSvgPath };
  }

  switch (shape)
  {
    case 'circle':
      return { kind: 'circle' };
    case 'heart':
      return { kind: 'path', pathData: 'M0 200 v-200 h200 a100 100 0 0 1 100 100 a100 100 0 0 1 100 -100 h200 v200 z' };
    case 'star':
      return { kind: 'path', pathData: 'M 100,10 L 120,70 L 190,70 L 130,110 L 150,180 L 100,140 L 50,180 L 70,110 L 10,70 L 80,70 Z' };
    case 'shield':
      return { kind: 'path', pathData: 'M 20,20 L 180,20 L 180,90 C 180,150 100,190 100,190 C 100,190 20,150 20,90 Z' };
    default:
      return { kind: 'none' };
  }
}

export function getRawMatrix(data: string, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'H'): boolean[][]
{
  const qr = qrcode(0, errorCorrectionLevel);
  qr.addData(data);
  qr.make();

  const count = qr.getModuleCount();
  const matrix: boolean[][] = [];

  for (let row = 0; row < count; row++)
  {
    matrix[row] = [];
    for (let col = 0; col < count; col++)
    {
      matrix[row][col] = qr.isDark(row, col);
    }
  }

  return matrix;
}
