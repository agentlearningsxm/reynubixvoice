import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { motion } from 'framer-motion';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

// Automation tools data with logos and descriptions
const AUTOMATION_TOOLS = [
  {
    name: 'Claude Code',
    description:
      'Builds and updates your website, apps, and digital tools automatically — saving you thousands in developer costs every month.',
    logo: '/claude-logo-light.png',
    color: '#D97706',
  },
  {
    name: 'n8n',
    description:
      'Connects all your business apps together so data flows automatically — no more copying and pasting between your CRM, email, calendar, and billing.',
    logo: '/n8n-logo.webp',
    color: '#EA4B71',
  },
  {
    name: 'Antigravity',
    description:
      'Your 24/7 digital employee that handles research, planning, and complex tasks while you sleep — scaling your team without adding headcount.',
    logo: '/Antigravity-logo.webp',
    color: '#a07d4f',
  },
  {
    name: 'Airtable',
    description:
      'Replaces your messy spreadsheets with a smart database your whole team loves — track projects, clients, and inventory without hiring a developer.',
    logo: '/airtable-logo.webp',
    color: '#FCB400',
  },
  {
    name: 'OpenAI',
    description:
      'Writes your marketing copy, analyzes customer feedback, and creates business strategies on demand — like having an expert consultant always on call.',
    logo: '/chatgpt-logo.webp',
    color: '#00A67E',
  },
  {
    name: 'Retell AI',
    description:
      'Answers every customer call instantly with a natural human voice, books appointments, and never misses a lead — your 24/7 AI receptionist.',
    logo: '/retell-logo-light.png',
    color: '#c8a960',
  },
  {
    name: 'LiveKit',
    description:
      'Powers real-time voice and video conversations with your customers — qualify leads and provide instant support right on your website.',
    logo: '/livekit-logo.webp',
    color: '#FF6B6B',
  },
  {
    name: 'Perplexity',
    description:
      'Delivers instant market research and competitor analysis with verified sources — make confident business decisions in minutes, not weeks.',
    logo: '/Perplexity-logo.webp',
    color: '#20B2AA',
  },
];

const AutomationCards: React.FC = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'center', dragFree: false },
    [Autoplay({ delay: 3000, stopOnInteraction: true })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  // Listen for voice-agent carousel navigation events
  useEffect(() => {
    const handler = (e: Event) => {
      const { carousel, action } = (e as CustomEvent).detail;
      if (carousel !== 'automation' || !emblaApi) return;
      if (action === 'next') emblaApi.scrollNext();
      else if (action === 'prev') emblaApi.scrollPrev();
    };
    window.addEventListener('navigateCarousel', handler);
    return () => window.removeEventListener('navigateCarousel', handler);
  }, [emblaApi]);

  return (
    <section
      className="py-14 md:py-28 relative overflow-hidden section-grid-bg"
      id="automations"
    >
      {/* CSS background glow — replaces Three.js particles, visible on all viewports */}
      <div className="automation-glow absolute inset-0 pointer-events-none" />

      <div className="page-container relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-16"
        >
          <div className="flex justify-center mb-4">
            <span className="section-eyebrow">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary" />
              </span>
              And we're not done yet...
            </span>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold font-display tracking-[-0.02em] mb-4 text-text-primary">
            You Also Get <span className="text-gradient">Automations</span> to
            Speed Up Your Productivity
          </h2>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Leverage pre-built automation templates and configure them to fit
            your unique workflow requirements
          </p>
        </motion.div>
      </div>

      {/* Embla carousel */}
      <div className="relative min-h-[400px] flex items-center">
        {/* CSS scanner sweep — replaces Canvas scanner, visible on all viewports */}
        <div className="automation-scanner" aria-hidden="true" />

        <div className="overflow-hidden w-full" ref={emblaRef}>
          <div className="flex">
            {AUTOMATION_TOOLS.map((tool, i) => (
              <div
                className="flex-[0_0_85%] md:flex-[0_0_45%] lg:flex-[0_0_30%] min-w-0 pl-4"
                key={tool.name}
              >
                <div
                  className="automation-card relative rounded-2xl overflow-hidden h-[320px] md:h-[300px]"
                  style={{ '--brand-color': tool.color } as React.CSSProperties}
                >
                  {/* Card background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

                  {/* Brand color accent bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: `linear-gradient(90deg, transparent, ${tool.color}, transparent)` }}
                  />

                  {/* Subtle brand glow */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${tool.color}40, transparent 70%)` }}
                  />

                  {/* Card content */}
                  <div className="relative z-10 p-6 md:p-7 flex flex-col h-full">
                    {/* Logo */}
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <div
                        className="absolute inset-[-4px] rounded-[18px] opacity-35 blur-[10px]"
                        style={{ backgroundColor: tool.color }}
                      />
                      <div className="relative w-14 h-14 bg-white/95 rounded-[14px] flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)] p-2.5">
                        <img
                          src={tool.logo}
                          alt={tool.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              `https://ui-avatars.com/api/?name=${tool.name}&background=ffffff&color=${tool.color.slice(1)}&size=48`;
                          }}
                        />
                      </div>
                    </div>

                    {/* Text */}
                    <h3 className="text-lg font-bold text-white mt-2.5 leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-white/75 mt-1.5 leading-relaxed line-clamp-4 flex-grow">
                      {tool.description}
                    </p>

                    {/* Footer */}
                    <div className="flex justify-between items-center mt-auto pt-2">
                      <span
                        className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                        style={{
                          backgroundColor: `${tool.color}20`,
                          color: tool.color,
                          border: `1px solid ${tool.color}40`,
                        }}
                      >
                        AI Automation
                      </span>
                      <span className="text-[11px] font-medium" style={{ color: tool.color }}>
                        ● Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center gap-2 mt-6 relative z-20" role="tablist" aria-label="Carousel navigation">
        {AUTOMATION_TOOLS.map((tool, i) => (
          <button
            key={tool.name}
            type="button"
            role="tab"
            aria-selected={i === selectedIndex}
            aria-label={`Go to ${tool.name}`}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === selectedIndex
                ? 'bg-brand-primary w-6'
                : 'bg-text-secondary/30 hover:bg-text-secondary/60'
            }`}
            onClick={() => scrollTo(i)}
          />
        ))}
      </div>

      {/* Instruction hint */}
      <div className="flex justify-center mt-4 relative z-20">
        <span className="text-xs text-text-secondary">
          Swipe or drag to explore
        </span>
      </div>
    </section>
  );
};

export default AutomationCards;
