import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import Logo from './Logo';

const Footer: React.FC = () =>
{
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-bg-main">

      {/* CTA Banner — Premium */}
      <div className="relative overflow-hidden border-b border-border py-16 md:py-20">
        {/* Ambient glow layers */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 80% at 50% 120%, rgba(14,165,233,0.13), transparent 70%)' }} />
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Eyebrow */}
          <div className="flex justify-center mb-5">
            <span className="section-eyebrow">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
              </span>
              Taking Bookings Now
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display tracking-[-0.03em] text-text-primary mb-4 leading-[1.1]">
            Every missed call is a<br />
            <span className="text-gradient">missed opportunity.</span>
          </h2>

          {/* Sub-copy */}
          <p className="text-text-secondary text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
            Your AI receptionist answers 24/7 — before your competitor does.
          </p>

          {/* CTA Button */}
          <a
            data-cal-link="reynubix-voice/let-s-talk"
            data-cal-namespace="let-s-talk"
            data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-semibold text-[15px] cursor-pointer transition-all hover:scale-[1.025] active:scale-[0.975]"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
              boxShadow: '0 0 28px rgba(14,165,233,0.30), 0 4px 16px rgba(0,0,0,0.35)'
            }}
          >
            Book a Free Demo
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>

          {/* Trust micro-copy */}
          <p className="mt-4 text-xs text-text-secondary opacity-60">No commitment · 15-min call · See ROI live</p>
        </div>
      </div>

      {/* Main Footer */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Logo size={20} />
                </div>
                <span className="text-lg font-bold font-display text-text-primary">ReynubixVoice</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                AI voice receptionists that answer every call, 24/7. Stop losing revenue to missed calls.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-col gap-3 md:items-center">
              <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-1">Quick Links</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
                <Link to="/contact" className="hover:text-text-primary transition-colors">{t.footer.contact}</Link>
                <Link to="/privacy" className="hover:text-text-primary transition-colors">{t.footer.privacy}</Link>
                <Link to="/terms" className="hover:text-text-primary transition-colors">{t.footer.terms}</Link>
              </div>
            </div>

            {/* Social + Copyright */}
            <div className="flex flex-col gap-3 md:items-end">
              <div className="flex items-center gap-3">
                {/* LinkedIn */}
                <a
                  href="https://www.linkedin.com/company/reynubix"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:text-brand-primary hover:border-brand-primary transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                {/* YouTube */}
                <a
                  href="https://www.youtube.com/@reynubix"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:text-brand-primary hover:border-brand-primary transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              </div>
              <p className="text-text-secondary text-xs mt-2">© 2026 ReynubixVoice. {t.footer.rights}</p>
            </div>

          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;