import { motion } from 'framer-motion';
import {
  ChevronRight,
  LoaderCircle,
  MicOff,
  Phone,
  PhoneOff,
  Play,
} from 'lucide-react';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { trackEventFireAndForget } from '../lib/telemetry/browser';
import { useLanguage } from '../contexts/LanguageContext';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useGroqFallback } from '../hooks/useGroqFallback';
import Button from './ui/Button';

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

  const latestTranscriptEntries = transcript
    .filter((entry) => entry.text.trim())
    .slice(-2);
  const isLiveSession = connected || isConnecting || gemini.isReconnecting;

  let phoneTitle = t.hero.live.idleTitle;
  let phoneSubtitle = t.hero.live.idleSubtitle;

  if (error) {
    phoneTitle = t.hero.live.errorTitle;
    phoneSubtitle = error;
  } else if (isConnecting) {
    phoneTitle = t.hero.live.connectingTitle;
    phoneSubtitle = t.hero.live.connectingSubtitle;
  } else if (connected) {
    phoneTitle = t.hero.live.connectedTitle;
    if (isAgentSpeaking) {
      phoneSubtitle = t.hero.live.speaking;
    } else if (isUserSpeaking) {
      phoneSubtitle = t.hero.live.listening;
    } else {
      phoneSubtitle = t.hero.live.connectedSubtitle;
    }
  }

  const centerButtonLabel = connected
    ? t.hero.live.endButtonLabel
    : t.hero.live.startButtonLabel;

  const centerButtonBackground = connected
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : isConnecting
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';

  const centerButtonShadow = connected
    ? '0 0 24px rgba(239, 68, 68, 0.45), 0 4px 12px rgba(0,0,0,0.3)'
    : isConnecting
      ? '0 0 24px rgba(245, 158, 11, 0.4), 0 4px 12px rgba(0,0,0,0.3)'
      : '0 0 20px rgba(34, 197, 94, 0.4), 0 4px 12px rgba(0,0,0,0.3)';

  const orbOuterGlow = error
    ? 'radial-gradient(circle, rgba(248,113,113,0.28) 0%, rgba(248,113,113,0.06) 42%, transparent 72%)'
    : isAgentSpeaking
      ? 'radial-gradient(circle, rgba(34,197,94,0.34) 0%, rgba(59,130,246,0.12) 42%, transparent 72%)'
      : isUserSpeaking
        ? 'radial-gradient(circle, rgba(56,189,248,0.3) 0%, rgba(56,189,248,0.1) 42%, transparent 72%)'
        : isLiveSession
          ? 'radial-gradient(circle, rgba(79,168,255,0.34) 0%, rgba(79,168,255,0.1) 42%, transparent 72%)'
          : 'radial-gradient(circle, rgba(79,168,255,0.22) 0%, rgba(79,168,255,0.06) 42%, transparent 72%)';

  const orbInnerGlow = error
    ? 'radial-gradient(circle, rgba(248,113,113,0.42) 0%, rgba(248,113,113,0.12) 54%, transparent 74%)'
    : isAgentSpeaking
      ? 'radial-gradient(circle, rgba(34,197,94,0.52) 0%, rgba(59,130,246,0.18) 54%, transparent 74%)'
      : isUserSpeaking
        ? 'radial-gradient(circle, rgba(56,189,248,0.45) 0%, rgba(56,189,248,0.14) 54%, transparent 74%)'
        : isLiveSession
          ? 'radial-gradient(circle, rgba(79,168,255,0.45) 0%, rgba(59,130,246,0.15) 54%, transparent 74%)'
          : 'radial-gradient(circle, rgba(79,168,255,0.35) 0%, rgba(59,130,246,0.12) 54%, transparent 74%)';

  const handlePhoneButtonClick = () => {
    if (connected) {
      groq.disconnect();
      gemini.disconnect();
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
    void gemini.connectToGemini();
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

            <motion.div
              animate={{ y: [0, -16, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-[280px] h-[560px] rounded-[2.5rem] overflow-hidden"
              style={{
                background:
                  'linear-gradient(145deg, #1a1a2e 0%, #0a0a0f 50%, #16162a 100%)',
                boxShadow: `
                  0 0 0 1px rgba(255,255,255,0.06),
                  0 0 0 3px #0a0a0f,
                  0 0 0 4px rgba(255,255,255,0.08),
                  0 25px 60px -12px rgba(0,0,0,0.7),
                  0 8px 20px rgba(0,0,0,0.4),
                  inset 0 1px 0 rgba(255,255,255,0.05)
                `,
              }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-10" />

              <div
                className="absolute inset-[3px] rounded-[2.3rem] overflow-hidden flex flex-col items-center justify-center px-6"
                style={{
                  background:
                    'linear-gradient(180deg, #0c0c14 0%, #060609 40%, #0a0a12 100%)',
                }}
              >
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      error
                        ? 'bg-red-400'
                        : isLiveSession
                          ? 'bg-green-400 animate-pulse'
                          : 'bg-[#4fa8ff]'
                    }`}
                  />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                    {isLiveSession ? t.hero.live.sessionLabel : t.hero.tag}
                  </span>
                </div>
                {isGroqActive && (
                  <div className="mb-2 text-[9px] text-amber-400 font-medium tracking-wider uppercase text-center">
                    Backup Mode Active
                  </div>
                )}
                {gemini.isReconnecting && (
                  <div className="mb-2 text-[9px] text-yellow-300/80 font-medium tracking-wider uppercase text-center animate-pulse">
                    Reconnecting...
                  </div>
                )}

                <div className="relative mb-5 flex h-40 w-40 items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full transition-all duration-500"
                    style={{
                      background: orbOuterGlow,
                      animation: isLiveSession
                        ? 'orbPulse 2.8s ease-in-out infinite'
                        : 'orbPulse 4.8s ease-in-out infinite',
                    }}
                  />
                  <div
                    className="absolute inset-4 rounded-full transition-all duration-500"
                    style={{
                      background: orbInnerGlow,
                      animation: isAgentSpeaking
                        ? 'orbPulse 1.3s ease-in-out infinite'
                        : 'orbPulse 3.2s ease-in-out infinite 0.35s',
                    }}
                  />
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i / 12) * Math.PI * 2;
                    const r = 55 + (i % 3) * 8;
                    const x = 50 + Math.cos(angle) * (r / 80) * 50;
                    const y = 50 + Math.sin(angle) * (r / 80) * 50;
                    const color = error
                      ? '#f87171'
                      : isAgentSpeaking
                        ? '#4ade80'
                        : '#4fa8ff';

                    return (
                      <div
                        key={`orb-particle-${angle.toFixed(2)}`}
                        className="absolute w-1 h-1 rounded-full"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          background: color,
                          opacity:
                            (isLiveSession ? 0.55 : 0.35) + (i % 3) * 0.12,
                          animation: `orbParticle ${isAgentSpeaking ? 1.3 : 2 + (i % 3)}s ease-in-out infinite ${i * 0.15}s`,
                        }}
                      />
                    );
                  })}
                  <div className="absolute inset-[22%] rounded-full border border-white/10 bg-white/[0.02]" />
                </div>

                <h2 className="text-white text-2xl font-bold mb-2 text-center">
                  {phoneTitle}
                </h2>

                <div className="mb-8 w-full max-w-[220px] rounded-[1.35rem] border border-white/10 bg-white/[0.03] px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                  {latestTranscriptEntries.length > 0 ? (
                    <div className="max-h-[112px] overflow-hidden space-y-3">
                      {latestTranscriptEntries.map((entry) => (
                        <div key={entry.id}>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4fa8ff]">
                            {entry.speaker === 'ai'
                              ? t.hero.widget.agent
                              : t.hero.live.userLabel}
                          </p>
                          <p className="mt-1 text-[11px] leading-[1.55] text-white/78">
                            {entry.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] leading-[1.6] text-white/72 text-center">
                      {error ? `${phoneSubtitle} ${t.hero.live.retry}` : phoneSubtitle}
                    </p>
                  )}
                </div>

                <div className="mb-5 w-full max-w-[240px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
                  <label className="flex items-start gap-3 text-[11px] leading-[1.5] text-white/80">
                    <input
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(event) => {
                        setConsentAccepted(event.target.checked);
                        if (event.target.checked) {
                          setConsentError(null);
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-white/25 bg-white/10 text-[#4fa8ff]"
                    />
                    <span>{t.hero.live.consentLabel}</span>
                  </label>
                  <p className="mt-2 text-[10px] text-white/50">
                    {t.hero.live.consentHelp}
                  </p>
                  {consentError ? (
                    <p className="mt-2 text-[10px] text-red-300">{consentError}</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-6">
                  <div
                    className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${
                      connected
                        ? 'bg-red-500/10 border-red-400/30 text-red-300'
                        : 'bg-[#1a1a1a] border-[#333] text-gray-400'
                    }`}
                  >
                    <PhoneOff size={20} />
                  </div>

                  <button
                    type="button"
                    onClick={handlePhoneButtonClick}
                    disabled={isConnecting}
                    aria-label={centerButtonLabel}
                    aria-busy={isConnecting}
                    aria-pressed={connected}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-transform duration-200 disabled:cursor-wait disabled:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060b]"
                    style={{
                      background: centerButtonBackground,
                      boxShadow: centerButtonShadow,
                      animation:
                        connected || isConnecting
                          ? 'none'
                          : 'phoneBtnPulse 2s ease-in-out infinite',
                    }}
                  >
                    {isConnecting ? (
                      <LoaderCircle size={28} className="animate-spin" />
                    ) : connected ? (
                      <PhoneOff size={28} />
                    ) : (
                      <Phone size={28} />
                    )}
                  </button>

                  <div
                    className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${
                      isUserSpeaking
                        ? 'bg-sky-500/12 border-sky-400/30 text-sky-300'
                        : 'bg-[#1a1a1a] border-[#333] text-gray-400'
                    }`}
                  >
                    <MicOff size={20} />
                  </div>
                </div>
              </div>
            </motion.div>

            <style>{`
              @keyframes orbPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.15); opacity: 0.7; }
              }
              @keyframes orbParticle {
                0%, 100% { transform: translateY(0) scale(1); opacity: 0.45; }
                50% { transform: translateY(-4px) scale(1.3); opacity: 0.9; }
              }
              @keyframes phoneBtnPulse {
                0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.4), 0 4px 12px rgba(0,0,0,0.3); }
                50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.6), 0 4px 16px rgba(0,0,0,0.4); }
              }
            `}</style>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
