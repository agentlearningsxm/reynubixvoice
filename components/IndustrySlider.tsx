import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Stethoscope, Home, TreePine, Car, Info } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const IndustrySlider: React.FC = () => {
  const { t } = useLanguage();
  
  // Create industries array from translations
  // Removed hardcoded gradient colors to rely on theme accent or specific colors. 
  // Keeping industry specific colors for distinctness but ensuring they work in light/dark.
  const industries = [
    {
      id: 'hvac',
      ...t.industries.items.hvac,
      icon: <Wrench className="w-8 h-8" />,
      color: 'from-blue-500 to-cyan-400',
    },
    {
      id: 'dental',
      ...t.industries.items.dental,
      icon: <Stethoscope className="w-8 h-8" />,
      color: 'from-teal-400 to-emerald-400',
    },
    {
      id: 'roofing',
      ...t.industries.items.roofing,
      icon: <Home className="w-8 h-8" />,
      color: 'from-orange-500 to-red-500',
    },
    {
      id: 'landscaping',
      ...t.industries.items.tree,
      icon: <TreePine className="w-8 h-8" />,
      color: 'from-green-500 to-lime-400',
    },
    {
      id: 'auto',
      ...t.industries.items.auto,
      icon: <Car className="w-8 h-8" />,
      color: 'from-indigo-500 to-purple-500',
    }
  ];

  const [selected, setSelected] = useState(industries[0]);

  useEffect(() => {
    const updatedSelected = industries.find(i => i.id === selected.id) || industries[0];
    setSelected(updatedSelected);
  }, [t, selected.id]);

  return (
    <section className="py-24 relative overflow-hidden" id="solutions">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-4 text-text-primary">
            {t.industries.title} <span className="text-brand-primary">{t.industries.titleHighlight}</span> {t.industries.titleSuffix}
          </h2>
          <p className="text-text-secondary text-lg">{t.industries.subtitle}</p>
        </div>

        {/* Icons Row */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {industries.map((industry) => (
            <motion.button
              key={industry.id}
              onClick={() => setSelected(industry)}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.95 }}
              className={`p-6 rounded-2xl glass-card transition-all duration-300 flex flex-col items-center gap-3 min-w-[140px] ${
                selected.id === industry.id 
                  ? `bg-gradient-to-br ${industry.color} bg-opacity-20 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]` 
                  : 'hover:bg-bg-card'
              }`}
            >
              <div className={`text-white ${selected.id === industry.id ? 'opacity-100' : 'opacity-70 text-text-secondary'}`}>
                {industry.icon}
              </div>
              <span className={`font-semibold text-sm ${selected.id === industry.id ? 'text-white' : 'text-text-secondary'}`}>{industry.name}</span>
            </motion.button>
          ))}
        </div>

        {/* Details Panel */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="glass-card rounded-3xl p-8 lg:p-12 border-t border-white/10 relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${selected.color}`} />
              
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${selected.color} flex items-center justify-center text-white shadow-lg shrink-0`}>
                  {selected.icon}
                </div>
                
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-2xl font-bold text-text-primary mb-2">{selected.name} Solutions</h3>
                  <p className="text-text-secondary text-lg leading-relaxed mb-4">{selected.desc}</p>
                  
                  <div className="inline-flex items-center gap-2 bg-bg-card border border-border rounded-lg px-4 py-2">
                    <Info className="w-4 h-4 text-brand-primary" />
                    <span className="font-semibold text-brand-primary">{selected.stat}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
};

export default IndustrySlider;