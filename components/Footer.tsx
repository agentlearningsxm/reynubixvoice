import type React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { trackEventFireAndForget } from '../lib/telemetry/browser';
import Logo from './Logo';
import {
  ArrowUp,
  Phone,
  Zap,
  Clock,
  Activity,
  Sparkles,
} from 'lucide-react';

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const Footer: React.FC = () => {
  const { t } = useLanguage();

  const stats = [
    { value: '1,200+', label: 'Calls handled', icon: Phone },
    { value: '98%', label: 'Answer rate', icon: Activity },
    { value: '24/7', label: 'Always on', icon: Clock },
    { value: '< 1s', label: 'Response time', icon: Zap },
  ];

  return (
    <footer id="footer" className="relative border-t border-border section-grid-bg overflow-hidden">
      {/* ═══════════════════════════════════════════════════
          CTA BANNER — Dramatic, Premium
      ═══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden py-14 md:py-28 lg:py-36">
        {/* Large ambient glow — top center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 30%, color-mix(in srgb, var(--accent-primary) 14%, transparent), transparent 70%)',
          }}
        />
        {/* Bottom glow — warm uplight effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 90% 80% at 50% 130%, color-mix(in srgb, var(--accent-primary) 25%, transparent), transparent 60%)',
          }}
        />
        {/* Side accent streaks */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 30% 60% at 10% 50%, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent 70%), radial-gradient(ellipse 30% 60% at 90% 50%, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent 70%)',
          }}
        />

        <div className="page-container text-center relative z-10">
          {/* Eyebrow badge */}
          <div className="flex justify-center mb-6">
            <span className="section-eyebrow">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary" />
              </span>
              Taking Bookings Now
            </span>
          </div>

          {/* Headline — larger, more dramatic */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display tracking-[-0.03em] text-text-primary mb-5 leading-[1.08]">
            Every missed call is a
            <br />
            <span className="text-gradient">missed opportunity.</span>
          </h2>

          {/* Sub-copy */}
          <p className="text-text-primary/70 text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Your AI receptionist answers 24/7 before your competitor does.
          </p>

          {/* CTA Button — enhanced glow */}
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
            className="group inline-flex items-center gap-2.5 px-10 py-4.5 rounded-full text-white font-semibold text-base cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background:
                'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
              boxShadow:
                '0 0 50px color-mix(in srgb, var(--accent-primary) 45%, transparent), 0 0 100px color-mix(in srgb, var(--accent-primary) 18%, transparent), 0 4px 24px rgba(0,0,0,0.4)',
              border: '1px solid color-mix(in srgb, var(--accent-secondary) 40%, transparent)',
            }}
          >
            <Sparkles className="w-4 h-4 opacity-80" />
            Book a Free Demo
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5"
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
          <p className="mt-5 text-xs text-text-primary/50 tracking-wide">
            No commitment &middot; 15-min call &middot; See ROI live
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          PREMIUM DIVIDER — Gradient line with glow
      ═══════════════════════════════════════════════════ */}
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-px" style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--accent-primary) 30%, var(--accent-secondary) 50%, var(--accent-primary) 70%, transparent 100%)',
          opacity: 0.6,
        }} />
        <div className="absolute inset-x-0 top-0 h-8 pointer-events-none" style={{
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent)',
        }} />
      </div>

      {/* ═══════════════════════════════════════════════════
          TRUST STATS BAR — With icons, glass cards
      ═══════════════════════════════════════════════════ */}
      <div className="relative py-12 md:py-16">
        <div className="page-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map(({ value, label, icon: Icon }) => (
              <div
                key={label}
                className="group relative flex flex-col items-center gap-2.5 py-6 px-5 rounded-2xl transition-all duration-300 overflow-hidden"
                style={{
                  background: 'color-mix(in srgb, var(--accent-primary) 4%, var(--bg-main))',
                  border: '1px solid color-mix(in srgb, var(--accent-primary) 15%, transparent)',
                }}
              >
                {/* Left accent stripe */}
                <div
                  className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                  style={{
                    background: 'linear-gradient(180deg, transparent, var(--accent-primary), transparent)',
                    opacity: 0.5,
                  }}
                />
                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent 70%)',
                  }}
                />
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-1 transition-colors duration-300"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                  }}
                >
                  <Icon className="w-4.5 h-4.5 text-brand-primary" />
                </div>
                <span
                  className="text-2xl md:text-3xl font-bold font-display tracking-tight"
                  style={{ color: 'var(--accent-secondary)' }}
                >
                  {value}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-text-primary/50"
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MAIN FOOTER — Premium glass panel
      ═══════════════════════════════════════════════════ */}
      <div className="relative">
        {/* Top divider */}
        <div className="absolute inset-x-0 top-0 h-px" style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--border) 20%, var(--border) 80%, transparent 100%)',
        }} />

        <div className="py-16 md:py-20">
          <div className="page-container">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">

              {/* Brand Column — wider */}
              <div className="md:col-span-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-brand-primary"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--accent-primary) 15%, transparent)',
                    }}
                  >
                    <Logo size={22} />
                  </div>
                  <span className="text-lg font-bold font-display text-text-primary tracking-tight">
                    ReynubixVoice
                  </span>
                </div>

                {/* Tagline / mission statement */}
                <p className="text-sm text-text-primary/60 leading-relaxed mb-3 max-w-sm">
                  AI voice receptionists that answer every call, 24/7. Stop
                  losing revenue to missed calls.
                </p>
                <p className="text-xs text-text-primary/40 italic">
                  Built in the Netherlands. Serving businesses worldwide.
                </p>
              </div>

              {/* Quick Links Column */}
              <div className="md:col-span-3">
                <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Quick Links
                </p>
                <nav className="flex flex-col gap-3">
                  <Link
                    to="/contact"
                    className="text-sm text-text-primary/60 hover:text-text-primary transition-colors duration-200 w-fit"
                  >
                    {t.footer.contact}
                  </Link>
                  <Link
                    to="/privacy"
                    className="text-sm text-text-primary/60 hover:text-text-primary transition-colors duration-200 w-fit"
                  >
                    {t.footer.privacy}
                  </Link>
                  <Link
                    to="/terms"
                    className="text-sm text-text-primary/60 hover:text-text-primary transition-colors duration-200 w-fit"
                  >
                    {t.footer.terms}
                  </Link>
                </nav>
              </div>

              {/* Social + Copyright Column */}
              <div className="md:col-span-4 flex flex-col gap-5 md:items-end">
                <div>
                  <p className="text-xs font-semibold tracking-[0.15em] uppercase mb-4 md:text-right"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Connect
                  </p>
                  <div className="flex items-center gap-3">
                    {/* LinkedIn */}
                    <a
                      href="https://www.linkedin.com/company/reynubix"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="LinkedIn"
                      className="group w-10 h-10 rounded-xl border border-border flex items-center justify-center text-text-primary/50 transition-all duration-300 hover:text-[#0A66C2] hover:border-[#0A66C2]/50 hover:shadow-[0_0_16px_rgba(10,102,194,0.15)]"
                      style={{ background: 'var(--bg-card)' }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-[18px] h-[18px]"
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
                      className="group w-10 h-10 rounded-xl border border-border flex items-center justify-center text-text-primary/50 transition-all duration-300 hover:text-[#FF0000] hover:border-[#FF0000]/50 hover:shadow-[0_0_16px_rgba(255,0,0,0.12)]"
                      style={{ background: 'var(--bg-card)' }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-[18px] h-[18px]"
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
                      className="group w-10 h-10 rounded-xl border border-border flex items-center justify-center text-text-primary/50 transition-all duration-300 hover:text-[#25D366] hover:border-[#25D366]/50 hover:shadow-[0_0_16px_rgba(37,211,102,0.15)]"
                      style={{ background: 'var(--bg-card)' }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-[18px] h-[18px]"
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
                      className="group w-10 h-10 rounded-xl border border-border flex items-center justify-center transition-all duration-300 hover:border-[#1a237e]/50 hover:shadow-[0_0_16px_rgba(26,35,126,0.12)]"
                      style={{ background: 'var(--bg-card)' }}
                    >
                      <svg
                        viewBox="0 0 64 64"
                        className="w-[18px] h-[18px]"
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          BOTTOM BAR — Copyright + Back to top
      ═══════════════════════════════════════════════════ */}
      <div className="relative">
        {/* Separator */}
        <div className="absolute inset-x-0 top-0 h-px" style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--border) 20%, var(--border) 80%, transparent 100%)',
        }} />

        <div className="py-6">
          <div className="page-container flex items-center justify-between">
            <p className="text-text-primary/50 text-xs">
              &copy; 2026 ReynubixVoice. {t.footer.rights}
            </p>

            {/* Back to Top */}
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Back to top"
              className="group flex items-center gap-2 text-xs text-text-primary/50 hover:text-text-primary transition-all duration-300 cursor-pointer"
            >
              <span className="hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Back to top
              </span>
              <span
                className="w-11 h-11 rounded-lg border border-border flex items-center justify-center transition-all duration-300 group-hover:border-brand-primary/40 group-hover:shadow-[0_0_12px_var(--accent-glow)]"
                style={{ background: 'var(--bg-card)' }}
              >
                <ArrowUp className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-y-0.5" />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          BOTTOM EDGE GLOW — Animated gradient border
      ═══════════════════════════════════════════════════ */}
      <div
        className="h-[2px] w-full"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--accent-primary) 20%, var(--accent-secondary) 40%, var(--accent-primary) 60%, var(--accent-secondary) 80%, transparent 100%)',
          opacity: 0.7,
        }}
      />
      <div
        className="h-6 w-full pointer-events-none"
        style={{
          background: 'linear-gradient(0deg, color-mix(in srgb, var(--accent-primary) 8%, transparent), transparent)',
        }}
      />
    </footer>
  );
};

export default Footer;
