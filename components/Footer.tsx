import type React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { trackEventFireAndForget } from '../lib/telemetry/browser';
import Logo from './Logo';

const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer id="footer" className="border-t border-border section-grid-bg">
      {/* CTA Banner — Premium */}
      <div className="relative overflow-hidden border-b border-border py-24 md:py-28">
        {/* Ambient glow layers */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 80% at 50% 120%, rgba(200,169,96,0.13), transparent 70%)',
          }}
        />
        {/* Grid provided by full-page square-grid in App.tsx — no local grid needed */}

        <div className="page-container text-center relative z-10">
          {/* Eyebrow */}
          <div className="flex justify-center mb-4">
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
            Your AI receptionist answers 24/7 before your competitor does.
          </p>

          {/* CTA Button */}
          <a
            data-cal-link="reynubix-voice/let-s-talk"
            data-cal-namespace="let-s-talk"
            data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
            onClick={() =>
              trackEventFireAndForget('cta_click', {
                location: 'footer_banner',
                target: 'cal.com',
                cta: 'book_free_demo',
              })
            }
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-semibold text-[15px] cursor-pointer transition-all hover:scale-[1.025] active:scale-[0.975]"
            style={{
              background:
                'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
              boxShadow:
                '0 0 28px rgba(200,169,96,0.30), 0 4px 16px rgba(0,0,0,0.35)',
            }}
          >
            Book a Free Demo
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>

          {/* Trust micro-copy */}
          <p className="mt-4 text-xs text-text-secondary opacity-60">
            No commitment · 15-min call · See ROI live
          </p>
        </div>
      </div>

      {/* Trust Stats Bar */}
      <div className="border-b border-border/50 py-6">
        <div className="page-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-border/50">
            {[
              { value: '1,200+', label: 'Calls handled' },
              { value: '98%', label: 'Answer rate' },
              { value: '24/7', label: 'Always on' },
              { value: '< 1s', label: 'Response time' },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-0.5 md:px-6"
              >
                <span className="text-2xl font-bold font-display tracking-tight text-text-primary">
                  {value}
                </span>
                <span className="text-xs font-medium text-text-secondary uppercase tracking-widest">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="py-14">
        <div className="page-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Logo size={20} />
                </div>
                <span className="text-lg font-bold font-display text-text-primary">
                  ReynubixVoice
                </span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                AI voice receptionists that answer every call, 24/7. Stop losing
                revenue to missed calls.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-col gap-3 md:items-center">
              <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-1">
                Quick Links
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
                <Link
                  to="/contact"
                  className="hover:text-text-primary transition-colors"
                >
                  {t.footer.contact}
                </Link>
                <Link
                  to="/privacy"
                  className="hover:text-text-primary transition-colors"
                >
                  {t.footer.privacy}
                </Link>
                <Link
                  to="/terms"
                  className="hover:text-text-primary transition-colors"
                >
                  {t.footer.terms}
                </Link>
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
                  className="group w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:text-[#0A66C2] hover:border-[#0A66C2] transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                {/* YouTube */}
                <a
                  href="https://www.youtube.com/@reynubix"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="group w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:text-[#FF0000] hover:border-[#FF0000] transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
                {/* WhatsApp */}
                <a
                  href="https://wa.me/31685367996"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="group w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-secondary hover:text-[#25D366] hover:border-[#25D366] transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
                {/* Skool */}
                <a
                  href="https://www.skool.com/@reynoso-anubis-8987"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Skool"
                  className="group w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:border-[#1a237e] transition-colors"
                >
                  <svg
                    viewBox="0 0 64 64"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <text
                      x="3"
                      y="52"
                      fontFamily="Arial, sans-serif"
                      fontWeight="bold"
                      fontSize="52"
                    >
                      <tspan className="fill-text-secondary group-hover:fill-[#1a237e] transition-colors">
                        s
                      </tspan>
                      <tspan className="fill-text-secondary group-hover:fill-[#d94b2e] transition-colors">
                        k
                      </tspan>
                    </text>
                  </svg>
                </a>
              </div>
              <p className="text-text-secondary text-xs mt-2">
                © 2026 ReynubixVoice. {t.footer.rights}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
