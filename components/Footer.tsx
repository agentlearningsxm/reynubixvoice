import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import Logo from './Logo';

const Footer: React.FC = () =>
{
  const { t } = useLanguage();

  return (
    <footer className="py-12 border-t border-border bg-bg-main">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Logo size={24} />
            </div>
            <span className="text-lg font-bold font-display text-text-primary">ReynubixVoice</span>
          </div>

          <div className="flex gap-8 text-sm text-text-secondary">
            <a href="#" className="hover:text-text-primary transition-colors cursor-pointer">{t.footer.privacy}</a>
            <a href="#" className="hover:text-text-primary transition-colors cursor-pointer">{t.footer.terms}</a>
            <Link to="/contact" className="hover:text-text-primary transition-colors cursor-pointer">{t.footer.contact}</Link>
          </div>

          <div className="text-text-secondary text-sm">
            © 2026 ReynubixVoice. {t.footer.rights}
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;