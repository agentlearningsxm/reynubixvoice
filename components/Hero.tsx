import { motion, useReducedMotion } from 'framer-motion';
import {
  ChevronRight,
  LoaderCircle,
  MicOff,
  Phone,
  PhoneOff,
} from 'lucide-react';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { trackEventFireAndForget } from '../lib/telemetry/browser';
import Button from './ui/Button';
import VoiceOrb from './ui/VoiceOrb';

const CalendarIcon = ({
  size = 14,
  className = '',
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const Hero: React.FC = () => {
  const { t } = useLanguage();
  const gemini = useGeminiLive();
  const shouldReduceMotion = useReducedMotion();
  const connected = gemini.connected;
  const isConnecting = gemini.isConnecting;
  const isAgentSpeaking = gemini.isAgentSpeaking;
  const isUserSpeaking = gemini.isUserSpeaking;
  const error = gemini.error;
  const transcript = gemini.transcript;

  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      gemini.disconnect();
    };
  }, [gemini.disconnect]);

  const latestTranscriptEntries = transcript
    .filter((entry) => entry.text.trim())
    .slice(-3);

  const isLiveSession = connected || isConnecting || gemini.isReconnecting;

  // Phone title / subtitle
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
    if (isAgentSpeaking) phoneSubtitle = t.hero.live.speaking;
    else if (isUserSpeaking) phoneSubtitle = t.hero.live.listening;
    else phoneSubtitle = t.hero.live.connectedSubtitle;
  }

  const centerBtnBg = connected
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : isConnecting
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';

  const centerBtnShadow = connected
    ? '0 0 24px rgba(239,68,68,0.5), 0 4px 12px rgba(0,0,0,0.35)'
    : isConnecting
      ? '0 0 24px rgba(245,158,11,0.45), 0 4px 12px rgba(0,0,0,0.3)'
      : '0 0 22px rgba(34,197,94,0.45), 0 4px 12px rgba(0,0,0,0.3)';

  // Edge glow -bleeds through phone bezels
  const glowColor = error
    ? '239,68,68'
    : isAgentSpeaking
      ? '34,197,94'
      : isUserSpeaking
        ? '56,189,248'
        : isLiveSession
          ? '79,168,255'
          : '0,0,0';

  const glowOpacity = error
    ? 0.65
    : isAgentSpeaking
      ? 0.7
      : isUserSpeaking
        ? 0.55
        : isLiveSession
          ? 0.4
          : 0;

  const phoneBoxShadow = [
    '0 0 0 1px rgba(255,255,255,0.06)',
    '0 0 0 3px #0a0a0f',
    '0 0 0 4px rgba(255,255,255,0.09)',
    '0 28px 64px -12px rgba(0,0,0,0.75)',
    '0 8px 24px rgba(0,0,0,0.45)',
    'inset 0 1px 0 rgba(255,255,255,0.06)',
    ...(glowOpacity > 0
      ? [
          `0 0 55px rgba(${glowColor},${glowOpacity * 0.8})`,
          `0 0 110px rgba(${glowColor},${glowOpacity * 0.4})`,
          `0 0 180px rgba(${glowColor},${glowOpacity * 0.18})`,
        ]
      : []),
  ].join(', ');

  const handlePhoneButtonClick = () => {
    if (connected) {
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
      className="relative pt-12 sm:pt-16 md:pt-20 lg:pt-24 pb-16 sm:pb-24 lg:pb-32 overflow-x-clip"
      id="receptionist"
    >
      {/* Grid provided by full-page square-grid in App.tsx -no local grid needed */}

      <div
        className="absolute inset-x-0 top-0 h-[400px] sm:h-[550px] lg:h-[700px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(200,169,96,0.11) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, var(--bg-main), transparent)',
        }}
      />

      <div className="page-container relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 sm:gap-8 md:gap-12 lg:gap-12 items-start">
          {/* ── Left: copy ── */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center lg:text-left z-10 min-w-0"
          >
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7 border"
              style={{
                background: 'rgba(200,169,96,0.07)',
                borderColor: 'rgba(200,169,96,0.2)',
              }}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary" />
              </span>
              <span className="text-[10.5px] font-bold tracking-[0.12em] uppercase text-brand-primary">
                {t.hero.tag}
              </span>
            </div>

            <h1 className="text-3xl xs:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold font-display tracking-[-0.03em] leading-tight xs:leading-snug mb-5 xs:mb-6 text-text-primary">
              {t.hero.headline}{' '}
              <span className="text-gradient-danger">
                {t.hero.headlineHighlight}
              </span>
              .
            </h1>

            <p className="text-sm xs:text-base lg:text-lg text-text-muted-strong mb-6 xs:mb-8 lg:mb-10 max-w-[480px] mx-auto lg:mx-0 leading-[1.65]">
              {t.hero.subheadline}
              <span className="text-text-primary font-medium block mt-2">
                {t.hero.payoff}
              </span>
            </p>

            <div className="flex items-center justify-center lg:justify-start">
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
            </div>

            {/* ── Mobile stat strip -visible below md ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex md:hidden flex-wrap gap-3 sm:gap-4 mt-6 sm:mt-10 pb-2 justify-center"
            >
              {[
                {
                  icon: (
                    <CalendarIcon size={14} className="text-brand-primary" />
                  ),
                  value: t.hero.widget.time,
                  label: t.hero.widget.booked,
                },
                {
                  icon: (
                    <span className="text-sm font-bold text-green-400">
                      {t.currency}
                    </span>
                  ),
                  value: `${t.currency}12,450`,
                  label: t.hero.widget.saved,
                },
                {
                  icon: (
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  ),
                  value: '100%',
                  label: 'Answer Rate',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full bg-bg-glass/80 backdrop-blur-sm border border-border-subtle text-sm"
                >
                  <span className="flex items-center justify-center">
                    {stat.icon}
                  </span>
                  <span className="font-semibold text-text-primary whitespace-nowrap">
                    {stat.value}
                  </span>
                  <span className="text-text-muted-strong whitespace-nowrap text-xs">
                    {stat.label}
                  </span>
                </div>
              ))}
            </motion.div>

            <div className="mt-8 flex items-center justify-center lg:justify-start gap-3">
              <div className="flex -space-x-2.5">
                {[
                  { initials: 'JR', bg: '#c8a960' },
                  { initials: 'SM', bg: '#a07d4f' },
                  { initials: 'AK', bg: '#8faa6b' },
                  { initials: 'LP', bg: '#c47d5a' },
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
                  {[1, 2, 3, 4, 5].map((starNumber) => (
                    <svg
                      key={`hero-star-${starNumber}`}
                      className="w-3.5 h-3.5 text-amber-400 fill-current"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs font-medium text-text-muted-strong">
                  {t.hero.trustedBy}
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Right: phone mockup ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 1.2,
              delay: 0.18,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="relative flex items-center justify-center mt-12 md:mt-12 lg:mt-0 z-30"
            style={{ height: 'clamp(500px, 80vw, 600px)' }}
          >
            {/* ─── Floating card -Appointment ─── */}
            <motion.div
              animate={shouldReduceMotion ? false : { y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute z-20 hidden md:block"
              style={{ left: '-5%', top: '15%' }}
            >
              <div className="hero-float-card hero-float-card--enhanced p-4 flex items-center gap-3 w-56">
                <div
                  className="hero-float-icon hero-float-icon--blue shrink-0"
                  aria-hidden="true"
                >
                  <CalendarIcon size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-text-muted-strong leading-tight">
                    {t.hero.widget.booked}
                  </p>
                  <p className="text-sm font-bold text-text-primary leading-tight mt-0.5">
                    {t.hero.widget.time}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ─── Floating card -Revenue saved ─── */}
            <motion.div
              animate={shouldReduceMotion ? false : { y: [0, -10, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 1,
              }}
              className="absolute z-20 hidden md:block"
              style={{ right: '-8%', top: '55%' }}
            >
              <div className="hero-float-card hero-float-card--enhanced p-4 flex items-center gap-3 w-56">
                <div className="hero-float-icon hero-float-icon--green shrink-0 font-bold text-base">
                  {t.currency}
                </div>
                <div>
                  <p className="text-[10px] font-medium text-text-muted-strong leading-tight">
                    {t.hero.widget.saved}
                  </p>
                  <p className="text-base font-bold text-text-primary leading-tight mt-0.5">
                    {t.currency}12,450
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ─── Floating card -Answer rate ─── */}
            <motion.div
              animate={shouldReduceMotion ? false : { y: [0, -8, 0] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5,
              }}
              className="absolute z-20 hidden md:block"
              style={{ right: '-2%', top: '18%' }}
            >
              <div className="hero-float-card hero-float-card--enhanced px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 animate-pulse" />
                <p className="text-xs font-semibold text-text-primary whitespace-nowrap">
                  100% Answer Rate
                </p>
              </div>
            </motion.div>

            {/* ─── Phone: wrapper (floating animation + glow) ─── */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative scale-[0.82] xs:scale-[0.88] sm:scale-[0.92] md:scale-[0.95] lg:scale-100 origin-center"
            >
              {/* Edge glow behind phone -the "backlit through edges" effect */}
              <div
                className="absolute pointer-events-none transition-all duration-700"
                style={{
                  inset: '-10px',
                  borderRadius: '2.8rem',
                  background:
                    glowOpacity > 0
                      ? `radial-gradient(ellipse 80% 85% at 50% 50%, rgba(${glowColor},${glowOpacity * 0.5}) 0%, rgba(${glowColor},${glowOpacity * 0.2}) 50%, transparent 78%)`
                      : 'transparent',
                  filter: 'blur(22px)',
                  zIndex: 0,
                }}
              />

              {/* Phone body */}
              <div
                className="hero-phone-bg relative w-[280px] h-[560px] rounded-[2.5rem] overflow-hidden transition-shadow duration-700"
                style={{ boxShadow: phoneBoxShadow, zIndex: 1 }}
              >
                {/* Dynamic notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-10" />

                {/* Screen interior */}
                <div className="hero-phone-screen-bg absolute inset-[3px] rounded-[2.3rem] overflow-hidden flex flex-col items-center px-4 xs:px-5">
                  {/* ── Status pill ── */}
                  <div className="mt-6 xs:mt-10 mb-2 xs:mb-3 inline-flex items-center gap-1.5 xs:gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 xs:px-3 xs:py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
                    <span
                      className={`h-1.5 w-1.5 xs:h-2 xs:w-2 rounded-full ${
                        error
                          ? 'bg-red-400'
                          : isLiveSession
                            ? 'bg-green-400 animate-pulse'
                            : 'bg-[#c8a960]'
                      }`}
                    />
                    <span className="text-[7px] xs:text-[9px] uppercase tracking-[0.12em] text-white/78">
                      {isLiveSession ? t.hero.live.sessionLabel : t.hero.tag}
                    </span>
                  </div>

                  {gemini.isReconnecting && (
                    <div className="mb-1 text-[7px] xs:text-[9px] text-yellow-300/80 font-medium tracking-wider uppercase text-center animate-pulse">
                      {t.hero.live.reconnecting}
                    </div>
                  )}

                  {/* ── Central area: orb OR live transcript (crossfade) ── */}
                  <div className="relative flex-1 w-full flex flex-col items-center justify-center">
                    {/* PRE-CALL: orb + title */}
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${connected ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
                    >
                      {/* Orb -scaled down on mobile */}
                      <div className="flex items-center justify-center scale-[0.7] xs:scale-[0.8] sm:scale-100 origin-center">
                        <VoiceOrb
                          isActive={isLiveSession}
                          isSpeaking={isAgentSpeaking}
                          isUserSpeaking={isUserSpeaking}
                          isVisible={!connected}
                          hasError={!!error}
                        />
                      </div>
                      {/* Phone title -hidden on mobile */}
                      <h2 className="hidden xs:block text-white text-base xs:text-xl font-bold text-center -mt-1 xs:-mt-2 px-2">
                        {phoneTitle}
                      </h2>
                      <p className="hidden xs:block text-white/62 text-[9px] xs:text-[11px] text-center mt-0.5 xs:mt-1 px-3 xs:px-4 leading-relaxed">
                        {!error
                          ? phoneSubtitle
                          : `${phoneSubtitle} ${t.hero.live.retry}`}
                      </p>
                    </div>

                    {/* IN-CALL: live transcript (takes full central space) */}
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-start pt-1.5 xs:pt-2 transition-all duration-700 px-1.5 xs:px-2 ${connected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    >
                      {/* Speaker state indicator */}
                      <div className="mb-2 xs:mb-4 flex items-center gap-1.5 xs:gap-2">
                        {isAgentSpeaking && (
                          <div className="flex items-center gap-1 xs:gap-1.5 rounded-full bg-green-500/12 border border-green-400/20 px-2 xs:px-3 py-0.5 xs:py-1">
                            <span className="w-1 h-1 xs:w-1.5 xs:h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-[7px] xs:text-[10px] text-green-300 font-semibold uppercase tracking-wider">
                              {t.hero.live.speaking}
                            </span>
                          </div>
                        )}
                        {isUserSpeaking && (
                          <div className="flex items-center gap-1 xs:gap-1.5 rounded-full bg-amber-500/12 border border-amber-400/20 px-2 xs:px-3 py-0.5 xs:py-1">
                            <span className="w-1 h-1 xs:w-1.5 xs:h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-[7px] xs:text-[10px] text-amber-300 font-semibold uppercase tracking-wider">
                              {t.hero.live.listening}
                            </span>
                          </div>
                        )}
                        {!isAgentSpeaking && !isUserSpeaking && (
                          <div className="flex items-center gap-1 xs:gap-1.5 rounded-full bg-white/[0.04] border border-white/10 px-2 xs:px-3 py-0.5 xs:py-1">
                            <span className="w-1 h-1 xs:w-1.5 xs:h-1.5 rounded-full bg-white/30" />
                            <span className="text-[7px] xs:text-[10px] text-white/58 font-medium uppercase tracking-wider">
                              {t.hero.live.connectedSubtitle}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Transcript lines */}
                      <div className="w-full flex-1 overflow-y-auto space-y-2 xs:space-y-3 px-0.5 xs:px-1 flex flex-col justify-end">
                        {latestTranscriptEntries.length > 0 ? (
                          latestTranscriptEntries.map((entry) => {
                            const isAgent = entry.speaker === 'ai';
                            return (
                              <div
                                key={entry.id}
                                className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
                              >
                                <span
                                  className={`text-[7px] xs:text-[9px] font-bold uppercase tracking-[0.18em] mb-0.5 xs:mb-1 ${isAgent ? 'text-green-400' : 'text-amber-400'}`}
                                >
                                  {isAgent
                                    ? t.hero.widget.agent
                                    : t.hero.live.userLabel}
                                </span>
                                <div
                                  className={`max-w-[94%] xs:max-w-[92%] rounded-2xl px-2 xs:px-3 py-1.5 xs:py-2 text-[9px] xs:text-[11px] leading-[1.55] text-white/80 border ${isAgent ? 'bg-[rgba(74,222,128,0.08)] border-[rgba(74,222,128,0.15)]' : 'bg-[rgba(200,169,96,0.08)] border-[rgba(200,169,96,0.15)]'}`}
                                >
                                  {entry.text}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="hidden xs:block text-center">
                            <p className="text-[9px] xs:text-[11px] text-white/56 leading-relaxed">
                              {phoneSubtitle}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Consent box (pre-call only) ── */}
                  <div
                    className={`w-full max-w-[240px] xs:max-w-[260px] sm:max-w-[280px] overflow-hidden transition-all duration-500 ${connected ? 'opacity-0 max-h-0' : 'opacity-100 max-h-[120px]'}`}
                  >
                    <div className="mb-2 xs:mb-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 xs:px-4 py-2 xs:py-3 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
                      <label className="flex items-start gap-2 xs:gap-3 text-[8px] xs:text-[11px] leading-[1.45] xs:leading-[1.5] text-white/80">
                        <input
                          type="checkbox"
                          checked={consentAccepted}
                          onChange={(event) => {
                            setConsentAccepted(event.target.checked);
                            if (event.target.checked) setConsentError(null);
                          }}
                          className="mt-0.5 h-3.5 w-3.5 xs:h-4 xs:w-4 rounded border-white/25 bg-white/10 text-[#c8a960]"
                        />
                        <span>{t.hero.live.consentLabel}</span>
                      </label>
                      <p className="mt-1 xs:mt-2 text-[7px] xs:text-[10px] text-white/64">
                        {t.hero.live.consentHelp}
                      </p>
                      {consentError ? (
                        <p className="mt-1 xs:mt-2 text-[7px] xs:text-[10px] text-red-300">
                          {consentError}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* ── Call buttons ── */}
                  <div className="mb-5 xs:mb-8 flex items-center gap-2 xs:gap-3 sm:gap-4 md:gap-6">
                    <div
                      className={`w-10 h-10 xs:w-12 xs:h-12 rounded-full border flex items-center justify-center transition-all duration-300 ${
                        connected
                          ? 'bg-red-500/10 border-red-400/30 text-red-300'
                          : 'bg-white/[0.04] border-white/10 text-white/30'
                      }`}
                    >
                      <PhoneOff size={16} className="xs:hidden" />
                      <PhoneOff size={18} className="hidden xs:block" />
                    </div>

                    <button
                      type="button"
                      onClick={handlePhoneButtonClick}
                      disabled={isConnecting}
                      aria-label={
                        connected
                          ? t.hero.live.endButtonLabel
                          : t.hero.live.startButtonLabel
                      }
                      aria-busy={isConnecting ? 'true' : 'false'}
                      aria-pressed={connected ? 'true' : 'false'}
                      className="w-14 h-14 xs:w-16 xs:h-16 rounded-full flex items-center justify-center text-white transition-transform duration-200 hover:scale-105 active:scale-95 disabled:cursor-wait disabled:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060b]"
                      style={{
                        background: centerBtnBg,
                        boxShadow: centerBtnShadow,
                        animation:
                          connected || isConnecting
                            ? 'none'
                            : 'phoneBtnPulse 2s ease-in-out infinite',
                      }}
                    >
                      {isConnecting ? (
                        <LoaderCircle size={22} className="animate-spin xs:hidden" />
                      ) : connected ? (
                        <PhoneOff size={22} className="xs:hidden" />
                      ) : (
                        <Phone size={22} className="xs:hidden" />
                      )}
                      {isConnecting ? (
                        <LoaderCircle size={26} className="hidden animate-spin xs:block" />
                      ) : connected ? (
                        <PhoneOff size={26} className="hidden xs:block" />
                      ) : (
                        <Phone size={26} className="hidden xs:block" />
                      )}
                    </button>

                    <div
                      className={`w-10 h-10 xs:w-12 xs:h-12 rounded-full border flex items-center justify-center transition-all duration-300 ${
                        isUserSpeaking
                          ? 'bg-amber-500/12 border-amber-400/30 text-amber-300'
                          : 'bg-white/[0.04] border-white/10 text-white/30'
                      }`}
                    >
                      <MicOff size={16} className="xs:hidden" />
                      <MicOff size={18} className="hidden xs:block" />
                    </div>
                  </div>
                </div>
                {/* end screen interior */}
              </div>
              {/* end phone body */}
            </motion.div>
            {/* end phone wrapper */}
          </motion.div>
          {/* end right column */}
        </div>
      </div>

      <style>{`
        @keyframes phoneBtnPulse {
          0%,100% { box-shadow: 0 0 22px rgba(34,197,94,0.45), 0 4px 12px rgba(0,0,0,0.3); }
          50%      { box-shadow: 0 0 36px rgba(34,197,94,0.7),  0 4px 18px rgba(0,0,0,0.4); }
        }
      `}</style>
    </section>
  );
};

export default Hero;
