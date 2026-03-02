import React from 'react';
import { motion } from 'framer-motion';
import { Play, Calendar, ChevronRight, PhoneCall, Mic, MicOff, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import VoiceOrb from './ui/VoiceOrb';
import { useLanguage } from '../contexts/LanguageContext';
import { useGeminiLive } from '../hooks/useGeminiLive';

const Hero: React.FC = () =>
{
  const { t } = useLanguage();
  const { connected, isAgentSpeaking, isUserSpeaking, error, connectToGemini, disconnect } = useGeminiLive();

  return (
    <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 overflow-hidden" id="receptionist">

      {/* Dot-grid background */}
      <div className="absolute inset-0 dot-grid opacity-100 pointer-events-none" />

      {/* Top radial glow */}
      <div className="absolute inset-x-0 top-0 h-[700px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(14,165,233,0.11) 0%, transparent 70%)' }} />

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--bg-main), transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">

          {/* ── Left: Copy ── */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center lg:text-left z-10"
          >
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7 border"
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

            {/* Headline */}
            <h1 className="text-[3.2rem] lg:text-[4.25rem] xl:text-[4.75rem] font-bold font-display tracking-[-0.03em] leading-[1.04] mb-6 text-text-primary">
              {t.hero.headline}{' '}
              <span className="text-gradient-danger">{t.hero.headlineHighlight}</span>.
            </h1>

            {/* Subheadline */}
            <p className="text-base lg:text-lg text-text-secondary mb-9 max-w-[480px] mx-auto lg:mx-0 leading-[1.7]">
              {t.hero.subheadline}
              <span className="text-text-primary font-medium block mt-2">{t.hero.payoff}</span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Button size="lg" className="w-full sm:w-auto group" onClick={connected ? disconnect : connectToGemini}>
                {connected ? <MicOff className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                {connected ? "End Demo" : t.hero.listenSample}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
                data-cal-link="reynubix-voice/let-s-talk"
                data-cal-namespace="let-s-talk"
                data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
              >
                {t.hero.bookDemo} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {error && (
              <div className="mt-4 flex items-center justify-center lg:justify-start gap-2 text-money-loss text-sm font-medium">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Social proof */}
            <div className="mt-9 flex items-center justify-center lg:justify-start gap-3 text-sm text-text-secondary">
              <div className="flex -space-x-2.5">
                {[
                  { initials: 'JR', bg: '#0EA5E9' },
                  { initials: 'SM', bg: '#8B5CF6' },
                  { initials: 'AK', bg: '#10B981' },
                  { initials: 'LP', bg: '#F59E0B' },
                ].map(({ initials, bg }) => (
                  <div key={initials} className="w-8 h-8 rounded-full border-2 shrink-0 flex items-center justify-center"
                    style={{ borderColor: 'var(--bg-main)', background: bg }}>
                    <span className="text-[10px] font-bold text-white leading-none">{initials}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium">{t.hero.trustedBy}</p>
            </div>
          </motion.div>

          {/* ── Right: Phone mockup ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative lg:h-[640px] flex items-center justify-center"
          >
            {/* Layered glow behind phone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, rgba(99,102,241,0.06) 55%, transparent 75%)' }} />

            {/* Decorative orbit rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
              style={{ border: '1px solid rgba(14, 165, 233, 0.07)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
              style={{ border: '1px solid rgba(255, 255, 255, 0.025)' }} />

            {/* Phone mockup */}
            <motion.div
              animate={{ y: [0, -18, 0] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-[300px] h-[620px] rounded-[3rem] overflow-hidden z-10"
              style={{
                background: 'linear-gradient(145deg, #141424 0%, #080810 55%, #10101e 100%)',
                boxShadow: `
                  0 0 0 1px rgba(255,255,255,0.07),
                  0 0 0 3px #080810,
                  0 0 0 4px rgba(255,255,255,0.05),
                  0 30px 70px -15px rgba(0,0,0,0.8),
                  0 10px 24px rgba(0,0,0,0.5),
                  0 0 100px -20px rgba(14, 165, 233, 0.12),
                  inset 0 1px 0 rgba(255,255,255,0.06)
                `,
              }}
            >
              {/* Side buttons */}
              <div className="absolute right-[-1px] top-[120px] w-[3px] h-[40px] rounded-l-sm"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.04))' }} />
              <div className="absolute right-[-1px] top-[175px] w-[3px] h-[60px] rounded-l-sm"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))' }} />
              <div className="absolute left-[-1px] top-[155px] w-[3px] h-[35px] rounded-r-sm"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))' }} />

              {/* Dynamic Island */}
              <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-full z-20 flex items-center justify-center gap-2"
                style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)' }}>
                <div className="w-[9px] h-[9px] rounded-full bg-[#141424] border border-[#1e1e30]" />
                <div className="w-[5px] h-[5px] rounded-full bg-[#0a0a14]" />
              </div>

              {/* Screen */}
              <div className="w-full h-full flex flex-col relative"
                style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #050508 40%, #080810 100%)' }}>

                {/* Voice area */}
                <div className="flex-1 flex flex-col items-center justify-center pt-16 pb-8 px-6">
                  <div className="w-52 h-52 flex items-center justify-center mb-7 relative">
                    <VoiceOrb isActive={connected} isSpeaking={isAgentSpeaking} isUserSpeaking={isUserSpeaking} />
                  </div>
                  <h3 className="text-xl font-semibold text-white/90 mb-1.5 tracking-wide font-display">
                    {connected ? 'Reyna' : 'Start Demo'}
                  </h3>
                  <p className="text-[10.5px] text-white/35 font-mono tracking-[0.22em] uppercase">
                    {connected ? (isAgentSpeaking ? '● Speaking' : '● Listening') : 'Tap to Connect'}
                  </p>
                </div>

                {/* Controls */}
                <div className="h-28 flex items-center justify-around px-8 pb-6"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.018) 100%)',
                    borderTop: '1px solid rgba(255,255,255,0.035)'
                  }}>
                  <button
                    onClick={disconnect}
                    disabled={!connected}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
                    style={{
                      background: connected ? 'rgba(239, 68, 68, 0.13)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${connected ? 'rgba(239, 68, 68, 0.28)' : 'rgba(255,255,255,0.05)'}`,
                      color: connected ? '#ef4444' : 'rgba(255,255,255,0.18)',
                    }}
                  >
                    <PhoneCall className="w-5 h-5 rotate-[135deg]" />
                  </button>

                  <button
                    onClick={connected ? disconnect : connectToGemini}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                    style={{
                      background: !connected
                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                        : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                      boxShadow: !connected
                        ? '0 0 24px rgba(34, 197, 94, 0.45), 0 4px 14px rgba(0,0,0,0.35)'
                        : '0 4px 14px rgba(0,0,0,0.35)',
                      color: !connected ? 'white' : '#0f172a',
                      animation: !connected ? 'phone-btn-pulse 2s ease-in-out infinite' : 'none',
                    }}
                  >
                    {connected ? <Mic className="w-7 h-7" /> : <PhoneCall className="w-7 h-7" />}
                  </button>

                  <button className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <MicOff className="w-5 h-5" />
                  </button>
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-[3px] rounded-full bg-white/[0.08]" />
              </div>

            </motion.div>

            {/* Floating widget — top right: revenue saved */}
            <motion.div
              animate={{ y: [0, 14, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-16 right-[-8px] lg:right-0 glass-card px-4 py-3 rounded-2xl flex items-center gap-3 z-20 max-w-[195px]"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset' }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-base"
                style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                {t.currency}
              </div>
              <div>
                <p className="text-[10px] font-medium text-text-secondary leading-tight">{t.hero.widget.saved}</p>
                <p className="text-base font-bold text-text-primary leading-tight mt-0.5">{t.currency}12,450</p>
              </div>
            </motion.div>

            {/* Floating widget — left: appointment booked */}
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-36 left-[-24px] lg:left-[-28px] glass-card px-4 py-3 rounded-2xl flex items-center gap-3 z-20"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset' }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#0EA5E9' }}>
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-text-secondary leading-tight">{t.hero.widget.booked}</p>
                <p className="text-sm font-bold text-text-primary leading-tight mt-0.5">{t.hero.widget.time}</p>
              </div>
            </motion.div>

            {/* Floating widget — bottom right: calls answered */}
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute bottom-12 right-[-4px] lg:right-2 glass-card px-4 py-3 rounded-2xl flex items-center gap-3 z-20"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset' }}
            >
              <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 animate-pulse" />
              <p className="text-xs font-semibold text-text-primary whitespace-nowrap">100% Answer Rate</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;