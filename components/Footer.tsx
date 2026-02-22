import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import Logo from './Logo';

const Footer: React.FC = () =>
{
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-bg-main">

      {/* CTA Banner */}
      <div className="border-b border-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-brand-primary mb-1">Ready to stop missing calls?</p>
            <h2 className="text-xl font-bold font-display text-text-primary">Your AI receptionist is waiting.</h2>
          </div>
          <a
            data-cal-link="reynubix-voice/let-s-talk"
            data-cal-namespace="let-s-talk"
            data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-primary text-white font-semibold text-sm cursor-pointer hover:opacity-90 transition-opacity"
          >
            Let&apos;s Talk →
          </a>
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