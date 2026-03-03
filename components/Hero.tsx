import { motion } from 'framer-motion';
import { Play, ChevronRight, Phone, PhoneOff, MicOff } from 'lucide-react';
import Button from './ui/Button';
import { useLanguage } from '../contexts/LanguageContext';

const Hero: React.FC = () =>
{
  const { t } = useLanguage();

  return (
    <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-28 overflow-x-clip" id="receptionist">

      {/* Dot-grid background */}
      <div className="absolute inset-0 dot-grid opacity-100 pointer-events-none" />

      {/* Top radial glow */}
      <div className="absolute inset-x-0 top-0 h-[700px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(14,165,233,0.11) 0%, transparent 70%)' }} />

      {/* Bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--bg-main), transparent)' }} />

      <div className="page-container relative z-10">
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
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold font-display tracking-[-0.03em] leading-[1.04] mb-6 text-text-primary">
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
              <Button size="lg" className="w-full sm:w-auto group">
                <Play className="w-5 h-5 fill-current" />
                {t.hero.listenSample}
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

          {/* ── Right: CSS Phone Mockup ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative flex items-center justify-center"
            style={{ height: 'clamp(420px, 45vw, 600px)' }}
          >
            {/* Floating card: Appointment Booked */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute z-20"
              style={{ left: '-5%', top: '15%' }}
            >
              <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 flex items-center gap-3 w-56">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#0EA5E9' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-300 leading-tight">{t.hero.widget.booked}</p>
                  <p className="text-sm font-bold text-white leading-tight mt-0.5">{t.hero.widget.time}</p>
                </div>
              </div>
            </motion.div>

            {/* Floating card: Revenue Saved */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute z-20"
              style={{ right: '-8%', top: '55%' }}
            >
              <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 flex items-center gap-3 w-56">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-base"
                  style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>{t.currency}</div>
                <div>
                  <p className="text-[10px] font-medium text-gray-300 leading-tight">{t.hero.widget.saved}</p>
                  <p className="text-base font-bold text-white leading-tight mt-0.5">{t.currency}12,450</p>
                </div>
              </div>
            </motion.div>

            {/* Floating card: 100% Answer Rate */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute z-20"
              style={{ right: '-2%', top: '18%' }}
            >
              <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 animate-pulse" />
                <p className="text-xs font-semibold text-white whitespace-nowrap">100% Answer Rate</p>
              </div>
            </motion.div>

            {/* Phone mockup */}
            <motion.div
              animate={{ y: [0, -16, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-[280px] h-[560px] rounded-[2.5rem] overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #1a1a2e 0%, #0a0a0f 50%, #16162a 100%)',
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
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-10" />

              {/* Screen */}
              <div className="absolute inset-[3px] rounded-[2.3rem] overflow-hidden flex flex-col items-center justify-center"
                style={{ background: 'linear-gradient(180deg, #0c0c14 0%, #060609 40%, #0a0a12 100%)' }}
              >
                {/* Orb glow */}
                <div className="relative w-40 h-40 mb-8">
                  <div className="absolute inset-0 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(79,168,255,0.3) 0%, rgba(79,168,255,0.08) 40%, transparent 70%)',
                      animation: 'orbPulse 3s ease-in-out infinite',
                    }}
                  />
                  <div className="absolute inset-4 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(79,168,255,0.5) 0%, rgba(59,130,246,0.15) 50%, transparent 70%)',
                      animation: 'orbPulse 3s ease-in-out infinite 0.5s',
                    }}
                  />
                  {/* Particle dots */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i / 12) * Math.PI * 2;
                    const r = 55 + (i % 3) * 8;
                    const x = 50 + Math.cos(angle) * (r / 80) * 50;
                    const y = 50 + Math.sin(angle) * (r / 80) * 50;
                    return (
                      <div
                        key={`orb-particle-${angle.toFixed(2)}`}
                        className="absolute w-1 h-1 rounded-full"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          background: '#4fa8ff',
                          opacity: 0.4 + (i % 3) * 0.2,
                          animation: `orbParticle ${2 + (i % 3)}s ease-in-out infinite ${i * 0.15}s`,
                        }}
                      />
                    );
                  })}
                </div>

                {/* Text */}
                <h2 className="text-white text-2xl font-bold mb-2">Start Demo</h2>
                <p className="text-[#4fa8ff] text-xs tracking-[0.2em] uppercase font-semibold mb-10">Tap to connect</p>

                {/* Bottom controls */}
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-gray-400">
                    <PhoneOff size={20} />
                  </div>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-white cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.4), 0 4px 12px rgba(0,0,0,0.3)',
                      animation: 'phoneBtnPulse 2s ease-in-out infinite',
                    }}
                  >
                    <Phone size={28} />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-gray-400">
                    <MicOff size={20} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Keyframe animations */}
            <style>{`
              @keyframes orbPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.15); opacity: 0.7; }
              }
              @keyframes orbParticle {
                0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
                50% { transform: translateY(-4px) scale(1.3); opacity: 0.8; }
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
