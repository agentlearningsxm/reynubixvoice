import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Comparison: React.FC = () =>
{
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-bg-card" id="comparison">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-4 text-text-primary">
            {t.comparison.title} <span className="text-money-gain">{t.comparison.titleHighlight}</span> {t.comparison.titleSuffix}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">

          {/* Old Way */}
          <div className="glass-card p-8 lg:p-10 rounded-3xl border-l-4 border-money-loss relative">
            <div className="absolute top-6 right-6 text-money-loss opacity-20">
              <XCircle size={100} />
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-3">
              <span className="text-money-loss bg-money-loss/10 p-2 rounded-lg"><XCircle size={24} /></span>
              {t.comparison.oldWay.title}
            </h3>
            <ul className="space-y-6 relative z-10">
              {t.comparison.oldWay.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-text-secondary">
                  <div className="mt-1 min-w-[6px] h-1.5 rounded-full bg-text-secondary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* AI Way */}
          <div className="glass-card p-8 lg:p-10 rounded-3xl border-l-4 border-money-gain bg-gradient-to-br from-money-gain/5 to-transparent relative">
            <div className="absolute top-6 right-6 text-money-gain opacity-20">
              <CheckCircle2 size={100} />
            </div>
            <h3 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-3">
              <span className="text-money-gain bg-money-gain/10 p-2 rounded-lg"><CheckCircle2 size={24} /></span>
              {t.comparison.aiWay.title}
            </h3>
            <ul className="space-y-6 relative z-10">
              {t.comparison.aiWay.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-text-primary font-medium">
                  <CheckCircle2 className="w-5 h-5 text-money-gain shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Comparison;