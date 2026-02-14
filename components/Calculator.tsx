import React, { useState, useEffect, useMemo } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { AlertTriangle, DollarSign, Euro } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Calculator: React.FC = () =>
{
  const { t } = useLanguage();
  const [revenuePerCustomer, setRevenuePerCustomer] = useState(800);
  const [missedCalls, setMissedCalls] = useState(3);

  // Logic: Missed Calls * 30 Days * 25% Booking Rate * Avg Ticket Price
  const monthlyLoss = useMemo(() =>
  {
    return Math.floor(missedCalls * 30 * 0.25 * revenuePerCustomer);
  }, [revenuePerCustomer, missedCalls]);

  const yearlyLoss = useMemo(() =>
  {
    return monthlyLoss * 12;
  }, [monthlyLoss]);

  const controls = useAnimation();

  useEffect(() =>
  {
    controls.start({
      scale: [1, 1.02, 1],
      transition: { duration: 0.3 }
    });
  }, [monthlyLoss, controls]);

  // Listen for AI Agent events
  useEffect(() =>
  {
    const handleAIUpdate = (event: CustomEvent) =>
    {
      if (event.detail.revenue) setRevenuePerCustomer(event.detail.revenue);
      if (event.detail.missedCalls) setMissedCalls(event.detail.missedCalls);
    };

    window.addEventListener('updateCalculator', handleAIUpdate as EventListener);
    return () => window.removeEventListener('updateCalculator', handleAIUpdate as EventListener);
  }, []);

  const scenarios = [
    { label: `${t.calculator.scenarios.contractor} (5k)`, val: 5000, calls: 1 },
    { label: `${t.calculator.scenarios.hvac} (800)`, val: 800, calls: 3 },
    { label: `${t.calculator.scenarios.dental} (2k)`, val: 2000, calls: 2 },
  ];

  return (
    <section className="py-20 relative border-y border-border" id="calculator">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-4 text-text-primary">{t.calculator.title} <span className="text-gradient-danger">{t.calculator.titleHighlight}</span></h2>
          <p className="text-text-secondary text-lg">{t.calculator.subtitle}</p>
        </div>

        <div className="glass-card rounded-3xl p-8 lg:p-12 shadow-2xl relative overflow-hidden">
          {/* Background Ambient Light */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-money-loss/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="grid lg:grid-cols-2 gap-12 relative z-10">
            {/* Controls */}
            <div className="space-y-10">
              {/* Presets */}
              <div className="flex gap-2 flex-wrap">
                {scenarios.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setRevenuePerCustomer(s.val); setMissedCalls(s.calls); }}
                    className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${revenuePerCustomer === s.val && missedCalls === s.calls
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
                    {t.currency === '$' ? <DollarSign className="w-4 h-4 text-brand-primary" /> : <Euro className="w-4 h-4 text-brand-primary" />}
                    {t.calculator.revenueLabel}
                  </label>
                  <span className="text-text-primary font-bold bg-bg-card px-3 py-1 rounded-lg border border-border">
                    {t.currency}{revenuePerCustomer.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={revenuePerCustomer}
                  onChange={(e) => setRevenuePerCustomer(Number(e.target.value))}
                  className="w-full h-2 bg-bg-card rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
              </div>

              {/* Slider 2 */}
              <div id="input-calls">
                <div className="flex justify-between mb-4">
                  <label className="text-text-secondary font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-money-loss" /> {t.calculator.missedLabel}
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
                  onChange={(e) => setMissedCalls(Number(e.target.value))}
                  className="w-full h-2 bg-bg-card rounded-lg appearance-none cursor-pointer accent-brand-primary"
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex flex-col justify-center gap-6" id="result-box">
              <motion.div
                animate={controls}
                className="glass-card bg-money-loss/10 border-money-loss/30 rounded-2xl p-6 text-center"
              >
                <p className="text-money-loss font-semibold uppercase tracking-wider text-sm mb-1">{t.calculator.monthlyLoss}</p>
                <h3 className="text-5xl font-bold text-text-primary mb-2">{t.currency}{monthlyLoss.toLocaleString()}</h3>
                <p className="text-xs text-text-secondary">{t.calculator.disclaimer}</p>
              </motion.div>

              <motion.div
                animate={controls}
                className="glass-card bg-bg-card border-border rounded-2xl p-6 text-center"
              >
                <p className="text-text-secondary font-semibold uppercase tracking-wider text-sm mb-1">{t.calculator.yearlyLoss}</p>
                <h3 className="text-4xl font-bold text-text-primary">{t.currency}{yearlyLoss.toLocaleString()}</h3>
              </motion.div>

              <div className="bg-money-gain/10 border border-money-gain/20 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-money-gain text-white flex items-center justify-center font-bold shrink-0">
                  AI
                </div>
                <p className="text-sm text-text-primary font-medium">
                  {t.calculator.cta} <span className="underline decoration-2 decoration-money-gain text-money-gain">{t.calculator.ctaHighlight}</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Calculator;