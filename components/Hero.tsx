import { motion } from 'framer-motion';
import { ChevronRight, Play } from 'lucide-react';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { trackEventFireAndForget } from '../lib/telemetry/browser';
import { useLanguage } from '../contexts/LanguageContext';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useGroqFallback } from '../hooks/useGroqFallback';
import Button from './ui/Button';
import PhoneDemo from './PhoneDemo';

const Hero: React.FC = () => {
  const { t } = useLanguage();
  const gemini = useGeminiLive();
  const groq = useGroqFallback();
  const isGroqActive = gemini.fallbackMode;

  // Unified interface — pick from whichever provider is active
  const connected = isGroqActive ? groq.connected : gemini.connected;
  const isConnecting = isGroqActive ? groq.isConnecting : gemini.isConnecting;
  const isAgentSpeaking = isGroqActive ? groq.isAgentSpeaking : gemini.isAgentSpeaking;
  const isUserSpeaking = isGroqActive ? groq.isUserSpeaking : gemini.isUserSpeaking;
  const error = isGroqActive ? groq.error : gemini.error;
  const transcript = isGroqActive ? groq.transcript : gemini.transcript;

  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  // Auto-connect Groq when Gemini switches to fallback mode
  useEffect(() => {
    if (gemini.fallbackMode && !groq.connected && !groq.isConnecting) {
      void groq.connect();
    }
  }, [gemini.fallbackMode, groq.connected, groq.isConnecting, groq.connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      gemini.disconnect();
      groq.disconnect();
    };
  }, [gemini.disconnect, groq.disconnect]);

  const isLiveSession = connected || isConnecting || gemini.isReconnecting;


  const handlePhoneButtonClick = () => {
    if (connected) {
      groq.disconnect();
      gemini.disconnect('completed');
      return;
    }

    if (!consentAccepted) {
      setConsentError(t.hero.live.consentRequired);
      trackEventFireAndForget('voice_demo_consent_missing', {
        location: 'hero_phone',
      });
      return;
    }

    setConsentError(null);
    void gemini.connectToGemini({
      accepted: true,
      acceptedAt: new Date().toISOString(),
      version: import.meta.env.VITE_VOICE_CONSENT_VERSION || '2026-03-08-audio-consent',
    });
  };

  return (
    <section
      className="relative pt-32 pb-28 lg:pt-44 lg:pb-32 overflow-x-clip"
      id="receptionist"
    >
      <div className="absolute inset-0 dot-grid opacity-100 pointer-events-none" />

      <div
        className="absolute inset-x-0 top-0 h-[700px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(14,165,233,0.11) 0%, transparent 70%)',
        }}
      />

      <div
        className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, var(--bg-main), transparent)',
        }}
      />

      <div className="page-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center lg:text-left z-10"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7 border"
              style={{
                background: 'rgba(14, 165, 233, 0.07)',
                borderColor: 'rgba(14, 165, 233, 0.2)',
              }}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
              </span>
              <span className="text-[10.5px] font-bold tracking-[0.12em] uppercase text-brand-primary">
                {t.hero.tag}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold font-display tracking-[-0.03em] leading-[1.04] mb-6 text-text-primary">
              {t.hero.headline}{' '}
              <span className="text-gradient-danger">
                {t.hero.headlineHighlight}
              </span>
              .
            </h1>

            <p className="text-base lg:text-lg text-text-secondary mb-10 max-w-[480px] mx-auto lg:mx-0 leading-[1.7]">
              {t.hero.subheadline}
              <span className="text-text-primary font-medium block mt-2">
                {t.hero.payoff}
              </span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Button
                size="lg"
                className="w-full sm:w-auto"
                data-cal-link="reynubix-voice/let-s-talk"
                data-cal-namespace="let-s-talk"
                data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                onClick={() =>
                  trackEventFireAndForget('cta_click', {
                    location: 'hero_primary',
                    target: 'cal.com',
                    cta: 'book_demo',
                  })
                }
              >
                {t.hero.bookDemo} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="secondary" size="lg" className="w-full sm:w-auto group">
                <Play className="w-5 h-5 fill-current" />
                {t.hero.listenSample}
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center lg:justify-start gap-3">
              <div className="flex -space-x-2.5">
                {[
                  { initials: 'JR', bg: '#0EA5E9' },
                  { initials: 'SM', bg: '#8B5CF6' },
                  { initials: 'AK', bg: '#10B981' },
                  { initials: 'LP', bg: '#F59E0B' },
                ].map(({ initials, bg }) => (
                  <div
                    key={initials}
                    className="w-9 h-9 rounded-full border-2 shrink-0 flex items-center justify-center"
                    style={{ borderColor: 'var(--bg-main)', background: bg }}
                  >
                    <span className="text-[10px] font-bold text-white leading-none">
                      {initials}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5 mb-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      className="w-3.5 h-3.5 text-amber-400 fill-current"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs font-medium text-text-secondary">{t.hero.trustedBy}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 1.2,
              delay: 0.18,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="relative flex items-center justify-center"
            style={{ height: 'clamp(420px, 45vw, 600px)' }}
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute z-20"
              style={{ left: '-5%', top: '15%' }}
            >
              <div className="hero-float-card p-4 flex items-center gap-3 w-56">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: 'rgba(14, 165, 233, 0.15)',
                    color: '#0EA5E9',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-text-secondary leading-tight">
                    {t.hero.widget.booked}
                  </p>
                  <p className="text-sm font-bold text-text-primary leading-tight mt-0.5">
                    {t.hero.widget.time}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1,
              }}
              className="absolute z-20"
              style={{ right: '-8%', top: '55%' }}
            >
              <div className="hero-float-card p-4 flex items-center gap-3 w-56">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-base"
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                  }}
                >
                  {t.currency}
                </div>
                <div>
                  <p className="text-[10px] font-medium text-text-secondary leading-tight">
                    {t.hero.widget.saved}
                  </p>
                  <p className="text-base font-bold text-text-primary leading-tight mt-0.5">
                    {t.currency}12,450
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5,
              }}
              className="absolute z-20"
              style={{ right: '-2%', top: '18%' }}
            >
              <div className="hero-float-card px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 animate-pulse" />
                <p className="text-xs font-semibold text-text-primary whitespace-nowrap">
                  100% Answer Rate
                </p>
              </div>
            </motion.div>

            <PhoneDemo
              connected={connected}
              isConnecting={isConnecting}
              isAgentSpeaking={isAgentSpeaking}
              isUserSpeaking={isUserSpeaking}
              error={error}
              transcript={transcript}
              isLiveSession={isLiveSession}
              isReconnecting={gemini.isReconnecting}
              isGroqActive={isGroqActive}
              consentAccepted={consentAccepted}
              consentError={consentError}
              onConsentChange={(accepted) => {
                setConsentAccepted(accepted);
                if (accepted) setConsentError(null);
              }}
              onPhoneButtonClick={handlePhoneButtonClick}
            />

          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
