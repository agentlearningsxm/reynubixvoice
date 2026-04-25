import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { fallbackImage, industryImages } from '../data/industry-images';
import { useAutoplayCarousel } from '../hooks/useAutoplayCarousel';
import { useScrollLock } from '../hooks/useScrollLock';
import { cn } from '../lib/utils';

const IndustrySlider: React.FC = () => {
  const { t } = useLanguage();
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [expandedCard, setExpandedCard] = useState<{
    title: string;
    stat: string;
    description: string;
    image: string;
  } | null>(null);

  // Lock body scroll when bottom sheet is open
  useScrollLock(expandedCard !== null);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedCard(null);
    };
    if (expandedCard) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [expandedCard]);

  const { emblaRef, emblaApi, selectedIndex } = useAutoplayCarousel({
    delay: 4000,
    loop: true,
    align: 'center',
    skipSnaps: false,
    dragFree: false,
    disableAutoplay: prefersReducedMotion,
  });

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const selectHandler = () => setIsDragging(false);
    const dragStartHandler = () => setIsDragging(true);
    const dragEndHandler = () => setIsDragging(false);
    emblaApi.on('select', selectHandler);
    emblaApi.on('pointerDown', dragStartHandler);
    emblaApi.on('pointerUp', dragEndHandler);
    return () => {
      emblaApi.off('select', selectHandler);
      emblaApi.off('pointerDown', dragStartHandler);
      emblaApi.off('pointerUp', dragEndHandler);
    };
  }, [emblaApi]);

  const industries = Object.entries(t.industries.items).map(([key, item]) => {
    const data = item as { name: string; stat: string; desc: string };
    return {
      id: key,
      title: key === 'hvac' ? 'Plumbing & AC' : data.name,
      stat: data.stat,
      description: data.desc,
      image: industryImages[key] || fallbackImage,
    };
  });

  // Voice agent carousel navigation
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!emblaApi) return;
      if (detail?.index !== undefined) {
        emblaApi.scrollTo(detail.index);
      } else if (detail?.carousel === 'industry') {
        if (detail.action === 'next') emblaApi.scrollNext();
        else if (detail.action === 'prev') emblaApi.scrollPrev();
        else {
          const idx = parseInt(detail.action, 10);
          if (!Number.isNaN(idx)) emblaApi.scrollTo(idx);
        }
      }
    };
    window.addEventListener('navigateCarousel', handler);
    return () => window.removeEventListener('navigateCarousel', handler);
  }, [emblaApi]);

  return (
    <section
      id="solutions"
      className="relative w-full py-16 md:py-24 section-grid-bg text-text-primary"
      style={{ minHeight: '480px' }}
    >
      {/* Header */}
      <div className="text-center px-4 sm:px-6 mb-8 md:mb-14">
        <div className="flex justify-center mb-4">
          <span className="section-eyebrow">Industries We Serve</span>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold leading-tight tracking-[-0.02em] mb-3">
          <span className="text-text-primary">{t.industries.title} </span>
          <span className="text-brand-primary">
            {t.industries.titleHighlight}
          </span>
          <span className="text-text-primary"> {t.industries.titleSuffix}</span>
        </h2>
        <p className="mx-auto max-w-2xl text-base text-text-secondary md:text-lg">
          {t.industries.subtitle}
        </p>
      </div>

      {/* Carousel */}
      <div className="relative max-w-[1400px] mx-auto px-4">
        {/* Prev / Next arrowsvisible on ALL viewports */}
        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          className="absolute left-2 sm:left-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-bg-glass/85 text-text-secondary shadow-[0_14px_32px_rgba(0,0,0,0.16)] backdrop-blur-md transition-all duration-300 hover:border-brand-primary/35 hover:bg-bg-card hover:text-text-primary"
          aria-label="Previous industry"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          className="absolute right-2 sm:right-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-bg-glass/85 text-text-secondary shadow-[0_14px_32px_rgba(0,0,0,0.16)] backdrop-blur-md transition-all duration-300 hover:border-brand-primary/35 hover:bg-bg-card hover:text-text-primary"
          aria-label="Next industry"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* Embla viewport */}
        <div
          className="overflow-hidden mx-2 xs:mx-4 sm:mx-6 md:mx-14 cursor-grab active:cursor-grabbing"
          ref={emblaRef}
        >
          <div className="flex">
            {industries.map((card, i) => {
              const isActive = i === selectedIndex;
              return (
                <div
                  key={card.id}
                  className="flex-[0_0_88%] xs:flex-[0_0_85%] sm:flex-[0_0_75%] md:flex-[0_0_33.333%] min-w-0 pl-4 xs:pl-5"
                >
                  <div
                    className={cn(
                      'card-surface group relative aspect-[4/5] xs:aspect-[3/4] md:aspect-[5/7] overflow-hidden rounded-[20px] xs:rounded-[24px] md:rounded-[28px] border-border/80 transition-all duration-300',
                      isActive
                        ? 'z-10 scale-[1.02] border-brand-primary/30 bg-bg-card/90 opacity-100 shadow-[0_24px_60px_rgba(0,0,0,0.24)]'
                        : 'scale-[0.97] bg-bg-card/70 opacity-80 shadow-[0_12px_30px_rgba(0,0,0,0.14)]',
                    )}
                  >
                    <img
                      src={card.image}
                      alt={card.title}
                      draggable={false}
                      className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div
                      className={cn(
                        'absolute inset-0 transition-colors duration-300',
                        isActive
                          ? 'bg-black/28'
                          : 'bg-black/38 group-hover:bg-black/52',
                      )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/40 to-black/10" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_42%)] opacity-70" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-[1]">
                      <p className="mb-1.5 md:mb-2 text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                        Use Case
                      </p>
                      <h3 className="font-display font-bold text-base md:text-xl lg:text-2xl text-white drop-shadow-lg leading-tight mb-2 md:mb-3">
                        {card.title}
                      </h3>
                      <p className="text-xs md:text-sm lg:text-base leading-relaxed text-white/85 mb-3 line-clamp-3">
                        {card.description}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCard({
                            title: card.title,
                            stat: card.stat,
                            description: card.description,
                            image: card.image,
                          });
                        }}
                        className="text-xs font-medium text-brand-primary hover:text-brand-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 rounded"
                      >
                        Learn More →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Swipe hint - mobile only */}
        <div className="flex justify-center items-center gap-2 mt-4 md:hidden">
          <svg
            className="w-4 h-4 text-text-secondary animate-pulse"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              d="M14 4.5V12l2.5-1.5M14 12l-2.5-1.5M14 12v7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10 4.5V12l-2.5-1.5M10 12l2.5-1.5M10 12v7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-xs text-text-secondary font-medium">
            Drag cards to explore
          </span>
        </div>

        {/* Dots */}
        <div
          className="flex justify-center gap-2 mt-6 md:mt-8"
          role="tablist"
          aria-label="Industry slides"
        >
          {industries.map((card, i) => (
            <button
              key={card.id}
              type="button"
              role="tab"
              aria-selected={i === selectedIndex}
              aria-label={card.title}
              onClick={() => emblaApi?.scrollTo(i)}
              className={cn(
                'w-2.5 h-2.5 p-2 rounded-full transition-all duration-300 cursor-pointer',
                i === selectedIndex
                  ? 'bg-[var(--accent-primary)] scale-125'
                  : 'bg-text-secondary/55 hover:bg-text-secondary/80',
              )}
            />
          ))}
        </div>
      </div>

      {/* Expanded description modal */}
      <AnimatePresence>
        {expandedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
            onClick={() => setExpandedCard(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Details about ${expandedCard.title}`}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              style={{ touchAction: 'none' }}
            />

            {/* Bottom sheet / centered dialog */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full md:max-w-xl md:mx-4 md:mb-8 max-h-[85vh] landscape:max-h-[92vh] rounded-t-3xl md:rounded-3xl bg-gradient-to-b from-[#1a1714] to-[#0d0b09] border-t md:border border-border/60 shadow-2xl"
              style={{
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
              }}
            >
              {/* Scrollable content wrapper */}
              <div
                className="overflow-y-auto"
                style={{
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {/* Handle bar */}
                <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2 bg-gradient-to-b from-[#1a1714] to-transparent">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>

                {/* Hero image preview */}
                <div className="relative h-52 mx-4 rounded-2xl overflow-hidden mb-5">
                  <img
                    src={expandedCard.image}
                    alt={expandedCard.title}
                    className="h-full w-full object-cover object-center"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1714] via-black/30 to-transparent" />
                </div>

                {/* Content */}
                <div className="px-4 sm:px-6 pb-8">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-primary/80 mb-2">
                    Use Case
                  </p>
                  <h3 className="text-xl font-bold font-display text-white mb-3 leading-tight">
                    {expandedCard.title}
                  </h3>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 mb-4">
                    <span className="text-xs font-bold text-brand-primary">{expandedCard.stat}</span>
                  </div>
                  <p className="text-[clamp(0.875rem,3vw,1rem)] leading-relaxed text-white/85">
                    {expandedCard.description}
                  </p>
                </div>
              </div>

              {/* Close button */}
              <div className="sticky bottom-0 px-4 sm:px-6 pb-6 pt-3 bg-gradient-to-t from-[#1a1714] to-transparent">
                <button
                  type="button"
                  onClick={() => setExpandedCard(null)}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-accent-ink transition-all active:scale-[0.98] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default IndustrySlider;
