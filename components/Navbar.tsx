import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Globe, Palette, Moon, Sun, Check } from 'lucide-react';
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

  useEffect(() =>
  {
    if (location.pathname === '/contact')
    {
      setActiveNav('contact');
    } else if (location.hash)
    {
      const id = location.hash.replace('#', '');
      setTimeout(() =>
      {
        const el = document.getElementById(id);
        if (el)
        {
          el.scrollIntoView({ behavior: 'smooth' });
          setActiveNav(id);
        }
      }, 100);
    } else
    {
      setActiveNav('receptionist');
    }
  }, [location.pathname, location.hash]);

  useEffect(() =>
  {
    const handleScroll = () =>
    {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update bubble position when active nav changes
  useEffect(() =>
  {
    updateBubblePosition();
  }, [activeNav]);

  // Update hover bubble position
  useEffect(() =>
  {
    updateHoverBubblePosition();
  }, [hoveredNav]);

  useEffect(() =>
  {
    (function (C: any, A: any, L: any) { let p = function (a: any, ar: any) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
    (window as any).Cal("init", "let-s-talk", { origin: "https://app.cal.com" });

    (window as any).Cal.ns["let-s-talk"]("ui", { "hideEventTypeDetails": false, "layout": "month_view" });
  }, []);

  // Close dropdowns on outside click
  useEffect(() =>
  {
    const handleClickOutside = (e: MouseEvent) =>
    {
      if (controlsRef.current && !controlsRef.current.contains(e.target as Node))
      {
        setIsLangMenuOpen(false);
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateBubblePosition = () =>
  {
    const activeLink = linkRefs.current[activeNav];
    const bubble = bubbleRef.current;
    const nav = navRef.current;

    if (activeLink && bubble && nav)
    {
      const navRect = nav.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();

      bubble.style.left = `${linkRect.left - navRect.left}px`;
      bubble.style.width = `${linkRect.width}px`;
    }
  };

  const updateHoverBubblePosition = () =>
  {
    const hoveredLink = hoveredNav ? linkRefs.current[hoveredNav] : null;
    const hoverBubble = hoverBubbleRef.current;
    const nav = navRef.current;

    if (hoveredLink && hoverBubble && nav)
    {
      const navRect = nav.getBoundingClientRect();
      const linkRect = hoveredLink.getBoundingClientRect();

      hoverBubble.style.left = `${linkRect.left - navRect.left}px`;
      hoverBubble.style.width = `${linkRect.width}px`;
      hoverBubble.style.opacity = '1';
    } else if (hoverBubble)
    {
      hoverBubble.style.opacity = '0';
    }
  };

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: 'EN' },
    { code: 'fr', label: 'Français', flag: 'FR' },
    { code: 'nl', label: 'Nederlands', flag: 'NL' },
  ];

  const themes: { code: ThemeAccent; label: string; color: string }[] = [
    { code: 'blue', label: 'Electric Blue', color: '#3B82F6' },
    { code: 'green', label: 'Neon Green', color: '#22C55E' },
    { code: 'orange', label: 'Coral Action', color: '#F97316' },
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

  const handleNavClick = (id: string) =>
  {
    if (location.pathname !== '/')
    {
      navigate(`/#${id}`);
    } else
    {
      setActiveNav(id);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'py-3' : 'py-5'
        }`}
    >
      <div className="max-w-7xl mx-auto pl-3 pr-4 sm:pl-4 sm:pr-6 lg:pl-6 lg:pr-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Logo size={24} />
            </div>
            <span className="text-xl font-bold font-display tracking-tight text-text-primary">ReynubixVoice</span>
          </Link>

          {/* Pill Navigation - Desktop */}
          <div className="hidden lg:flex items-center">
            <div
              ref={navRef}
              className="nav-wrap relative"
            >
              {/* Active Bubble */}
              <div
                ref={bubbleRef}
                className="nav-bubble active"
              />

              {/* Hover Bubble */}
              <div
                ref={hoverBubbleRef}
                className="nav-bubble hover"
              />

              {/* Navigation Links */}
              <nav className="nav">
                {navItems.map((item) => (
                  <a
                    key={item.id}
                    ref={(el) => linkRefs.current[item.id] = el}
                    href={item.id === 'contact' ? '/contact' : `#${item.id}`}
                    className={`nav-link ${activeNav === item.id ? 'active' : ''}`}
                    onClick={(e) =>
                    {
                      e.preventDefault();
                      if (item.id === 'contact')
                      {
                        navigate('/contact');
                        setActiveNav('contact');
                      } else
                      {
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
          <div className="hidden md:flex items-center">
            <div ref={controlsRef} className="controls-wrap relative">
              {/* Language Selector */}
              <div className="control-item">
                <button
                  onClick={() => { setIsLangMenuOpen(prev => !prev); setIsThemeMenuOpen(false); }}
                  className="control-btn"
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
                          onClick={() =>
                          {
                            setLanguage(lang.code);
                            setIsLangMenuOpen(false);
                          }}
                          className={`dropdown-item ${language === lang.code ? 'active' : ''}`}
                        >
                          <span className="text-sm font-medium">{lang.flag}</span>
                          {lang.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme Toggle */}
              <div className="control-item">
                <button
                  onClick={() => { setIsThemeMenuOpen(prev => !prev); setIsLangMenuOpen(false); }}
                  className="control-btn theme-btn"
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
                            onClick={() =>
                            {
                              setAccent(theme.code);
                              setIsThemeMenuOpen(false);
                            }}
                            className={`dropdown-item ${accent === theme.code ? 'active' : ''}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.color }}></span>
                              {theme.label}
                            </div>
                            {accent === theme.code && <Check size={14} className="text-brand-primary" />}
                          </button>
                        ))}

                        <div className="divider"></div>

                        <button
                          onClick={toggleMode}
                          className="dropdown-item"
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

              {/* Book Demo Button */}
              <div className="control-item">
                <Button
                  size="sm"
                  data-cal-link="reynubix-voice/let-s-talk"
                  data-cal-namespace="let-s-talk"
                  data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                  className="demo-btn"
                >
                  {t.nav.bookDemo}
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="md:hidden flex items-center gap-3">
            <button onClick={toggleMode} className="mobile-icon-btn">
              {mode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="mobile-icon-btn"
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <div className="flex flex-col gap-3">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={item.id === 'contact' ? '/contact' : `#${item.id}`}
                className={`mobile-nav-link ${activeNav === item.id ? 'active' : ''}`}
                onClick={(e) =>
                {
                  e.preventDefault();
                  if (item.id === 'contact')
                  {
                    navigate('/contact');
                    setActiveNav('contact');
                  } else
                  {
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
                  onClick={() => setAccent(theme.code)}
                  className={`mobile-theme-btn ${accent === theme.code ? 'active' : ''}`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.color }}></span>
                  {theme.label}
                </button>
              ))}
            </div>

            <Button
              className="w-full"
              onClick={() => setIsMobileMenuOpen(false)}
              data-cal-link="reynubix-voice/let-s-talk"
              data-cal-namespace="let-s-talk"
              data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
            >
              {t.nav.bookDemo}
            </Button>
          </div>
        </div>
      )}

      {/* Navigation Styles */}
      <style>{`
        /* Main Navigation Pill */
        .nav-wrap {
          border: 1px solid var(--color-border, #3f3f3f);
          width: fit-content;
          margin: 0 auto;
          border-radius: 500px;
          position: relative;
          box-shadow: inset 10px 0 10px rgba(0, 0, 0, 0.3);
          background: linear-gradient(0deg, rgba(20, 20, 20, 0.95), rgba(36, 36, 36, 0.95));
        }

        .light .nav-wrap {
          box-shadow: inset 5px 0 5px rgba(0, 0, 0, 0.05);
          background: linear-gradient(0deg, rgba(241, 245, 249, 0.98), rgba(255, 255, 255, 0.98));
          border-color: rgba(0, 0, 0, 0.12);
        }

        .nav-wrap:after {
          content: "";
          display: block;
          position: absolute;
          inset: -3px;
          background: linear-gradient(180deg, rgba(63, 63, 63, 0.5), rgba(33, 33, 33, 0.8));
          border-radius: 500px;
          z-index: -1;
        }

        .light .nav-wrap:after {
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.03));
        }

        .nav {
          width: fit-content;
          margin: 4px;
          display: flex;
          align-items: center;
        }

        .nav-link {
          z-index: 10;
          position: relative;
          display: inline-block;
          padding: 12px 24px;
          color: rgba(255, 255, 255, 0.85);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .light .nav-link {
          color: rgba(31, 41, 55, 0.9);
        }

        .nav-link.active {
          color: var(--accent-primary);
          font-weight: 600;
        }

        .light .nav-link.active {
          color: var(--accent-primary);
          font-weight: 600;
        }

        .nav-bubble {
          position: absolute;
          top: 4px;
          bottom: 4px;
          border-radius: 500px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }

        .nav-bubble.active {
          z-index: 2;
          background: var(--accent-subtle);
          box-shadow: inset 0 2px 7px rgba(255, 255, 255, 0.08), 0 0 12px var(--accent-glow), 0 2px 8px rgba(0, 0, 0, 0.2);
          border: 1px solid var(--accent-primary);
        }

        .light .nav-bubble.active {
          background: var(--accent-subtle);
          box-shadow: inset 0 2px 7px rgba(255, 255, 255, 0.6), 0 0 10px var(--accent-glow), 0 2px 6px rgba(0, 0, 0, 0.08);
          border: 1px solid var(--accent-primary);
        }

        .nav-bubble.hover {
          z-index: 1;
          background: linear-gradient(180deg, rgba(80, 80, 80, 0.6), rgba(50, 50, 50, 0.6));
          box-shadow: inset 0 2px 7px rgba(255, 255, 255, 0.1);
          opacity: 0;
        }

        .light .nav-bubble.hover {
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.08));
          box-shadow: inset 0 2px 7px rgba(255, 255, 255, 0.5);
        }

        /* Controls Wrap (Language, Theme, Demo Button) */
        .controls-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px;
          border-radius: 500px;
          background: linear-gradient(0deg, rgba(20, 20, 20, 0.9), rgba(36, 36, 36, 0.9));
          border: 1px solid rgba(63, 63, 63, 0.5);
          box-shadow: inset 5px 0 5px rgba(0, 0, 0, 0.2);
        }

        .light .controls-wrap {
          background: linear-gradient(0deg, rgba(241, 245, 249, 0.95), rgba(255, 255, 255, 0.95));
          border-color: rgba(0, 0, 0, 0.1);
          box-shadow: inset 3px 0 3px rgba(0, 0, 0, 0.03);
        }

        .control-item {
          position: relative;
        }

        .control-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          color: rgba(255, 255, 255, 0.85);
          background: transparent;
          border: none;
          border-radius: 500px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .light .control-btn {
          color: rgba(31, 41, 55, 0.9);
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .light .control-btn:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .theme-btn {
          padding: 8px 12px;
        }

        /* Dropdown Menu */
        .dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 160px;
          background: linear-gradient(0deg, rgba(20, 20, 20, 0.98), rgba(36, 36, 36, 0.98));
          border: 1px solid rgba(63, 63, 63, 0.5);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
          padding: 6px;
          z-index: 100;
        }

        .light .dropdown-menu {
          background: linear-gradient(0deg, rgba(241, 245, 249, 0.98), rgba(255, 255, 255, 0.98));
          border-color: rgba(0, 0, 0, 0.1);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        }

        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 14px;
          color: rgba(255, 255, 255, 0.75);
          background: transparent;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          text-align: left;
          transition: all 0.15s ease;
        }

        .light .dropdown-item {
          color: rgba(31, 41, 55, 0.8);
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.95);
        }

        .light .dropdown-item:hover {
          background: rgba(0, 0, 0, 0.05);
          color: rgba(31, 41, 55, 1);
        }

        .dropdown-item.active {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }

        .light .dropdown-item.active {
          background: rgba(59, 130, 246, 0.1);
          color: #3B82F6;
        }

        .divider {
          height: 1px;
          background: rgba(63, 63, 63, 0.5);
          margin: 6px 0;
        }

        .light .divider {
          background: rgba(0, 0, 0, 0.1);
        }

        .theme-menu {
          min-width: 180px;
        }

        /* Demo Button in Controls */
        .demo-btn {
          margin-left: 4px;
        }

        /* Mobile Styles */
        .mobile-icon-btn {
          color: rgba(255, 255, 255, 0.85);
          padding: 8px;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .light .mobile-icon-btn {
          color: rgba(31, 41, 55, 0.9);
        }

        .mobile-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: linear-gradient(0deg, rgba(20, 20, 20, 0.98), rgba(36, 36, 36, 0.98));
          border-top: 1px solid rgba(63, 63, 63, 0.5);
          padding: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .light .mobile-menu {
          background: linear-gradient(0deg, rgba(241, 245, 249, 0.98), rgba(255, 255, 255, 0.98));
          border-top-color: rgba(0, 0, 0, 0.1);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .mobile-nav-link {
          display: block;
          padding: 12px 16px;
          color: rgba(255, 255, 255, 0.75);
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          border-radius: 10px;
          transition: all 0.15s ease;
        }

        .light .mobile-nav-link {
          color: rgba(31, 41, 55, 0.8);
        }

        .mobile-nav-link:hover,
        .mobile-nav-link.active {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }

        .light .mobile-nav-link:hover,
        .light .mobile-nav-link.active {
          background: rgba(59, 130, 246, 0.1);
          color: #3B82F6;
        }

        .mobile-theme-row {
          display: flex;
          gap: 8px;
          padding: 12px 0;
          overflow-x: auto;
        }

        .mobile-theme-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 500px;
          border: 1px solid rgba(63, 63, 63, 0.5);
          background: transparent;
          color: rgba(255, 255, 255, 0.75);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .light .mobile-theme-btn {
          border-color: rgba(0, 0, 0, 0.15);
          color: rgba(31, 41, 55, 0.8);
        }

        .mobile-theme-btn.active {
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.5);
          color: #60a5fa;
        }

        .light .mobile-theme-btn.active {
          background: rgba(59, 130, 246, 0.1);
          border-color: rgba(59, 130, 246, 0.4);
          color: #3B82F6;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;