import { motion, useAnimation } from 'framer-motion';
import { AlertTriangle, DollarSign, Euro, Sparkles, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Calculator: React.FC = () => {
  const { t } = useLanguage();
  const [revenuePerCustomer, setRevenuePerCustomer] = useState(800);
  const [missedCalls, setMissedCalls] = useState(3);
  const [dramaticBorderEnabled, setDramaticBorderEnabled] = useState(true);
  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationStage, setPresentationStage] = useState(0);
  const [displayedMonthlyLoss, setDisplayedMonthlyLoss] = useState(0);
  const [yearlyVisible, setYearlyVisible] = useState(true);
  const presentationTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animationFrames = useRef<number[]>([]);
  const alreadyScrolledRef = useRef(false);

  // Logic: Missed Calls * 30 Days * 25% Booking Rate * Avg Ticket Price
  const monthlyLoss = useMemo(() => {
    return Math.floor(missedCalls * 30 * 0.25 * revenuePerCustomer);
  }, [revenuePerCustomer, missedCalls]);

  const yearlyLoss = useMemo(() => {
    return monthlyLoss * 12;
  }, [monthlyLoss]);

  const controls = useAnimation();
  const yearlyControls = useAnimation();

  useEffect(() => {
    controls.start({
      scale: [1, 1.02, 1],
      transition: { duration: 0.3 },
    });
  }, [controls]);

  // Animate a numeric value from `from` to `to` over `duration` ms with ease-out
  const animateValue = useCallback(
    (
      from: number,
      to: number,
      duration: number,
      setter: (v: number) => void,
      onComplete?: () => void,
    ) => {
      const startTime = performance.now();
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - (1 - progress) ** 3;
        const current = Math.floor(from + (to - from) * eased);
        setter(current);
        if (progress < 1) {
          const id = requestAnimationFrame(animate);
          animationFrames.current.push(id);
        } else {
          setter(to);
          onComplete?.();
        }
      };
      const id = requestAnimationFrame(animate);
      animationFrames.current.push(id);
    },
    [],
  );

  // Cancel any running presentation and clean up
  const cancelPresentation = useCallback(() => {
    presentationTimeouts.current.forEach(clearTimeout);
    presentationTimeouts.current = [];
    animationFrames.current.forEach(cancelAnimationFrame);
    animationFrames.current = [];
    setPresentationMode(false);
    setPresentationStage(0);
    setYearlyVisible(true);
  }, []);

  // Staged presentation sequence
  const runPresentation = useCallback(
    (targetRevenue: number, targetCalls: number) => {
      // Cancel any previous presentation
      cancelPresentation();

      setPresentationMode(true);
      setPresentationStage(0);
      setYearlyVisible(false);
      setDisplayedMonthlyLoss(0);

      const timeouts = presentationTimeouts.current;

      // Stage 0: Scroll calculator into view (skip if show_calculator already did it)
      if (!alreadyScrolledRef.current) {
        const cardEl = document.getElementById('calculator-card');
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          document
            .getElementById('calculator')
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      alreadyScrolledRef.current = true;

      // Stage 1: Revenue slider (600ms delay — allows scroll to settle)
      timeouts.push(
        setTimeout(() => {
          setPresentationStage(1);
          animateValue(
            revenuePerCustomer,
            targetRevenue,
            600,
            setRevenuePerCustomer,
          );
        }, 600),
      );

      // Stage 2: Missed calls slider (1200ms delay)
      timeouts.push(
        setTimeout(() => {
          setPresentationStage(2);
          animateValue(missedCalls, targetCalls, 600, setMissedCalls);
        }, 1200),
      );

      // Stage 3: Monthly loss count-up (2200ms delay)
      timeouts.push(
        setTimeout(() => {
          setPresentationStage(3);
          const targetMonthly = Math.floor(
            targetCalls * 30 * 0.25 * targetRevenue,
          );
          animateValue(0, targetMonthly, 1200, setDisplayedMonthlyLoss, () => {
            // Trigger pulse animation on monthly loss card
            controls.start({
              scale: [1, 1.05, 1],
              transition: { duration: 0.4 },
            });
          });
        }, 2200),
      );

      // Stage 4: Yearly fade-in (4000ms delay)
      timeouts.push(
        setTimeout(() => {
          setPresentationStage(4);
          setYearlyVisible(true);
        }, 4000),
      );

      // End presentation mode (5000ms)
      timeouts.push(
        setTimeout(() => {
          setPresentationMode(false);
          setPresentationStage(0);
          alreadyScrolledRef.current = false;
        }, 5000),
      );
    },
    [
      revenuePerCustomer,
      missedCalls,
      controls,
      animateValue,
      cancelPresentation,
    ],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      presentationTimeouts.current.forEach(clearTimeout);
      animationFrames.current.forEach(cancelAnimationFrame);
    };
  }, []);

  // Listen for AI Agent events
  useEffect(() => {
    const handleAIUpdate = (event: CustomEvent) => {
      if (presentationMode) return; // Prevent double-triggering
      const targetRevenue = event.detail.revenue ?? revenuePerCustomer;
      const targetCalls = event.detail.missedCalls ?? missedCalls;
      runPresentation(targetRevenue, targetCalls);
    };

    window.addEventListener(
      'updateCalculator',
      handleAIUpdate as EventListener,
    );
    return () =>
      window.removeEventListener(
        'updateCalculator',
        handleAIUpdate as EventListener,
      );
  }, [revenuePerCustomer, missedCalls, presentationMode, runPresentation]);

  // Listen for show_calculator (scroll-only, no animation)
  useEffect(() => {
    const handleShowCalculator = () => {
      if (alreadyScrolledRef.current) return;
      alreadyScrolledRef.current = true;
      const cardEl = document.getElementById('calculator-card');
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        document
          .getElementById('calculator')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    window.addEventListener('showCalculator', handleShowCalculator);
    return () =>
      window.removeEventListener('showCalculator', handleShowCalculator);
  }, []);

  // Load dramatic border preference
  useEffect(() => {
    const savedPreference = localStorage.getItem('dramatic-border-enabled');
    if (savedPreference !== null) {
      setDramaticBorderEnabled(savedPreference === 'true');
    }
  }, []);

  // Save dramatic border preference
  const toggleDramaticBorder = () => {
    const newValue = !dramaticBorderEnabled;
    setDramaticBorderEnabled(newValue);
    localStorage.setItem('dramatic-border-enabled', String(newValue));
  };

  const scenarios = [
    { label: `${t.calculator.scenarios.contractor} (5k)`, val: 5000, calls: 1 },
    { label: `${t.calculator.scenarios.hvac} (800)`, val: 800, calls: 3 },
    { label: `${t.calculator.scenarios.dental} (2k)`, val: 2000, calls: 2 },
  ];

  // Inner content (JSX variable, not a component — avoids remount on re-render)
  const calculatorContent = (
    <div className="grid lg:grid-cols-2 gap-14 relative z-10">
      {/* Controls */}
      <div className="space-y-10">
        {/* Dramatic Border Toggle */}
        <div className="flex justify-end">
          <button
            onClick={toggleDramaticBorder}
            className={`dramatic-toggle-btn ${dramaticBorderEnabled ? 'active' : ''}`}
            title={
              dramaticBorderEnabled
                ? 'Disable dramatic border effect'
                : 'Enable dramatic border effect'
            }
          >
            {dramaticBorderEnabled ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Dramatic On</span>
              </>
            ) : (
              <>
                <X className="w-4 h-4" />
                <span>Dramatic Off</span>
              </>
            )}
          </button>
        </div>

        {/* Presets */}
        <div className="flex gap-2 flex-wrap">
          {scenarios.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                setRevenuePerCustomer(s.val);
                setMissedCalls(s.calls);
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                revenuePerCustomer === s.val && missedCalls === s.calls
                  ? 'bg-text-primary text-bg-main border-text-primary'
                  : 'bg-transparent text-text-secondary border-border hover:border-text-secondary'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Slider 1 */}
        <div id="input-revenue">
          <div className="flex justify-between mb-4">
            <label className="text-text-secondary font-medium flex items-center gap-2">
              {t.currency === '$' ? (
                <DollarSign className="w-4 h-4 text-brand-primary" />
              ) : (
                <Euro className="w-4 h-4 text-brand-primary" />
              )}
              {t.calculator.revenueLabel}
            </label>
            <span className="text-text-primary font-bold bg-bg-card px-3 py-1 rounded-lg border border-border">
              {t.currency}
              {revenuePerCustomer.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min="100"
            max="10000"
            step="100"
            value={revenuePerCustomer}
            onChange={(e) => {
              if (presentationMode) cancelPresentation();
              setRevenuePerCustomer(Number(e.target.value));
            }}
            className="w-full h-2 bg-bg-card rounded-lg appearance-none cursor-pointer accent-brand-primary"
          />
        </div>

        {/* Slider 2 */}
        <div id="input-calls">
          <div className="flex justify-between mb-4">
            <label className="text-text-secondary font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-money-loss" />{' '}
              {t.calculator.missedLabel}
            </label>
            <span className="text-text-primary font-bold bg-bg-card px-3 py-1 rounded-lg border border-border">
              {missedCalls}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={missedCalls}
            onChange={(e) => {
              if (presentationMode) cancelPresentation();
              setMissedCalls(Number(e.target.value));
            }}
            className="w-full h-2 bg-bg-card rounded-lg appearance-none cursor-pointer accent-brand-primary"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col justify-center gap-7" id="result-box">
        <motion.div
          animate={controls}
          className="glass-card rounded-2xl p-7 text-center relative overflow-hidden"
          style={{
            background: 'rgba(239,68,68,0.06)',
            borderColor: 'rgba(239,68,68,0.25)',
            boxShadow:
              '0 0 40px rgba(239,68,68,0.08) inset, 0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(239,68,68,0.08), transparent)',
            }}
          />
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-400 mb-2 relative z-10">
            {t.calculator.monthlyLoss}
          </p>
          <h3 className="text-[3.5rem] lg:text-[4rem] font-bold font-display tracking-[-0.04em] text-text-primary mb-2 relative z-10 leading-none">
            {t.currency}
            {(presentationMode
              ? displayedMonthlyLoss
              : monthlyLoss
            ).toLocaleString()}
          </h3>
          <p className="text-xs text-text-secondary relative z-10">
            {t.calculator.disclaimer}
          </p>
        </motion.div>

        <motion.div
          animate={yearlyControls}
          className="glass-card rounded-2xl p-6 text-center"
          style={{
            opacity: yearlyVisible ? 1 : 0,
            transition: 'opacity 500ms ease-in',
          }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary mb-2">
            {t.calculator.yearlyLoss}
          </p>
          <h3 className="text-[2.75rem] font-bold font-display tracking-[-0.04em] text-text-primary leading-none">
            {t.currency}
            {yearlyLoss.toLocaleString()}
          </h3>
        </motion.div>

        <div className="bg-money-gain/10 border border-money-gain/20 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-money-gain text-white flex items-center justify-center font-bold shrink-0">
            AI
          </div>
          <p className="text-sm text-text-primary font-medium">
            {t.calculator.cta}{' '}
            <span className="underline decoration-2 decoration-money-gain text-money-gain">
              {t.calculator.ctaHighlight}
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <section className="py-12 md:py-24 relative section-grid-bg" id="calculator">
      <div className="page-container">
        <div className="text-center mb-8 md:mb-16">
          <div className="flex justify-center mb-4">
            <span className="section-eyebrow">Revenue Loss Calculator</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-4 tracking-[-0.02em] text-text-primary">
            {t.calculator.title}{' '}
            <span className="text-gradient-danger">
              {t.calculator.titleHighlight}
            </span>
          </h2>
          <p className="text-text-secondary text-base max-w-xl mx-auto">
            {t.calculator.subtitle}
          </p>
        </div>

        {dramaticBorderEnabled ? (
          /* Dramatic Animated Border Wrapper */
          <div className="dramatic-border-container" id="calculator-card">
            <div className="dramatic-border-inner">
              <div className="dramatic-border-outer">
                <div className="dramatic-main-card glass-card rounded-3xl shadow-2xl relative overflow-hidden bg-white/80 dark:bg-bg-card">
                  {/* Animated Border Layer - Only affects border, not content */}
                  <div className="dramatic-border-animation"></div>

                  {/* Content Layer - Clearly visible */}
                  <div className="relative z-10 p-4 sm:p-8 lg:p-14">
                    {/* Background Ambient Light */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-money-loss/10 rounded-full blur-[100px] pointer-events-none" />
                    {calculatorContent}
                  </div>
                </div>
              </div>
              <div className="dramatic-glow-layer-1"></div>
              <div className="dramatic-glow-layer-2"></div>
            </div>

            <div className="dramatic-overlay-1"></div>
            <div className="dramatic-overlay-2"></div>
            <div className="dramatic-background-glow"></div>
          </div>
        ) : (
          /* Standard Glass Card (no dramatic border) */
          <div id="calculator-card" className="glass-card rounded-3xl p-4 sm:p-8 lg:p-14 shadow-2xl relative overflow-hidden bg-white/80 dark:bg-bg-card">
            {/* Background Ambient Light */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-money-loss/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Toggle button for re-enabling */}
            <div className="flex justify-end mb-4">
              <button
                onClick={toggleDramaticBorder}
                className="dramatic-toggle-btn"
                title="Enable dramatic border effect"
              >
                <Sparkles className="w-4 h-4" />
                <span>Enable Effect</span>
              </button>
            </div>

            {calculatorContent}
          </div>
        )}
      </div>
    </section>
  );
};

export default Calculator;
