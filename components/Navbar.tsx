import { AnimatePresence, motion } from 'framer-motion';
import { Check, Globe, Menu, Moon, Palette, Sun, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { type Language, useLanguage } from '../contexts/LanguageContext';
import { type ThemeAccent, useTheme } from '../contexts/ThemeContext';
import { trackEventFireAndForget } from '../lib/telemetry/browser';
import Logo from './Logo';
import Button from './ui/Button';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('receptionist');
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const hoverBubbleRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<{ [key: string]: HTMLAnchorElement | null }>({});
  const controlsRef = useRef<HTMLDivElement>(null);

  const { t, language, setLanguage } = useLanguage();
  const { accent, setAccent, mode, setMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/contact') {
      setActiveNav('contact');
    } else if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          setActiveNav(id);
        }
      }, 100);
    } else {
      setActiveNav('receptionist');
    }
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const updateBubblePosition = useCallback(() => {
    const activeLink = linkRefs.current[activeNav];
    const bubble = bubbleRef.current;
    const nav = navRef.current;

    if (activeLink && bubble && nav) {
      const navRect = nav.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();

      bubble.style.left = `${linkRect.left - navRect.left}px`;
      bubble.style.width = `${linkRect.width}px`;
    }
  }, [activeNav]);

  const updateHoverBubblePosition = useCallback(() => {
    const hoveredLink = hoveredNav ? linkRefs.current[hoveredNav] : null;
    const hoverBubble = hoverBubbleRef.current;
    const nav = navRef.current;

    if (hoveredLink && hoverBubble && nav) {
      const navRect = nav.getBoundingClientRect();
      const linkRect = hoveredLink.getBoundingClientRect();

      hoverBubble.style.left = `${linkRect.left - navRect.left}px`;
      hoverBubble.style.width = `${linkRect.width}px`;
      hoverBubble.style.opacity = '1';
    } else if (hoverBubble) {
      hoverBubble.style.opacity = '0';
    }
  }, [hoveredNav]);

  // Update bubble position when active nav changes
  useEffect(() => {
    updateBubblePosition();
  }, [updateBubblePosition]);

  // Update hover bubble position
  useEffect(() => {
    updateHoverBubblePosition();
  }, [updateHoverBubblePosition]);

  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: Cal.com embed SDK requires dynamic typing
    // biome-ignore lint/complexity/noArguments: Cal.com embed SDK uses arguments for variadic calls
    ((C: any, A: any, L: any) => {
      const p = (a: any, ar: any) => {
        a.q.push(ar);
      };
      const d = C.document;
      C.Cal =
        C.Cal ||
        function () {
          const cal = C.Cal;
          const ar = arguments;
          if (!cal.loaded) {
            cal.ns = {};
            cal.q = cal.q || [];
            d.head.appendChild(d.createElement('script')).src = A;
            cal.loaded = true;
          }
          if (ar[0] === L) {
            const api = function () {
              p(api, arguments);
            };
            const namespace = ar[1];
            api.q = api.q || [];
            if (typeof namespace === 'string') {
              cal.ns[namespace] = cal.ns[namespace] || api;
              p(cal.ns[namespace], ar);
              p(cal, ['initNamespace', namespace]);
            } else p(cal, ar);
            return;
          }
          p(cal, ar);
        };
    })(window, 'https://app.cal.com/embed/embed.js', 'init');
    // biome-ignore lint/suspicious/noExplicitAny: Cal.com embed SDK requires dynamic typing
    (window as any).Cal('init', 'let-s-talk', {
      origin: 'https://app.cal.com',
    });

    // biome-ignore lint/suspicious/noExplicitAny: Cal.com embed SDK requires dynamic typing
    (window as any).Cal.ns['let-s-talk']('ui', {
      hideEventTypeDetails: false,
      layout: 'month_view',
    });
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        controlsRef.current &&
        !controlsRef.current.contains(e.target as Node)
      ) {
        setIsLangMenuOpen(false);
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on Escape key
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isMobileMenuOpen]);

  // Body scroll lock while mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isMobileMenuOpen]);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: 'EN' },
    { code: 'fr', label: 'Français', flag: 'FR' },
    { code: 'nl', label: 'Nederlands', flag: 'NL' },
  ];

  const themes: { code: ThemeAccent; label: string; color: string }[] = [
    { code: 'blue', label: 'Royal Gold', color: '#c8a960' },
    { code: 'green', label: 'Neon Green', color: '#22C55E' },
    { code: 'orange', label: 'Coral Action', color: '#F97316' },
    { code: 'pencil', label: 'Pencil Sketch', color: '#5c5c5c' },
  ];

  const navItems = [
    { id: 'receptionist', label: t.nav.receptionist },
    { id: 'calculator', label: t.nav.calculator },
    { id: 'solutions', label: t.nav.solutions },
    { id: 'comparison', label: t.nav.comparison },
    { id: 'automations', label: t.nav.automations },
    { id: 'reviews', label: t.nav.reviews },
    { id: 'contact', label: t.footer.contact },
  ];

  const toggleMode = () => setMode(mode === 'dark' ? 'light' : 'dark');

  const handleNavClick = (id: string) => {
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
    } else {
      setActiveNav(id);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'py-3 bg-bg-main/95 backdrop-blur-md border-b border-border/50 shadow-md'
          : 'py-5 bg-transparent'
      }`}
    >
      <div className="page-container">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Logo size={22} />
            </div>
            <span className="text-base sm:text-xl font-bold font-display tracking-tight text-text-primary">
              ReynubixVoice
            </span>
          </Link>

          {/* Pill Navigation - Desktop */}
          <div className="hidden lg:flex items-center">
            <div ref={navRef} className="nav-wrap relative">
              {/* Active Bubble */}
              <div ref={bubbleRef} className="nav-bubble active" />

              {/* Hover Bubble */}
              <div ref={hoverBubbleRef} className="nav-bubble hover" />

              {/* Navigation Links */}
              <nav className="nav">
                {navItems.map((item) => (
                  <a
                    key={item.id}
                    ref={(el) => {
                      linkRefs.current[item.id] = el;
                    }}
                    href={item.id === 'contact' ? '/contact' : `#${item.id}`}
                    className={`nav-link ${activeNav === item.id ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.id === 'contact') {
                        navigate('/contact');
                        setActiveNav('contact');
                      } else {
                        handleNavClick(item.id);
                      }
                    }}
                    onMouseEnter={() => setHoveredNav(item.id)}
                    onMouseLeave={() => setHoveredNav(null)}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          {/* Right Side Controls - Wrapped in Pill Style */}
          <div className="hidden lg:flex items-center">
            <div ref={controlsRef} className="controls-wrap relative">
              {/* Language Selector */}
              <div className="control-item">
                <button
                  type="button"
                  onClick={() => {
                    setIsLangMenuOpen((prev) => !prev);
                    setIsThemeMenuOpen(false);
                  }}
                  className="control-btn"
                  aria-label="Select language"
                  aria-haspopup="menu"
                  aria-expanded={isLangMenuOpen}
                >
                  <Globe size={16} />
                  <span className="uppercase text-xs">{language}</span>
                </button>

                <AnimatePresence>
                  {isLangMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="dropdown-menu"
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setLanguage(lang.code);
                            setIsLangMenuOpen(false);
                          }}
                          className={`dropdown-item ${language === lang.code ? 'active' : ''}`}
                        >
                          <span className="text-sm font-medium">
                            {lang.flag}
                          </span>
                          {lang.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Dark/Light Mode Toggle */}
              <div className="control-item">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="control-btn"
                  aria-label={
                    mode === 'dark'
                      ? 'Switch to light mode'
                      : 'Switch to dark mode'
                  }
                >
                  {mode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                </button>
              </div>

              {/* Theme Toggle */}
              <div className="control-item">
                <button
                  type="button"
                  onClick={() => {
                    setIsThemeMenuOpen((prev) => !prev);
                    setIsLangMenuOpen(false);
                  }}
                  className="control-btn theme-btn"
                  aria-label="Choose accent theme"
                  aria-haspopup="menu"
                  aria-expanded={isThemeMenuOpen}
                >
                  <Palette size={16} />
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span>
                </button>

                <AnimatePresence>
                  {isThemeMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="dropdown-menu theme-menu"
                    >
                      <div className="flex flex-col gap-1">
                        {themes.map((theme) => (
                          <button
                            key={theme.code}
                            type="button"
                            onClick={() => {
                              setAccent(theme.code);
                              setIsThemeMenuOpen(false);
                            }}
                            className={`dropdown-item ${accent === theme.code ? 'active' : ''}`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: theme.color }}
                              ></span>
                              {theme.label}
                            </div>
                            {accent === theme.code && (
                              <Check size={14} className="text-brand-primary" />
                            )}
                          </button>
                        ))}

                        <div className="divider"></div>

                        <button
                          type="button"
                          onClick={toggleMode}
                          className="dropdown-item"
                        >
                          <div className="flex items-center gap-2">
                            {mode === 'dark' ? (
                              <Moon size={14} />
                            ) : (
                              <Sun size={14} />
                            )}
                            {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Book Demo Button */}
              <div className="control-item">
                <Button
                  size="sm"
                  data-cal-link="reynubix-voice/let-s-talk"
                  data-cal-namespace="let-s-talk"
                  data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                  onClick={() =>
                    trackEventFireAndForget('cta_click', {
                      location: 'navbar',
                      target: 'cal.com',
                      cta: 'book_demo',
                    })
                  }
                  className="demo-btn"
                >
                  {t.nav.bookDemo}
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMode}
              className="mobile-icon-btn"
              aria-label={
                mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
              }
            >
              {mode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="mobile-icon-btn"
              aria-label={
                isMobileMenuOpen
                  ? 'Close navigation menu'
                  : 'Open navigation menu'
              }
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation-menu"
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Animated with backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop — closes menu on tap, smooths out the transition */}
            <motion.div
              key="mobile-menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Menu panel */}
            <motion.div
              key="mobile-menu-panel"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mobile-menu"
              id="mobile-navigation-menu"
            >
              <div className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <a
                    key={item.id}
                    href={item.id === 'contact' ? '/contact' : `#${item.id}`}
                    className={`mobile-nav-link ${activeNav === item.id ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.id === 'contact') {
                        navigate('/contact');
                        setActiveNav('contact');
                      } else {
                        setActiveNav(item.id);
                        handleNavClick(item.id);
                      }
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </a>
                ))}

                {/* Language Switcher Row */}
                <div className="mobile-theme-row">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLanguage(lang.code)}
                      className={`mobile-theme-btn ${language === lang.code ? 'active' : ''}`}
                    >
                      <Globe size={12} />
                      {lang.label}
                    </button>
                  ))}
                </div>

                <div className="mobile-theme-row">
                  {themes.map((theme) => (
                    <button
                      key={theme.code}
                      type="button"
                      onClick={() => setAccent(theme.code)}
                      className={`mobile-theme-btn ${accent === theme.code ? 'active' : ''}`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: theme.color }}
                      ></span>
                      {theme.label}
                    </button>
                  ))}
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    trackEventFireAndForget('cta_click', {
                      location: 'navbar_mobile',
                      target: 'cal.com',
                      cta: 'book_demo',
                    });
                  }}
                  data-cal-link="reynubix-voice/let-s-talk"
                  data-cal-namespace="let-s-talk"
                  data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                >
                  {t.nav.bookDemo}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
