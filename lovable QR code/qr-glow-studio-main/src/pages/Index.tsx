import { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Bot, Zap, CreditCard } from 'lucide-react';
import VCardForm from '@/components/VCardForm';
import QRPreview from '@/components/QRPreview';
import StyleControls from '@/components/StyleControls';
import { AIQRMode } from '@/components/StyleControls';
import CardPreview from '@/components/CardPreview';
import { VCardData, defaultVCardData } from '@/lib/vcard';
import { QR_THEMES, QRTheme, DotStyle, EyeStyle, LogoShape } from '@/lib/qr-themes';

const VOICE_AI_TEMPLATE: Partial<VCardData> = {
  jobTitle: 'AI Receptionist',
  note: 'AI Receptionist Available 24/7 — Scan to call!',
};

const Index = () => {
  const [vCardData, setVCardData] = useState<VCardData>(defaultVCardData);
  const [theme, setTheme] = useState<QRTheme>(QR_THEMES[0]);
  const [dotStyle, setDotStyle] = useState<DotStyle>('rounded');
  const [eyeStyle, setEyeStyle] = useState<EyeStyle>('extra-rounded');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoShape, setLogoShape] = useState<LogoShape>('round');
  const [logoTransparency, setLogoTransparency] = useState(100);
  const [facePhotoUrl, setFacePhotoUrl] = useState<string | null>(null);
  const [facePhotoShape, setFacePhotoShape] = useState<LogoShape>('round');
  const [facePhotoTransparency, setFacePhotoTransparency] = useState(100);
  const [qrTransparency, setQrTransparency] = useState(80);
  const [activeTab, setActiveTab] = useState<'form' | 'style'>('form');
  const [aiQrMode, setAiQrMode] = useState<AIQRMode>('none');
  const [previewMode, setPreviewMode] = useState<'qr' | 'card'>('card');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const applyTemplate = () => {
    setVCardData(prev => ({ ...prev, ...VOICE_AI_TEMPLATE }));
  };

  const styleProps = {
    theme, dotStyle, eyeStyle,
    logoUrl, logoShape, logoTransparency,
    facePhotoUrl, facePhotoShape, facePhotoTransparency,
    qrTransparency,
    onThemeChange: setTheme,
    onDotStyleChange: setDotStyle,
    onEyeStyleChange: setEyeStyle,
    onLogoChange: setLogoUrl,
    onLogoShapeChange: setLogoShape,
    onLogoTransparencyChange: setLogoTransparency,
    onFacePhotoChange: setFacePhotoUrl,
    onFacePhotoShapeChange: setFacePhotoShape,
    onFacePhotoTransparencyChange: setFacePhotoTransparency,
    onQrTransparencyChange: setQrTransparency,
    aiQrMode,
    onAiQrModeChange: setAiQrMode,
    coverImageUrl,
    onCoverImageChange: setCoverImageUrl,
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: `${theme.colors[0]}08` }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: `${theme.cardAccent}06` }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center glow-green" style={{ background: `${theme.colors[0]}20` }}>
              <QrCode size={22} style={{ color: theme.colors[0] }} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono rasta-gradient-text">vCard QR Generator</h1>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Powered by Voice AI Receptionist Technology</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={applyTemplate}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-medium transition-colors"
            style={{ borderColor: `${theme.cardAccent}30`, color: theme.cardAccent }}
          >
            <Bot size={14} />
            Voice AI Template
          </motion.button>
        </motion.header>

        {/* Main Layout */}
        <div className="grid lg:grid-cols-[1fr,400px] gap-6">
          {/* Left: Form + Style */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-6"
          >
            {/* Mobile tabs */}
            <div className="flex gap-1 mb-6 lg:hidden bg-muted/50 rounded-lg p-1">
              <button onClick={() => setActiveTab('form')}
                className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${activeTab === 'form' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                📋 Content
              </button>
              <button onClick={() => setActiveTab('style')}
                className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${activeTab === 'style' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                🎨 Style
              </button>
            </div>

            {/* Desktop */}
            <div className="hidden lg:grid lg:grid-cols-[1fr,260px] lg:gap-6">
              <VCardForm data={vCardData} onChange={setVCardData} />
              <div className="border-l border-border pl-6">
                <StyleControls {...styleProps} />
              </div>
            </div>

            {/* Mobile */}
            <div className="lg:hidden">
              {activeTab === 'form' ? (
                <VCardForm data={vCardData} onChange={setVCardData} />
              ) : (
                <StyleControls {...styleProps} />
              )}
            </div>
          </motion.div>

          {/* Right: Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-6 lg:sticky lg:top-6 self-start"
          >
            {/* Preview mode tabs */}
            <div className="flex items-center gap-2 mb-5">
              <button onClick={() => setPreviewMode('card')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${previewMode === 'card' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <CreditCard size={12} /> Card Preview
              </button>
              <button onClick={() => setPreviewMode('qr')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${previewMode === 'qr' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <QrCode size={12} /> QR Only
              </button>
            </div>

            {previewMode === 'card' ? (
              <CardPreview
                data={vCardData}
                theme={theme}
                dotStyle={dotStyle}
                eyeStyle={eyeStyle}
                logoUrl={logoUrl}
                logoShape={logoShape}
                logoTransparency={logoTransparency}
                facePhotoUrl={facePhotoUrl}
                facePhotoShape={facePhotoShape}
                facePhotoTransparency={facePhotoTransparency}
                qrTransparency={qrTransparency}
                coverImageUrl={coverImageUrl}
              />
            ) : (
              <QRPreview
                data={vCardData}
                theme={theme}
                dotStyle={dotStyle}
                eyeStyle={eyeStyle}
                logoUrl={logoUrl}
              />
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-muted-foreground space-y-1 pb-6">
          <p>Need an AI agent to answer your calls? <a href="#" className="font-medium transition-colors" style={{ color: theme.colors[0] }}>Learn More →</a></p>
          <p className="opacity-50">© {new Date().getFullYear()} Voice AI Receptionist Technology</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
