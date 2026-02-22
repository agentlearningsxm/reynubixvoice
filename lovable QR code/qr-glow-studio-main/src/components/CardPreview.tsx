import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import QRCodeStyling, { DotType, CornerSquareType } from 'qr-code-styling';
import { VCardData, generateVCardString } from '@/lib/vcard';
import { QRTheme, DotStyle, EyeStyle, LogoShape } from '@/lib/qr-themes';
import { Download, Move, RotateCcw, Smartphone, Layout, ChevronDown } from 'lucide-react';

interface Position { x: number; y: number }

export type LayoutTemplate = 'classic' | 'modern-offset' | 'minimal-bottom' | 'custom';

interface LayoutPositions {
  qr: Position;
  logo: Position;
  face: Position;
  textBlock: Position;
}

const LAYOUT_TEMPLATES: Record<Exclude<LayoutTemplate, 'custom'>, { label: string; positions: LayoutPositions }> = {
  'classic': {
    label: '🎯 Classic Centered',
    positions: {
      face: { x: 120, y: 40 },
      logo: { x: 20, y: 20 },
      textBlock: { x: 30, y: 300 },
      qr: { x: 100, y: 430 },
    },
  },
  'modern-offset': {
    label: '⚡ Modern Offset',
    positions: {
      face: { x: 20, y: 30 },
      logo: { x: 250, y: 30 },
      textBlock: { x: 20, y: 200 },
      qr: { x: 200, y: 420 },
    },
  },
  'minimal-bottom': {
    label: '✨ Minimal Bottom',
    positions: {
      face: { x: 130, y: 60 },
      logo: { x: 20, y: 480 },
      textBlock: { x: 30, y: 380 },
      qr: { x: 200, y: 450 },
    },
  },
};

interface CardPreviewProps {
  data: VCardData;
  theme: QRTheme;
  dotStyle: DotStyle;
  eyeStyle: EyeStyle;
  logoUrl: string | null;
  logoShape: LogoShape;
  logoTransparency: number;
  facePhotoUrl: string | null;
  facePhotoShape: LogoShape;
  facePhotoTransparency: number;
  qrTransparency: number;
  coverImageUrl: string | null;
}

function useDraggable(initial: Position) {
  const [pos, setPos] = useState<Position>(initial);
  const [dragging, setDragging] = useState(false);
  const offset = useRef<Position>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const parentRect = containerRef.current.parentElement?.getBoundingClientRect();
    if (!parentRect) return;
    const x = e.clientX - parentRect.left - offset.current.x;
    const y = e.clientY - parentRect.top - offset.current.y;
    setPos({ x: Math.max(0, x), y: Math.max(0, y) });
  }, [dragging]);

  const onPointerUp = useCallback(() => setDragging(false), []);

  return { pos, setPos, dragging, containerRef, handlers: { onPointerDown, onPointerMove, onPointerUp } };
}

function getShapeStyle(shape: LogoShape): React.CSSProperties {
  switch (shape) {
    case 'round': return { borderRadius: '50%' };
    case 'oval': return { borderRadius: '50% / 40%' };
    default: return { borderRadius: '8px' };
  }
}

export default function CardPreview({
  data, theme, dotStyle, eyeStyle,
  logoUrl, logoShape, logoTransparency,
  facePhotoUrl, facePhotoShape, facePhotoTransparency,
  qrTransparency, coverImageUrl,
}: CardPreviewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const qrInstance = useRef<QRCodeStyling | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<LayoutTemplate>('classic');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  const qrDrag = useDraggable({ x: 100, y: 430 });
  const logoDrag = useDraggable({ x: 20, y: 20 });
  const faceDrag = useDraggable({ x: 120, y: 40 });
  const textDrag = useDraggable({ x: 30, y: 300 });

  const vcardString = generateVCardString(data);
  const displayName = `${data.firstName} ${data.lastName}`.trim() || 'Your Name';
  const displayTitle = data.jobTitle || '';
  const displayOrg = data.organization || '';
  const displayPhone = data.phones.find(p => p.value)?.value || '';
  const displayEmail = data.emails.find(e => e.value)?.value || '';
  const displayWebsite = data.websites.find(w => w) || '';

  // Initialize QR
  useEffect(() => {
    qrInstance.current = new QRCodeStyling({
      width: 140,
      height: 140,
      type: 'svg',
      data: vcardString || 'BEGIN:VCARD\nVERSION:3.0\nEND:VCARD',
      dotsOptions: { color: theme.dotColor, type: dotStyle as DotType },
      cornersSquareOptions: { color: theme.eyeColor, type: eyeStyle as CornerSquareType },
      backgroundOptions: { color: 'transparent' },
    });
    if (qrContainerRef.current) {
      qrContainerRef.current.innerHTML = '';
      qrInstance.current.append(qrContainerRef.current);
    }
  }, []);

  useEffect(() => {
    qrInstance.current?.update({
      data: vcardString || 'BEGIN:VCARD\nVERSION:3.0\nEND:VCARD',
      dotsOptions: { color: theme.dotColor, type: dotStyle as DotType },
      cornersSquareOptions: { color: theme.eyeColor, type: eyeStyle as CornerSquareType },
    });
  }, [vcardString, theme, dotStyle, eyeStyle]);

  const applyTemplate = (templateId: LayoutTemplate) => {
    if (templateId === 'custom') return;
    const t = LAYOUT_TEMPLATES[templateId];
    qrDrag.setPos(t.positions.qr);
    logoDrag.setPos(t.positions.logo);
    faceDrag.setPos(t.positions.face);
    textDrag.setPos(t.positions.textBlock);
    setActiveTemplate(templateId);
    setShowTemplateDropdown(false);
  };

  const resetPositions = () => {
    applyTemplate('classic');
  };

  // Mark as custom when user drags anything
  const markCustom = () => {
    if (activeTemplate !== 'custom') setActiveTemplate('custom');
  };

  const handleExport = useCallback(async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const handles = cardRef.current.querySelectorAll('[data-drag-handle]');
      handles.forEach(h => (h as HTMLElement).style.display = 'none');

      const dataUrl = await toPng(cardRef.current, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        style: {
          transform: `scale(${1080 / cardRef.current.offsetWidth})`,
          transformOrigin: 'top left',
        },
      });

      handles.forEach(h => (h as HTMLElement).style.display = '');

      const link = document.createElement('a');
      link.download = `vcard-${data.firstName || 'card'}-${data.lastName || ''}.png`.toLowerCase().replace(/\s+/g, '-');
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    }
    setIsExporting(false);
  }, [data.firstName, data.lastName]);

  const DragHandle = ({ active }: { active: boolean }) => (
    <div data-drag-handle className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[8px] z-20 ${active ? 'bg-primary text-primary-foreground' : 'bg-muted/80 text-muted-foreground'}`}>
      <Move size={10} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Move size={12} />
          <span>Drag to reposition</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Template Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Layout size={11} />
              {activeTemplate === 'custom' ? 'Custom' : LAYOUT_TEMPLATES[activeTemplate]?.label}
              <ChevronDown size={10} />
            </button>
            {showTemplateDropdown && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowTemplateDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 bg-popover border border-border rounded-lg shadow-xl py-1 w-48">
                  {Object.entries(LAYOUT_TEMPLATES).map(([id, t]) => (
                    <button
                      key={id}
                      onClick={() => applyTemplate(id as LayoutTemplate)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/80 transition-colors ${activeTemplate === id ? 'text-foreground font-medium bg-muted/50' : 'text-muted-foreground'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={resetPositions} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>

      {/* Card Preview */}
      <div className="relative mx-auto" style={{ width: 340, height: 604 }}>
        <div className="absolute inset-0 rounded-[2rem] border-2 border-border/50 pointer-events-none z-20" />

        <div
          ref={cardRef}
          className="relative w-full h-full rounded-[1.8rem] overflow-hidden select-none"
          style={{ background: coverImageUrl ? 'transparent' : theme.cardBg }}
        >
          {/* Cover image background */}
          {coverImageUrl && (
            <img src={coverImageUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
          )}

          {/* Subtle pattern overlay */}
          {!coverImageUrl && (
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, ${theme.cardAccent}40 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${theme.cardAccent}20 0%, transparent 50%)`,
            }} />
          )}

          {/* Draggable Text Block */}
          <div
            ref={textDrag.containerRef}
            className="absolute cursor-grab active:cursor-grabbing z-10"
            style={{
              left: textDrag.pos.x,
              top: textDrag.pos.y,
              color: theme.cardText,
              touchAction: 'none',
              maxWidth: 280,
            }}
            onPointerDown={(e) => { markCustom(); textDrag.handlers.onPointerDown(e); }}
            onPointerMove={textDrag.handlers.onPointerMove}
            onPointerUp={textDrag.handlers.onPointerUp}
          >
            <DragHandle active={textDrag.dragging} />
            <h2 className="text-2xl font-bold font-mono leading-tight">{displayName}</h2>
            {displayTitle && (
              <p className="text-sm mt-1 opacity-80" style={{ color: theme.cardAccent }}>{displayTitle}</p>
            )}
            {displayOrg && (
              <p className="text-xs mt-0.5 opacity-60">{displayOrg}</p>
            )}
            <div className="mt-3 space-y-1 text-xs opacity-70">
              {displayPhone && <p>📞 {displayPhone}</p>}
              {displayEmail && <p>✉️ {displayEmail}</p>}
              {displayWebsite && <p>🌐 {displayWebsite}</p>}
            </div>
            {data.note && (
              <p className="mt-2 text-[10px] italic opacity-50">"{data.note}"</p>
            )}
          </div>

          {/* Draggable QR Code */}
          <div
            ref={qrDrag.containerRef}
            className="absolute cursor-grab active:cursor-grabbing z-10"
            style={{
              left: qrDrag.pos.x,
              top: qrDrag.pos.y,
              opacity: qrTransparency / 100,
              touchAction: 'none',
            }}
            onPointerDown={(e) => { markCustom(); qrDrag.handlers.onPointerDown(e); }}
            onPointerMove={qrDrag.handlers.onPointerMove}
            onPointerUp={qrDrag.handlers.onPointerUp}
          >
            <DragHandle active={qrDrag.dragging} />
            <div ref={qrContainerRef} />
          </div>

          {/* Draggable Logo */}
          {logoUrl && (
            <div
              ref={logoDrag.containerRef}
              className="absolute cursor-grab active:cursor-grabbing z-10"
              style={{
                left: logoDrag.pos.x,
                top: logoDrag.pos.y,
                touchAction: 'none',
              }}
              onPointerDown={(e) => { markCustom(); logoDrag.handlers.onPointerDown(e); }}
              onPointerMove={logoDrag.handlers.onPointerMove}
              onPointerUp={logoDrag.handlers.onPointerUp}
            >
              <DragHandle active={logoDrag.dragging} />
              <img
                src={logoUrl}
                alt="Logo"
                className="w-16 h-16 object-cover pointer-events-none"
                style={{
                  ...getShapeStyle(logoShape),
                  opacity: logoTransparency / 100,
                }}
              />
            </div>
          )}

          {/* Draggable Face Photo */}
          {facePhotoUrl && (
            <div
              ref={faceDrag.containerRef}
              className="absolute cursor-grab active:cursor-grabbing z-10"
              style={{
                left: faceDrag.pos.x,
                top: faceDrag.pos.y,
                touchAction: 'none',
              }}
              onPointerDown={(e) => { markCustom(); faceDrag.handlers.onPointerDown(e); }}
              onPointerMove={faceDrag.handlers.onPointerMove}
              onPointerUp={faceDrag.handlers.onPointerUp}
            >
              <DragHandle active={faceDrag.dragging} />
              <img
                src={facePhotoUrl}
                alt="Photo"
                className="w-24 h-24 object-cover pointer-events-none"
                style={{
                  ...getShapeStyle(facePhotoShape),
                  opacity: facePhotoTransparency / 100,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Export Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleExport}
        disabled={isExporting}
        className="btn-rasta w-full flex items-center justify-center gap-2"
      >
        <Smartphone size={16} />
        {isExporting ? 'Exporting...' : 'Download as Wallpaper'}
      </motion.button>
    </div>
  );
}
