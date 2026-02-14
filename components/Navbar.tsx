import React, { useState, useEffect } from 'react';
import { Menu, X, PhoneCall, Globe, Palette, Moon, Sun, Check } from 'lucide-react';
import Button from './ui/Button';
import Logo from './Logo';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { useTheme, ThemeAccent } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () =>
{
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  const { t, language, setLanguage } = useLanguage();
  const { accent, setAccent, mode, setMode } = useTheme();

  useEffect(() =>
  {
    const handleScroll = () =>
    {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  ];

  const themes: { code: ThemeAccent; label: string; color: string }[] = [
    { code: 'blue', label: 'Electric Blue', color: '#3B82F6' },
    { code: 'green', label: 'Neon Green', color: '#22C55E' },
    { code: 'orange', label: 'Coral Action', color: '#F97316' },
  ];

  const toggleMode = () => setMode(mode === 'dark' ? 'light' : 'dark');

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass-nav py-4' : 'bg-transparent py-6'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Logo size={24} />
            </div>
            <span className="text-xl font-bold font-display tracking-tight text-text-primary">ReynubixVoice</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <a href="#receptionist" className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">{t.nav.receptionist}</a>
            <a href="#calculator" className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">{t.nav.calculator}</a>
            <a href="#solutions" className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">{t.nav.solutions}</a>
            <a href="#comparison" className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">{t.nav.comparison}</a>
            <a href="#automations" className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">{t.nav.automations}</a>
            <a href="#reviews" className="text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">{t.nav.reviews}</a>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm font-medium px-2 py-1 rounded-md hover:bg-bg-card border border-transparent hover:border-border cursor-pointer"
              >
                <Globe size={16} />
                <span className="uppercase">{language}</span>
              </button>

              <AnimatePresence>
                {isLangMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-40 glass-card rounded-xl overflow-hidden shadow-xl"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() =>
                        {
                          setLanguage(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 transition-colors ${language === lang.code ? 'text-brand-primary font-medium bg-white/5' : 'text-text-secondary'
                          }`}
                      >
                        <span>{lang.flag}</span>
                        {lang.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <div className="relative">
              <button
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className="flex items-center gap-2 bg-bg-card border border-border rounded-full px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-colors"
              >
                <Palette size={16} className="text-text-secondary" />
                <span className="w-2 h-2 rounded-full bg-brand-primary"></span>
              </button>

              <AnimatePresence>
                {isThemeMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-48 glass-card rounded-xl overflow-hidden shadow-xl z-50 p-2"
                  >
                    <div className="flex flex-col gap-1">
                      {themes.map((t) => (
                        <button
                          key={t.code}
                          onClick={() =>
                          {
                            setAccent(t.code);
                            setIsThemeMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${accent === t.code ? 'bg-white/10 text-text-primary' : 'text-text-secondary hover:bg-white/5'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></span>
                            {t.label}
                          </div>
                          {accent === t.code && <Check size={14} className="text-brand-primary" />}
                        </button>
                      ))}

                      <div className="h-px bg-border my-1"></div>

                      <button
                        onClick={toggleMode}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {mode === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                          {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button size="sm" onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}>
              {t.nav.bookDemo}
            </Button>
          </div>

          <div className="md:hidden flex items-center gap-4">
            {/* Mobile Theme Toggle */}
            <button onClick={toggleMode} className="text-text-secondary p-1 cursor-pointer">
              {mode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-text-primary p-2 cursor-pointer"
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass-card absolute top-full left-0 right-0 p-4 border-t border-border">
          <div className="flex flex-col gap-4">
            <a href="#receptionist" className="text-text-secondary hover:text-text-primary p-2" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.receptionist}</a>
            <a href="#calculator" className="text-text-secondary hover:text-text-primary p-2" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.calculator}</a>
            <a href="#solutions" className="text-text-secondary hover:text-text-primary p-2" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.solutions}</a>
            <a href="#comparison" className="text-text-secondary hover:text-text-primary p-2" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.comparison}</a>
            <a href="#automations" className="text-text-secondary hover:text-text-primary p-2" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.automations}</a>
            <a href="#reviews" className="text-text-secondary hover:text-text-primary p-2" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.reviews}</a>

            <div className="flex gap-2 p-2 overflow-x-auto">
              {themes.map((t) => (
                <button
                  key={t.code}
                  onClick={() => setAccent(t.code)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap ${accent === t.code
                    ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                    : 'border-border text-text-secondary'
                    }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }}></span>
                  {t.label}
                </button>
              ))}
            </div>

            <Button className="w-full" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.bookDemo}</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;