import React from 'react';
import { motion } from 'framer-motion';
import { Play, ChevronRight, MicOff } from 'lucide-react';
import Button from './ui/Button';
import { useLanguage } from '../contexts/LanguageContext';
import { ThreePhone } from './ThreePhone';

const Hero: React.FC = () =>
{
  const { t } = useLanguage();
  const [isCalling, setIsCalling] = React.useState(false);

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
              <Button size="lg" className="w-full sm:w-auto group" onClick={() => setIsCalling(!isCalling)}>
                {isCalling ? <MicOff className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                {isCalling ? "End Demo" : t.hero.listenSample}
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

          {/* ── Right: ThreePhone mockup ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative h-[640px] flex items-center justify-center overflow-visible"
          >
            <ThreePhone isCalling={isCalling} setIsCalling={setIsCalling} t={t} />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;