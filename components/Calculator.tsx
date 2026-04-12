import { motion, useAnimation } from 'framer-motion';
import {
  AlertTriangle,
  ChevronRight,
  DollarSign,
  Euro,
  Sparkles,
  X,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { trackEventFireAndForget } from '../lib/telemetry/browser';
import Button from './ui/Button';

const Calculator: React.FC = () => {
  const { t } = useLanguage();
  const [revenuePerCustomer, setRevenuePerCustomer] = useState(800);
  const [missedCalls, setMissedCalls] = useState(3);
  const [dramaticBorderEnabled, setDramaticBorderEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('calculator-dramatic-border');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });
  const [presentationMode, setPresentationMode] = useState(false);
  const [_presentationStage, setPresentationStage] = useState(0);
  const [displayedMonthlyLoss, setDisplayedMonthlyLoss] = useState(0);
  const [yearlyVisible, setYearlyVisible] = useState(true);
  const presentationTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animationFrames = useRef<number[]>([]);
  const alreadyScrolledRef = useRef(false);
  const runPresentationRef = useRef<(targetRevenue: number, targetCalls: number) => void>(
    () => {},
  );

  // Logic: Missed Calls * 30 Days * 25% Booking Rate * Avg Ticket Price
  const monthlyLoss = useMemo(() => {
    return Math.floor(missedCalls * 30 * 0.25 * revenuePerCustomer);
  }, [revenuePerCustomer, missedCalls]);

  const yearlyLoss = useMemo(() => {
    return monthlyLoss * 12;
  }, [monthlyLoss]);

  const controls = useAnimation();
  const yearlyControls = useAnimation();

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
      const alreadyScrolled = alreadyScrolledRef.current;
      if (!alreadyScrolled) {
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

      // When scroll already happened, skip the settle delay — much snappier
      const d = alreadyScrolled
        ? { s1: 150, s2: 750, s3: 1750, s4: 3500, end: 4500 }
        : { s1: 600, s2: 1200, s3: 2200, s4: 4000, end: 5000 };

      const targetMonthly = Math.floor(targetCalls * 30 * 0.25 * targetRevenue);

      // Stage 1: Revenue slider
      timeouts.push(
        setTimeout(() => {
          setPresentationStage(1);
          animateValue(
            revenuePerCustomer,
            targetRevenue,
            600,
            setRevenuePerCustomer,
          );
        }, d.s1),
      );

      // Stage 2: Missed calls slider
      timeouts.push(
        setTimeout(() => {
          setPresentationStage(2);
          animateValue(missedCalls, targetCalls, 600, setMissedCalls);
        }, d.s2),
      );

      // Stage 3: Monthly loss count-up
      timeouts.push(
        setTimeout(() => {
          setPresentationStage(3);
          animateValue(0, targetMonthly, 1200, setDisplayedMonthlyLoss, () => {
            // Trigger pulse animation on monthly loss card
            controls.start({
              scale: [1, 1.05, 1],
              transition: { duration: 0.4 },
            });
          });
        }, d.s3),
      );

      // Stage 4: Yearly fade-in
      timeouts.push(
        setTimeout(() => {
          setPresentationStage(4);
          setYearlyVisible(true);
        }, d.s4),
      );

      // End presentation mode — sync displayedMonthlyLoss first to prevent flicker
      timeouts.push(
        setTimeout(() => {
          setDisplayedMonthlyLoss(targetMonthly);
          setPresentationMode(false);
          setPresentationStage(0);
          alreadyScrolledRef.current = false;
        }, d.end),
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

  // Keep the ref in sync with the latest runPresentation (avoids stale closure in listener)
  useEffect(() => {
    runPresentationRef.current = runPresentation;
  }, [runPresentation]);

  // Listen for AI Agent events — stable listener, never re-registered
  useEffect(() => {
    const handleAIUpdate = (event: CustomEvent) => {
      const targetRevenue = event.detail.revenue;
      const targetCalls = event.detail.missedCalls;
      runPresentationRef.current(targetRevenue, targetCalls);
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
  }, []);

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

  // Save dramatic border preference
  const toggleDramaticBorder = () => {
    const newValue = !dramaticBorderEnabled;
    setDramaticBorderEnabled(newValue);
    localStorage.setItem('calculator-dramatic-border', String(newValue));
  };

  const scenarios = [
    { label: `${t.calculator.scenarios.contractor} (5k)`, val: 5000, calls: 1 },
    { label: `${t.calculator.scenarios.hvac} (800)`, val: 800, calls: 3 },
    { label: `${t.calculator.scenarios.dental} (2k)`, val: 2000, calls: 2 },
  ];
  const activeMonthlyLoss = presentationMode
    ? displayedMonthlyLoss
    : monthlyLoss;

  // Inner content (JSX variable, not a componentavoids remount on re-render)
  const calculatorContent = (
    <div className="relative z-10 grid gap-4 md:gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
      {/* Controls */}
      <div className="space-y-5 lg:pr-2">
        <div className="rounded-[28px] border border-border-subtle bg-surface-raised/92 p-3 xs:p-4 sm:p-5 md:p-6 shadow-[0_22px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted-strong">
                Calculator controls
              </p>
              <div className="space-y-2">
                <h3 className="text-2xl font-display font-semibold tracking-[-0.02em] text-text-primary">
                  Build the clearest revenue proof
                </h3>
                <p className="max-w-md text-sm leading-6 text-text-muted-strong">
                  Start with a preset, then fine-tune the two inputs to match
                  your real missed-call pattern.
                </p>
              </div>
            </div>

            {/* Dramatic Border Toggle */}
            <button
              type="button"
              onClick={toggleDramaticBorder}
              aria-pressed={dramaticBorderEnabled}
              aria-label={
                dramaticBorderEnabled
                  ? 'Disable dramatic border effect'
                  : 'Enable dramatic border effect'
              }
              className={`dramatic-toggle-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:self-start rounded-full border px-4 py-2 min-h-[44px] text-xs font-semibold transition-all duration-200 backdrop-blur-md ${
                dramaticBorderEnabled
                  ? 'active border-brand-primary/30 bg-brand-primary/10 text-text-primary shadow-sm dark:border-brand-primary/40 dark:bg-brand-primary/15'
                  : 'border-border-subtle bg-surface/80 text-text-muted-strong hover:border-border-strong hover:text-text-primary dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20'
              }`}
              title={
                dramaticBorderEnabled
                  ? 'Disable dramatic border effect'
                  : 'Enable dramatic border effect'
              }
            >
              {dramaticBorderEnabled ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Dramatic Border On</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  <span>Dramatic Border Off</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="rounded-[28px] border border-border-subtle bg-surface/88 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted-strong">
              Business presets
            </p>
            <p className="text-sm text-text-muted-strong">
              Load a realistic starting point in one tap.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 xs:gap-3 justify-center sm:justify-start max-w-full">
            {scenarios.map((s) => {
              const isActive =
                revenuePerCustomer === s.val && missedCalls === s.calls;

              return (
                <button
                  key={s.val}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setRevenuePerCustomer(s.val);
                    setMissedCalls(s.calls);
                  }}
                  className={`rounded-full border px-2 xs:px-3 py-1.5 xs:py-2 min-h-[44px] text-xs xs:text-sm font-semibold transition-all duration-200 cursor-pointer backdrop-blur-sm ${
                    isActive
                      ? 'bg-text-primary text-bg-main border-text-primary shadow-sm'
                      : 'bg-surface/84 text-text-muted-strong border-border-subtle hover:border-border-strong hover:text-text-primary dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slider 1 */}
        <div
          id="input-revenue"
          className="rounded-[28px] border border-border-subtle bg-surface/92 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <label
                htmlFor="calculator-revenue-range"
                className="flex items-center gap-2 text-sm font-semibold text-text-primary"
              >
                {t.currency === '$' ? (
                  <DollarSign className="h-4 w-4 text-brand-primary" />
                ) : (
                  <Euro className="h-4 w-4 text-brand-primary" />
                )}
                {t.calculator.revenueLabel}
              </label>
              <p
                id="calculator-revenue-helper"
                className="text-sm leading-6 text-text-muted-strong pr-2"
              >
                Set the average value you earn from a booked customer.
              </p>
            </div>
            <span className="inline-flex w-full sm:w-auto min-w-[7rem] justify-center items-center gap-1 rounded-2xl border border-border-subtle bg-surface-raised/94 px-4 py-2 text-base font-bold text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] dark:border-white/10 dark:bg-white/[0.04]">
              <span>{t.currency}</span>
              <span>{revenuePerCustomer.toLocaleString()}</span>
            </span>
          </div>
          <div className="space-y-3">
            <input
              id="calculator-revenue-range"
              aria-describedby="calculator-revenue-helper"
              type="range"
              min="100"
              max="10000"
              step="100"
              value={revenuePerCustomer}
              onChange={(e) => {
                if (presentationMode) cancelPresentation();
                setRevenuePerCustomer(Number(e.target.value));
              }}
              className="themed-range h-11 sm:h-8 w-full cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted-strong/90">
              <span>
                {t.currency}
                100
              </span>
              <span>
                {t.currency}
                10,000
              </span>
            </div>
          </div>
        </div>

        {/* Slider 2 */}
        <div
          id="input-calls"
          className="rounded-[28px] border border-border-subtle bg-surface/92 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <label
                htmlFor="calculator-calls-range"
                className="flex items-center gap-2 text-sm font-semibold text-text-primary"
              >
                <AlertTriangle className="h-4 w-4 text-money-loss" />
                {t.calculator.missedLabel}
              </label>
              <p
                id="calculator-calls-helper"
                className="text-sm leading-6 text-text-muted-strong pr-2"
              >
                Enter how many inbound calls go unanswered on an average day.
              </p>
            </div>
            <span className="inline-flex w-full sm:w-auto min-w-[5rem] justify-center items-center rounded-2xl border border-border-subtle bg-surface-raised/94 px-4 py-2 text-base font-bold text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] dark:border-white/10 dark:bg-white/[0.04]">
              {missedCalls}
            </span>
          </div>
          <div className="space-y-3">
            <input
              id="calculator-calls-range"
              aria-describedby="calculator-calls-helper"
              type="range"
              min="1"
              max="20"
              step="1"
              value={missedCalls}
              onChange={(e) => {
                if (presentationMode) cancelPresentation();
                setMissedCalls(Number(e.target.value));
              }}
              className="themed-range h-11 sm:h-8 w-full cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.15em] text-text-muted-strong/90">
              <span>1 call/day</span>
              <span>20 calls/day</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div
        className="flex flex-col justify-center gap-5 lg:pl-2"
        id="result-box"
      >
        <div className="rounded-[30px] border border-border-subtle bg-surface/82 p-2 backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.03]">
          <motion.div
            animate={controls}
            className="glass-card relative overflow-hidden rounded-[24px] border border-red-500/15 bg-gradient-to-br from-red-500/12 via-bg-card/85 to-bg-main/95 p-7 text-left backdrop-blur-xl sm:p-8 dark:border-red-400/20 dark:from-red-500/16 dark:via-bg-card/85 dark:to-bg-main/95"
            style={{
              boxShadow:
                '0 24px 60px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.35)',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(239,68,68,0.10), transparent 72%)',
              }}
            />
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="text-xs sm:text-[11px] font-bold uppercase tracking-[0.16em] text-red-400">
                    {t.calculator.monthlyLoss}
                  </p>
                  <p className="max-w-sm text-sm leading-6 text-text-muted-strong">
                    The fastest proof of how much unanswered demand is draining
                    each month.
                  </p>
                </div>
                <div className="inline-flex w-fit items-center self-start sm:self-auto rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs sm:text-[11px] font-bold uppercase tracking-[0.16em] text-red-400">
                  Live proof
                </div>
              </div>

              <div aria-live="polite">
                <h3 className="text-[1.5rem] xs:text-[1.8rem] sm:text-[2.2rem] md:text-[3.7rem] font-display font-bold leading-none tracking-[-0.05em] text-text-primary">
                  {t.currency}
                  {activeMonthlyLoss.toLocaleString()}
                </h3>
                <p className="mt-4 text-sm text-text-muted-strong">
                  {t.calculator.disclaimer}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <motion.div
            animate={yearlyControls}
            className="glass-card rounded-[26px] border border-border-subtle bg-surface-raised/92 p-6 text-left backdrop-blur-xl dark:border-white/10 dark:bg-bg-card/85"
            style={{
              opacity: yearlyVisible ? 1 : 0,
              transition: 'opacity 500ms ease-in',
            }}
          >
            <p className="mb-2 text-xs sm:text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted-strong">
              {t.calculator.yearlyLoss}
            </p>
            <h3 className="text-[1.6rem] xs:text-[2rem] sm:text-[2.2rem] md:text-[2.4rem] font-display font-bold leading-none tracking-[-0.04em] text-text-primary">
              {t.currency}
              {yearlyLoss.toLocaleString()}
            </h3>
            <p className="mt-3 text-sm leading-6 text-text-muted-strong">
              Twelve months of the same leakage if the phone keeps going
              unanswered.
            </p>
          </motion.div>

          <div className="rounded-[26px] border border-money-gain/20 bg-gradient-to-br from-money-gain/10 via-bg-card/75 to-bg-main/88 p-6 backdrop-blur-xl dark:border-money-gain/25 dark:from-money-gain/15 dark:via-bg-card/80 dark:to-bg-main/90">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-money-gain text-sm font-bold text-white shadow-sm">
              AI
            </div>
            <p className="mb-2 text-xs sm:text-[11px] font-bold uppercase tracking-[0.16em] text-money-gain">
              Recovery potential
            </p>
            <p className="text-sm font-medium leading-6 text-text-primary">
              {t.calculator.cta}{' '}
              <span className="text-money-gain underline decoration-2 decoration-money-gain">
                {t.calculator.ctaHighlight}
              </span>
              .
            </p>
          </div>
        </div>

        {/* Post-calculator CTA */}
        <div className="rounded-[28px] border border-border-subtle bg-surface-raised/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 sm:gap-6 text-center sm:text-left lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-muted-strong">
                Next step
              </p>
              <p className="text-2xl font-display font-semibold tracking-[-0.03em] text-text-primary">
                Close the gap before another {t.currency}
                {monthlyLoss.toLocaleString()} slips out.
              </p>
              <p className="max-w-xl text-sm leading-6 text-text-muted-strong">
                Book a free demo and see how the AI receptionist answers,
                qualifies, and books on your numbers.
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              className="w-full justify-center px-8 lg:w-auto lg:min-w-[15rem]"
              data-cal-link="reynubix-voice/let-s-talk"
              data-cal-namespace="let-s-talk"
              data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
              onClick={() =>
                trackEventFireAndForget('cta_click', {
                  location: 'calculator_bottom',
                  target: 'cal.com',
                  cta: 'stop_losing_money',
                })
              }
            >
              Book Your Free Demo
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section
      className="py-10 sm:py-14 md:py-20 relative section-grid-bg"
      id="calculator"
    >
      <div className="page-container">
        <div className="text-center mb-8 md:mb-16">
          <div className="flex justify-center mb-4">
            <span className="section-eyebrow">Revenue Loss Calculator</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-4 tracking-[-0.02em] text-text-primary">
            {t.calculator.title}{' '}
            <span className="text-gradient-danger">
              {t.calculator.titleHighlight}
            </span>
          </h2>
          <p className="text-text-muted-strong text-base max-w-xl mx-auto">
            {t.calculator.subtitle}
          </p>
        </div>

        {dramaticBorderEnabled ? (
          /* Dramatic Animated Border Wrapper */
          <div
            className="dramatic-border-container max-w-full overflow-hidden sm:max-w-none"
            id="calculator-card"
          >
            <div className="dramatic-border-inner">
              <div className="dramatic-border-outer">
                <div className="dramatic-main-card glass-card relative overflow-hidden rounded-3xl border border-border-subtle bg-surface-raised/90 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-bg-card/90">
                  {/* Animated Border Layer - Only affects border, not content */}
                  <div className="dramatic-border-animation"></div>

                  {/* Content Layer - Clearly visible */}
                  <div className="relative z-10 p-4 sm:p-8 lg:p-12">
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
          <div
            id="calculator-card"
            className="glass-card relative overflow-hidden rounded-3xl border border-border-subtle bg-surface-raised/90 p-4 shadow-2xl backdrop-blur-2xl sm:p-8 lg:p-12 dark:border-white/10 dark:bg-bg-card/90"
          >
            {/* Background Ambient Light */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-money-loss/10 rounded-full blur-[100px] pointer-events-none" />

            {calculatorContent}
          </div>
        )}
      </div>
    </section>
  );
};

export default Calculator;
