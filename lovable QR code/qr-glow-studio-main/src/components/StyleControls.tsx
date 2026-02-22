import { QR_THEMES, DOT_STYLES, EYE_STYLES, LOGO_SHAPES, QRTheme, DotStyle, EyeStyle, LogoShape } from '@/lib/qr-themes';
import { Palette, Grid3X3, Eye, Upload, CircleDot, User, Sliders, Sparkles, ChevronDown, ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export type AIQRMode = 'none' | 'ai-background' | 'ai-full-card' | 'ai-recolor';

const AI_QR_OPTIONS: { value: AIQRMode; label: string; desc: string }[] = [
  { value: 'none', label: 'No AI', desc: 'Standard QR code' },
  { value: 'ai-background', label: '🎨 AI Styled Background', desc: 'AI generates artistic background, real QR overlays' },
  { value: 'ai-full-card', label: '🖼️ AI Full Card Design', desc: 'AI generates whole card, QR placed on top' },
  { value: 'ai-recolor', label: '✨ AI Recolor QR', desc: 'AI edits the QR to look artistic while scannable' },
];

interface StyleControlsProps {
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
  aiQrMode: AIQRMode;
  coverImageUrl: string | null;
  onThemeChange: (theme: QRTheme) => void;
  onDotStyleChange: (style: DotStyle) => void;
  onEyeStyleChange: (style: EyeStyle) => void;
  onLogoChange: (url: string | null) => void;
  onLogoShapeChange: (shape: LogoShape) => void;
  onLogoTransparencyChange: (val: number) => void;
  onFacePhotoChange: (url: string | null) => void;
  onFacePhotoShapeChange: (shape: LogoShape) => void;
  onFacePhotoTransparencyChange: (val: number) => void;
  onQrTransparencyChange: (val: number) => void;
  onAiQrModeChange: (mode: AIQRMode) => void;
  onCoverImageChange: (url: string | null) => void;
}

function ControlSection({ icon: Icon, title, children, defaultOpen = true }: { icon: React.ElementType; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none list-none mb-2.5">
        <Icon size={12} className="text-rasta-gold" />
        {title}
        <span className="ml-auto text-[10px] group-open:rotate-90 transition-transform">▶</span>
      </summary>
      <div className="space-y-2.5 pb-3">{children}</div>
    </details>
  );
}

function ShapeSelector({ value, onChange }: { value: LogoShape; onChange: (s: LogoShape) => void }) {
  return (
    <div className="flex gap-1.5">
      {LOGO_SHAPES.map(s => (
        <button key={s.value} onClick={() => onChange(s.value)}
          className={`px-2 py-1 rounded-md text-[10px] transition-all ${value === s.value ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
        >{s.label}</button>
      ))}
    </div>
  );
}

function TransparencySlider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-16 shrink-0">{label}</span>
      <input type="range" min={10} max={100} value={value} onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1 accent-rasta-green cursor-pointer" />
      <span className="text-[10px] text-muted-foreground w-8 text-right">{value}%</span>
    </div>
  );
}

function FileUpload({ label, hasFile, onUpload, onRemove }: { label: string; hasFile: boolean; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemove: () => void }) {
  return (
    <div className="flex gap-2 items-center">
      <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary cursor-pointer transition-colors text-xs text-muted-foreground hover:text-foreground">
        <Upload size={14} />
        {hasFile ? `Change ${label}` : `Upload ${label}`}
        <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </label>
      {hasFile && (
        <button onClick={onRemove} className="px-2 py-2 rounded-lg text-[10px] text-accent hover:bg-muted transition-colors">✕</button>
      )}
    </div>
  );
}

export default function StyleControls({
  theme, dotStyle, eyeStyle,
  logoUrl, logoShape, logoTransparency,
  facePhotoUrl, facePhotoShape, facePhotoTransparency,
  qrTransparency, aiQrMode, coverImageUrl,
  onThemeChange, onDotStyleChange, onEyeStyleChange,
  onLogoChange, onLogoShapeChange, onLogoTransparencyChange,
  onFacePhotoChange, onFacePhotoShapeChange, onFacePhotoTransparencyChange,
  onQrTransparencyChange, onAiQrModeChange, onCoverImageChange,
}: StyleControlsProps) {
  const [showAiDropdown, setShowAiDropdown] = useState(false);
  const aiDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showAiDropdown) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (!aiDropdownRef.current) {
        return;
      }

      const target = event.target as Node | null;
      if (target && !aiDropdownRef.current.contains(target)) {
        setShowAiDropdown(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAiDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showAiDropdown]);

  const handleFileUpload = (setter: (url: string | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setter(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const categories = [
    { label: '🟢 Rasta', key: 'rasta' as const },
    { label: '💼 Professional', key: 'professional' as const },
    { label: '✨ Creative', key: 'creative' as const },
  ];

  return (
    <div className="space-y-4 pr-1 lg:min-h-[300px] lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto">
      {/* Color Themes */}
      <ControlSection icon={Palette} title="Color Theme">
        {categories.map(cat => {
          const themes = QR_THEMES.filter(t => t.category === cat.key);
          return (
            <div key={cat.key} className="space-y-1.5">
              <div className="text-[10px] text-muted-foreground font-medium">{cat.label}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {themes.map(t => (
                  <motion.button key={t.id} whileTap={{ scale: 0.95 }}
                    onClick={() => onThemeChange(t)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                      theme.id === t.id ? 'ring-1 ring-primary bg-muted text-foreground' : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex gap-0.5 shrink-0">
                      {t.colors.slice(0, 3).map((c, i) => (
                        <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="truncate">{t.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </ControlSection>

      {/* QR Transparency */}
      <ControlSection icon={Sliders} title="QR Opacity">
        <TransparencySlider label="QR Code" value={qrTransparency} onChange={onQrTransparencyChange} />
      </ControlSection>

      {/* Dot Style */}
      <ControlSection icon={Grid3X3} title="QR Body Style">
        <div className="grid grid-cols-3 gap-1">
          {DOT_STYLES.map(s => (
            <button key={s.value} onClick={() => onDotStyleChange(s.value)}
              className={`px-1.5 py-1 rounded-md text-[10px] transition-all ${dotStyle === s.value ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
            >{s.label}</button>
          ))}
        </div>
      </ControlSection>

      {/* Eye Style */}
      <ControlSection icon={Eye} title="Corner Style" defaultOpen={false}>
        <div className="grid grid-cols-3 gap-1">
          {EYE_STYLES.map(s => (
            <button key={s.value} onClick={() => onEyeStyleChange(s.value)}
              className={`px-1.5 py-1 rounded-md text-[10px] transition-all ${eyeStyle === s.value ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
            >{s.label}</button>
          ))}
        </div>
      </ControlSection>

      {/* Logo */}
      <ControlSection icon={CircleDot} title="Logo">
        <FileUpload label="Logo" hasFile={!!logoUrl} onUpload={handleFileUpload(onLogoChange)} onRemove={() => onLogoChange(null)} />
        {logoUrl && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-12">Shape</span>
              <ShapeSelector value={logoShape} onChange={onLogoShapeChange} />
            </div>
            <TransparencySlider label="Opacity" value={logoTransparency} onChange={onLogoTransparencyChange} />
            <div className="flex justify-center">
              <img src={logoUrl} alt="Logo" className="w-10 h-10 object-cover" style={
                logoShape === 'round' ? { borderRadius: '50%' } : logoShape === 'oval' ? { borderRadius: '50% / 40%' } : { borderRadius: '6px' }
              } />
            </div>
          </>
        )}
      </ControlSection>

      {/* Face Photo */}
      <ControlSection icon={User} title="Face Photo">
        <FileUpload label="Photo" hasFile={!!facePhotoUrl} onUpload={handleFileUpload(onFacePhotoChange)} onRemove={() => onFacePhotoChange(null)} />
        {facePhotoUrl && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-12">Shape</span>
              <ShapeSelector value={facePhotoShape} onChange={onFacePhotoShapeChange} />
            </div>
            <TransparencySlider label="Opacity" value={facePhotoTransparency} onChange={onFacePhotoTransparencyChange} />
            <div className="flex justify-center">
              <img src={facePhotoUrl} alt="Photo" className="w-12 h-12 object-cover" style={
                facePhotoShape === 'round' ? { borderRadius: '50%' } : facePhotoShape === 'oval' ? { borderRadius: '50% / 40%' } : { borderRadius: '6px' }
              } />
            </div>
          </>
        )}
      </ControlSection>

      {/* Cover / Background Image */}
      <ControlSection icon={ImageIcon} title="Cover Image">
        <FileUpload label="Cover" hasFile={!!coverImageUrl} onUpload={handleFileUpload(onCoverImageChange)} onRemove={() => onCoverImageChange(null)} />
        {coverImageUrl && (
          <div className="flex justify-center">
            <img src={coverImageUrl} alt="Cover" className="w-full h-20 object-cover rounded-lg" />
          </div>
        )}
      </ControlSection>

      {/* AI QR Mode */}
      <ControlSection icon={Sparkles} title="AI QR Mode" defaultOpen={false}>
        <div ref={aiDropdownRef} className="relative">
          <button
            onClick={() => setShowAiDropdown(!showAiDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-muted/30 text-xs text-foreground hover:bg-muted/60 transition-colors"
          >
            <span>{AI_QR_OPTIONS.find(o => o.value === aiQrMode)?.label || 'No AI'}</span>
            <ChevronDown size={12} />
          </button>
          {showAiDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-popover border border-border rounded-lg shadow-xl py-1 max-h-56 overflow-y-auto">
              {AI_QR_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => { onAiQrModeChange(o.value); setShowAiDropdown(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/80 transition-colors ${aiQrMode === o.value ? 'text-foreground font-medium bg-muted/50' : 'text-muted-foreground'}`}
                >
                  <div className="font-medium">{o.label}</div>
                  <div className="text-[10px] opacity-60">{o.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {aiQrMode !== 'none' && (
          <p className="text-[10px] text-muted-foreground mt-1">
            ⚠️ AI features require Cloud to be enabled. Coming soon!
          </p>
        )}
      </ControlSection>
    </div>
  );
}
