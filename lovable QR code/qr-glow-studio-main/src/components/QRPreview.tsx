import { useEffect, useRef, useState, useCallback } from 'react';
import QRCodeStyling, { DotType, CornerSquareType } from 'qr-code-styling';
import { generateVCardString, VCardData } from '@/lib/vcard';
import { QRTheme, DotStyle, EyeStyle } from '@/lib/qr-themes';
import { Check, AlertTriangle, Download, FileImage, FileText, Image } from 'lucide-react';
import { motion } from 'framer-motion';

interface QRPreviewProps {
  data: VCardData;
  theme: QRTheme;
  dotStyle: DotStyle;
  eyeStyle: EyeStyle;
  logoUrl: string | null;
}

export default function QRPreview({ data, theme, dotStyle, eyeStyle, logoUrl }: QRPreviewProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);
  const [vCardString, setVCardString] = useState('');
  const [showExport, setShowExport] = useState(false);

  const vcardData = generateVCardString(data);

  // Initialize QR code once
  useEffect(() => {
    qrCode.current = new QRCodeStyling({
      width: 280,
      height: 280,
      type: 'svg',
      data: 'BEGIN:VCARD\nVERSION:3.0\nEND:VCARD',
      dotsOptions: {
        color: theme.dotColor,
        type: dotStyle as DotType,
      },
      cornersSquareOptions: {
        color: theme.eyeColor,
        type: eyeStyle as CornerSquareType,
      },
      backgroundOptions: {
        color: 'transparent',
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 8,
      },
    });

    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      qrCode.current.append(qrRef.current);
    }
  }, []);

  // Update QR code when data changes
  useEffect(() => {
    setVCardString(vcardData);
    if (qrCode.current) {
      qrCode.current.update({
        data: vcardData,
        dotsOptions: {
          color: theme.dotColor,
          type: dotStyle as DotType,
        },
        cornersSquareOptions: {
          color: theme.eyeColor,
          type: eyeStyle as CornerSquareType,
        },
        image: logoUrl || undefined,
      });
    }
  }, [vcardData, theme, dotStyle, eyeStyle, logoUrl]);

  const isValid = data.firstName.length > 0 || data.lastName.length > 0;
  const dataSize = new Blob([vCardString]).size;

  const handleDownload = useCallback(async (format: 'png' | 'svg') => {
    if (!qrCode.current) return;

    // Create a high-res version for download
    const downloadQR = new QRCodeStyling({
      width: 1080,
      height: 1080,
      type: format === 'svg' ? 'svg' : 'canvas',
      data: vcardData,
      dotsOptions: {
        color: theme.dotColor,
        type: dotStyle as DotType,
      },
      cornersSquareOptions: {
        color: theme.eyeColor,
        type: eyeStyle as CornerSquareType,
      },
      backgroundOptions: {
        color: theme.bgColor,
      },
      image: logoUrl || undefined,
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 20,
      },
    });

    const fileName = `vcard-qr-${data.firstName || 'code'}-${data.lastName || ''}`.toLowerCase().replace(/\s+/g, '-');
    await downloadQR.download({ name: fileName, extension: format });
    setShowExport(false);
  }, [vcardData, theme, dotStyle, eyeStyle, logoUrl, data.firstName, data.lastName]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* QR Code Display */}
      <div className="relative">
        <div className="rasta-gradient-border rounded-2xl p-6 glass-panel">
          <div className="scan-lines absolute inset-0 rounded-2xl pointer-events-none z-10 opacity-50" />
          <div ref={qrRef} className="relative z-0 flex items-center justify-center" />
        </div>

        {/* Glow effect behind QR */}
        <div
          className="absolute inset-0 -z-10 blur-3xl opacity-20 rounded-full"
          style={{
            background: `radial-gradient(circle, ${theme.colors[0]}80, transparent 70%)`,
          }}
        />
      </div>

      {/* Status */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className={`flex items-center gap-1.5 ${isValid ? 'text-rasta-green' : 'text-rasta-gold'}`}>
          {isValid ? <Check size={14} /> : <AlertTriangle size={14} />}
          {isValid ? 'Scannable' : 'Add name to activate'}
        </div>
        <div className="text-muted-foreground">
          {dataSize} bytes
        </div>
      </div>

      {/* Download */}
      <div className="relative w-full">
        <button
          onClick={() => setShowExport(!showExport)}
          className="btn-rasta w-full flex items-center justify-center gap-2"
          disabled={!isValid}
        >
          <Download size={16} />
          Download QR Code
        </button>

        {showExport && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full mt-2 w-full glass-panel p-3 space-y-2 z-20"
          >
            <button onClick={() => handleDownload('png')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm text-foreground">
              <FileImage size={14} className="text-rasta-green" /> PNG (1080×1080)
            </button>
            <button onClick={() => handleDownload('svg')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm text-foreground">
              <FileText size={14} className="text-rasta-gold" /> SVG (Vector)
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
