import React, { useEffect, useMemo, useRef } from 'react';
import * as fabric from 'fabric';
import QRCodeStyling from 'qr-code-styling';
import { useQRStore, QRStyleState } from '../../store/qrStore';
import { ZoomIn, ZoomOut, ArrowUp, ArrowDown, Trash2, Download, Smartphone, Type } from 'lucide-react';
import { buildClipSpec } from '../../lib/qr/engine/renderArtMask';
import { buildQrCodeOptions } from '../../lib/qr/engine/renderStyled';
import { validateQrStyle } from '../../lib/qr/engine/scanGuard';
import { buildVCardString } from '../../lib/qr/vcard';

interface CanvasAreaProps {
  className?: string;
}

function getScanGuardWarnings(style: QRStyleState) {
  const result = validateQrStyle(style);
  return {
    score: result.score,
    pass: result.pass,
    warnings: result.issues.map((issue) => issue.message),
  };
}

function createClipPath(style: QRStyleState, qrSizePx: number) {
  const spec = buildClipSpec(style.shape, style.renderMode, style.mask.enabled ? style.mask.svgPath : null);

  if (spec.kind === 'none') {
    return null;
  }

  if (spec.kind === 'circle') {
    return new fabric.Circle({
      radius: qrSizePx / 2,
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0,
    });
  }

  if (spec.kind === 'path' && spec.pathData) {
    const path = new fabric.Path(spec.pathData, {
      originX: 'center',
      originY: 'center',
      left: 0,
      top: 0,
    });

    const bounds = path.getBoundingRect();
    const maxBox = qrSizePx * 0.95;
    if (bounds.width > 0 && bounds.height > 0) {
      const scale = Math.min(maxBox / bounds.width, maxBox / bounds.height);
      path.set({
        scaleX: scale,
        scaleY: scale,
      });
    }

    return path;
  }

  return null;
}

function triggerDownload(url: string, fileName: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function CanvasArea({ className = '' }: CanvasAreaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const qrImageRef = useRef<fabric.Image | fabric.FabricImage | null>(null);

  const store = useQRStore();

  const qrData = useMemo(() => {
    if (store.qrType === 'vcard') {
      return buildVCardString(store.vcardData);
    }
    return store.url || 'https://reynubixvoice.com';
  }, [store.qrType, store.vcardData, store.url]);

  useEffect(() => {
    const nextScanGuard = getScanGuardWarnings(store.qrStyle);
    const prev = store.qrStyle.scanGuard;

    const hasChanged =
      prev.score !== nextScanGuard.score ||
      prev.pass !== nextScanGuard.pass ||
      prev.warnings.join('|') !== nextScanGuard.warnings.join('|');

    if (hasChanged) {
      store.setScanGuard({
        enabled: true,
        score: nextScanGuard.score,
        pass: nextScanGuard.pass,
        warnings: nextScanGuard.warnings,
      });
    }
  }, [
    store.qrStyle.shape,
    store.qrStyle.renderMode,
    store.qrStyle.qrSize,
    store.qrStyle.dotsType,
    store.qrStyle.dotsColor,
    store.qrStyle.backgroundColor,
    store.qrStyle.cornerSquareType,
    store.qrStyle.cornerSquareColor,
    store.qrStyle.quietZone,
    store.qrStyle.gradient?.enabled,
    store.qrStyle.gradient?.type,
    store.qrStyle.gradient?.colorStops,
    store.qrStyle.logo.enabled,
    store.qrStyle.logo.sizeRatio,
    store.qrStyle.logo.margin,
    store.qrStyle.logo.imageDataUrl,
    store.qrStyle.mask.enabled,
    store.qrStyle.mask.svgPath,
    store.setScanGuard,
  ]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const getRenderSize = () => {
      if (previewFrameRef.current) {
        return {
          width: previewFrameRef.current.clientWidth,
          height: previewFrameRef.current.clientHeight,
        };
      }

      return {
        width: containerRef.current?.clientWidth ?? 800,
        height: containerRef.current?.clientHeight ?? 600,
      };
    };

    const size = getRenderSize();

    fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
      width: size.width,
      height: size.height,
      backgroundColor: 'transparent',
      selection: true,
      preserveObjectStacking: true,
    });

    const handleResize = () => {
      if (!fabricCanvasRef.current) return;
      const nextSize = getRenderSize();
      fabricCanvasRef.current.setDimensions({
        width: Math.max(1, nextSize.width),
        height: Math.max(1, nextSize.height),
      });
      fabricCanvasRef.current.renderAll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      fabricCanvasRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const frame = previewFrameRef.current;
    const width = frame?.clientWidth ?? containerRef.current?.clientWidth ?? 800;
    const height = frame?.clientHeight ?? containerRef.current?.clientHeight ?? 600;

    fabricCanvasRef.current.setDimensions({ width: Math.max(1, width), height: Math.max(1, height) });

    if (qrImageRef.current) {
      const qrObj = qrImageRef.current;
      qrObj.set({
        left: (width - qrObj.getScaledWidth()) / 2,
        top: (height - qrObj.getScaledHeight()) / 2,
      });
    }

    fabricCanvasRef.current.renderAll();
  }, [store.isMobilePreview]);

  useEffect(() => {
    const renderQR = async () => {
      if (!fabricCanvasRef.current) return;

      const canvas = fabricCanvasRef.current;
      const width = canvas.getWidth();
      const height = canvas.getHeight();

      const qrCode = new QRCodeStyling(buildQrCodeOptions(store.qrStyle, qrData) as any);

      try {
        const rawBlob = (await qrCode.getRawData('png')) as Blob;
        if (!rawBlob) return;

        const objectUrl = URL.createObjectURL(rawBlob);
        const imgEl = new Image();
        imgEl.src = objectUrl;
        imgEl.onload = () => {
          const FabricImg = (fabric as any).FabricImage || (fabric as any).Image;
          const targetSize = Math.min(store.qrStyle.qrSize, width * 0.88, height * 0.88);
          const clipPath = createClipPath(store.qrStyle, targetSize);

          const previous = qrImageRef.current;
          let nextLeft = (width - targetSize) / 2;
          let nextTop = (height - targetSize) / 2;

          if (previous) {
            const prevCenter = previous.getCenterPoint();
            nextLeft = prevCenter.x - targetSize / 2;
            nextTop = prevCenter.y - targetSize / 2;
            canvas.remove(previous);
          }

          const img = new FabricImg(imgEl, {
            left: nextLeft,
            top: nextTop,
            cornerColor: '#0EA5E9',
            cornerStrokeColor: '#0EA5E9',
            borderColor: '#0EA5E9',
            transparentCorners: false,
            clipPath: clipPath || undefined,
          });

          img.scaleToWidth(targetSize);
          canvas.add(img);

          if (previous && canvas.getActiveObject() === previous) {
            canvas.setActiveObject(img);
          } else if (!previous) {
            canvas.setActiveObject(img);
          }

          qrImageRef.current = img;
          canvas.renderAll();
          URL.revokeObjectURL(objectUrl);
        };
      } catch (error) {
        console.error('Failed to render QR', error);
      }
    };

    renderQR();
  }, [
    qrData,
    store.qrStyle.shape,
    store.qrStyle.renderMode,
    store.qrStyle.qrSize,
    store.qrStyle.dotsType,
    store.qrStyle.dotsColor,
    store.qrStyle.backgroundColor,
    store.qrStyle.cornerSquareType,
    store.qrStyle.cornerSquareColor,
    store.qrStyle.quietZone,
    store.qrStyle.gradient?.enabled,
    store.qrStyle.gradient?.type,
    store.qrStyle.gradient?.colorStops,
    store.qrStyle.logo.enabled,
    store.qrStyle.logo.imageDataUrl,
    store.qrStyle.logo.sizeRatio,
    store.qrStyle.logo.margin,
    store.qrStyle.mask.enabled,
    store.qrStyle.mask.svgPath,
    store.isMobilePreview,
  ]);

  const handleZoom = (factor: number) => {
    const cvs = fabricCanvasRef.current;
    if (!cvs) return;

    let zoom = cvs.getZoom() * factor;
    if (zoom > 3) zoom = 3;
    if (zoom < 0.25) zoom = 0.25;
    cvs.setZoom(zoom);
  };

  const handleAction = (action: 'forward' | 'backward' | 'delete') => {
    const cvs = fabricCanvasRef.current;
    if (!cvs) return;

    const active = cvs.getActiveObjects();
    if (!active || active.length === 0) return;

    if (action === 'delete') {
      active.forEach((obj) => {
        if (obj !== qrImageRef.current) {
          cvs.remove(obj);
        }
      });
      cvs.discardActiveObject();
    } else if (action === 'forward') {
      active.forEach((obj) => {
        if (typeof (cvs as any).bringObjectForward === 'function') {
          (cvs as any).bringObjectForward(obj);
        } else if (typeof (obj as any).bringForward === 'function') {
          (obj as any).bringForward();
        }
      });
    } else if (action === 'backward') {
      active.forEach((obj) => {
        if (typeof (cvs as any).sendObjectBackwards === 'function') {
          (cvs as any).sendObjectBackwards(obj);
        } else if (typeof (obj as any).sendBackwards === 'function') {
          (obj as any).sendBackwards();
        }
      });
    }

    cvs.renderAll();
  };

  const handleAddText = () => {
    if (!fabricCanvasRef.current) return;
    const cvs = fabricCanvasRef.current;
    const FabricText = (fabric as any).IText || (fabric as any).Text;

    const text = new FabricText('YOUR BRAND', {
      left: cvs.getWidth() / 2,
      top: 40,
      fontFamily: 'Inter, sans-serif',
      fontSize: 24,
      fill: '#ffffff',
      originX: 'center',
      originY: 'center',
      fontWeight: '600',
      cornerColor: '#0EA5E9',
      cornerStrokeColor: '#0EA5E9',
      borderColor: '#0EA5E9',
      transparentCorners: false,
    });

    cvs.add(text);
    cvs.setActiveObject(text);
    cvs.renderAll();
  };

  const handleExport = (format: 'png' | 'svg' | 'vcf') => {
    if (format === 'vcf' && store.qrType === 'vcard') {
      const blob = new Blob([qrData], { type: 'text/vcard' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, 'contact.vcf');
      URL.revokeObjectURL(url);
      return;
    }

    const validation = validateQrStyle(store.qrStyle);
    const blockingMessages = validation.issues
      .filter((issue) => issue.severity === 'error')
      .map((issue) => `• ${issue.message}`)
      .join('\n');

    if (store.qrStyle.renderMode === 'safe' && !validation.pass) {
      const proceed = window.confirm(
        `Safe mode warning: reliability checks failed.\n\n${blockingMessages}\n\nExport anyway as experimental?`
      );
      if (!proceed) return;
    }

    if (store.qrStyle.renderMode === 'art' && !validation.pass) {
      const proceed = window.confirm(
        `Art mode warning: this QR may fail on some devices.\n\n${blockingMessages}\n\nExport anyway?`
      );
      if (!proceed) return;
    }

    if (!fabricCanvasRef.current) return;

    if (format === 'svg') {
      const svgStr = fabricCanvasRef.current.toSVG();
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, 'qr-studio-export.svg');
      URL.revokeObjectURL(url);
    } else {
      const dataUrl = fabricCanvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2,
      });
      triggerDownload(dataUrl, 'qr-studio-export.png');
    }
  };

  useEffect(() => {
    store.hydrate();
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden flex items-center justify-center ${className} ${store.isMobilePreview ? 'bg-black/80' : ''}`}>
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
      />

      <div
        ref={previewFrameRef}
        className={`absolute transition-all duration-500 ${store.isMobilePreview
          ? 'w-[320px] h-[650px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[2.5rem] border-8 border-gray-800 shadow-2xl overflow-hidden bg-bg-main'
          : 'inset-0'
          }`}
      >
        {store.isMobilePreview && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl z-20 shadow-md" />
        )}
        <canvas ref={canvasRef} />
      </div>

      <div className="absolute top-4 right-4 z-30">
        <span className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${store.qrStyle.renderMode === 'safe'
          ? 'bg-green-500/10 text-green-300 border-green-500/40'
          : 'bg-amber-500/10 text-amber-300 border-amber-500/40'}`}>
          {store.qrStyle.renderMode} mode
        </span>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-bg-glass backdrop-blur border border-border rounded-lg shadow-lg p-1.5 flex items-center gap-1 z-30">
        <button
          onClick={() => store.toggleMobilePreview()}
          className={`p-2 rounded-md transition-colors ${store.isMobilePreview ? 'bg-brand-primary/20 text-brand-primary' : 'hover:bg-black/20 text-text-secondary hover:text-text-primary'}`}
          title="Toggle Mobile Screenshot Mode"
        >
          <Smartphone size={18} />
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button onClick={() => handleZoom(1.1)} className="p-2 hover:bg-black/20 rounded-md text-text-secondary hover:text-text-primary transition-colors" title="Zoom In">
          <ZoomIn size={18} />
        </button>
        <button onClick={() => handleZoom(0.9)} className="p-2 hover:bg-black/20 rounded-md text-text-secondary hover:text-text-primary transition-colors" title="Zoom Out">
          <ZoomOut size={18} />
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button onClick={handleAddText} className="p-2 hover:bg-brand-primary/20 rounded-md text-text-secondary hover:text-brand-primary transition-colors" title="Add Text Element">
          <Type size={18} />
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button onClick={() => handleAction('forward')} className="p-2 hover:bg-black/20 rounded-md text-text-secondary hover:text-text-primary transition-colors" title="Bring Forward">
          <ArrowUp size={18} />
        </button>
        <button onClick={() => handleAction('backward')} className="p-2 hover:bg-black/20 rounded-md text-text-secondary hover:text-text-primary transition-colors" title="Send Backward">
          <ArrowDown size={18} />
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button onClick={() => handleAction('delete')} className="p-2 hover:bg-red-500/20 rounded-md text-text-secondary hover:text-red-500 transition-colors" title="Delete Selected">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-bg-glass backdrop-blur border border-border px-4 py-2 rounded-full shadow-lg flex items-center gap-4 z-30 w-full max-w-[560px] justify-between">
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${store.qrStyle.scanGuard.pass ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            Scan Guard {store.qrStyle.scanGuard.score}/100
          </span>
        </div>

        <div className="flex items-center gap-2">
          {store.qrType === 'vcard' && (
            <button onClick={() => handleExport('vcf')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-primary/10 text-brand-primary rounded-full hover:bg-brand-primary hover:text-white transition-colors">
              <Download size={14} /> VCF
            </button>
          )}
          <button onClick={() => handleExport('svg')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-black/20 text-white rounded-full hover:bg-white/10 transition-colors border border-border">
            SVG
          </button>
          <button onClick={() => handleExport('png')} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-white text-black rounded-full hover:bg-gray-200 transition-colors">
            <Download size={14} /> PNG
          </button>
        </div>
      </div>
    </div>
  );
}
