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

  useScrollLock(expandedCard !== null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedCard(null);
    };
    if (expandedCard) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [expandedCard]);

  // Preload all industry images on mount so subsequent slides don't flash
  useEffect(() => {
    const urls = [...Object.values(industryImages), fallbackImage];
    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  const { emblaRef, emblaApi, selectedIndex } = useAutoplayCarousel({
    delay: 4000,
    loop: true,
    align: 'center',
    skipSnaps: false,
    dragFree: false,
    disableAutoplay: prefersReducedMotion,
  });

  // Pause/resume autoplay imperatively when modal opens/closes.
  // Toggling the plugin array on the hook does NOT work because
  // useEmblaCarousel only reads its plugins at init time.
  useEffect(() => {
    const autoplay = (emblaApi?.plugins() as any)?.autoplay;
    if (expandedCard !== null) {
      autoplay?.stop();
    } else {
      autoplay?.play();
    }
  }, [emblaApi, expandedCard]);

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
          <span className="text-brand-primary">{t.industries.titleHighlight}</span>
          <span className="text-text-primary"> {t.industries.titleSuffix}</span>
        </h2>
        <p className="mx-auto max-w-2xl text-base text-text-secondary md:text-lg">
          {t.industries.subtitle}
        </p>
      </div>

      {/* Carousel */}
      <div className="relative max-w-[1400px] mx-auto px-4">
        {/* Prev arrow */}
        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          className="absolute left-2 sm:left-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-bg-glass/85 text-text-secondary shadow-[0_14px_32px_rgba(0,0,0,0.16)] backdrop-blur-md transition-all duration-300 hover:border-brand-primary/35 hover:bg-bg-card hover:text-text-primary"
          aria-label="Previous industry"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true" focusable="false">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Next arrow */}
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          className="absolute right-2 sm:right-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-bg-glass/85 text-text-secondary shadow-[0_14px_32px_rgba(0,0,0,0.16)] backdrop-blur-md transition-all duration-300 hover:border-brand-primary/35 hover:bg-bg-card hover:text-text-primary"
          aria-label="Next industry"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true" focusable="false">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* Embla viewport */}
        <div
          className="overflow-hidden mx-2 xs:mx-4 sm:mx-6 md:mx-14 cursor-grab active:cursor-grabbing"
          ref={emblaRef}
        >
          <div className="flex items-stretch">
            {industries.map((card, i) => {
              const isActive = i === selectedIndex;
              return (
                <div
                  key={card.id}
                  className="flex-[0_0_80%] xs:flex-[0_0_75%] sm:flex-[0_0_65%] md:flex-[0_0_32%] min-w-0 pl-4 xs:pl-5"
                >
                  {/*
                   * Card: image-first design — no card-surface class (avoids opaque
                   * gradient background + backdrop-filter compositing issues).
                   * Content is minimal: title + Learn More button only so every
                   * card looks identical regardless of description length.
                   */}
                  <div
                    className={cn(
                      'group relative aspect-[3/4] md:aspect-[2/3] overflow-hidden rounded-2xl md:rounded-3xl border transition-[opacity,border-color] duration-300',
                      isActive
                        ? 'border-brand-primary/40 shadow-[0_24px_60px_rgba(0,0,0,0.35)] opacity-100'
                        : 'border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.25)] opacity-95',
                    )}
                  >
                    {/* Full-cover background image */}
                    <img
                      src={card.image}
                      alt={card.title}
                      draggable={false}
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                      className="absolute inset-0 h-full w-full object-cover object-center select-none pointer-events-none"
                      style={{ filter: 'brightness(0.95) contrast(1.08) saturate(0.92)' }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = fallbackImage;
                      }}
                    />

                    {/* Single gradient — light at top, heavy at bottom for text legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                    {/* Card content — anchored to bottom, minimal so all cards match */}
                    <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55 mb-1.5">
                        Use Case
                      </p>
                      <h3 className="font-display font-bold text-xl md:text-2xl text-white leading-tight mb-4 line-clamp-1">
                        {card.title}
                      </h3>
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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-primary/60 bg-brand-primary/20 px-4 py-2 text-xs font-semibold text-brand-primary backdrop-blur-sm transition-all hover:bg-brand-primary/35 hover:border-brand-primary/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50"
                      >
                        Learn More
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Swipe hint — mobile only */}
        <div className="flex justify-center items-center gap-2 mt-4 md:hidden">
          <svg className="w-4 h-4 text-text-secondary animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M14 4.5V12l2.5-1.5M14 12l-2.5-1.5M14 12v7.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 4.5V12l-2.5-1.5M10 12l2.5-1.5M10 12v7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs text-text-secondary font-medium">Drag cards to explore</span>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-6 md:mt-8" role="tablist" aria-label="Industry slides">
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

      {/* Detail modal — z-[70] sits above the navbar (z-50) */}
      <AnimatePresence>
        {expandedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[70] flex items-end md:items-center justify-center"
            onClick={() => setExpandedCard(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Details about ${expandedCard.title}`}
          >
            {/* Backdrop — fully covers navbar */}
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              style={{ touchAction: 'none' }}
            />

            {/* Full-bleed image panel — image is the background, text floats over it */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 flex w-full flex-col h-[88vh] landscape:h-[95vh] md:h-auto md:max-h-[85vh] md:max-w-xl md:mx-4 md:mb-6 rounded-t-3xl md:rounded-3xl overflow-hidden"
            >
              {/* Image fills the entire panel as background */}
              <img
                src={expandedCard.image}
                alt={expandedCard.title}
                className="absolute inset-0 h-full w-full object-cover object-center"
                style={{ filter: 'brightness(0.95) contrast(1.08) saturate(0.92)' }}
              />

              {/* Gradient overlay — transparent at top, opaque at bottom for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10" />

              {/* Mobile swipe handle */}
              <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none md:hidden">
                <div className="w-10 h-1 rounded-full bg-white/30" />
              </div>

              {/* Content — pushed to bottom, floats over the gradient */}
              <div className="relative z-10 mt-auto flex flex-col">
                {/* Scrollable text — capped so close button stays on screen */}
                <div
                  className="overflow-y-auto px-5 md:px-7 pt-6 pb-3"
                  style={{
                    maxHeight: '55vh',
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-primary/80 mb-2">
                    Use Case
                  </p>
                  <h3 className="text-2xl font-bold font-display text-white leading-tight mb-3">
                    {expandedCard.title}
                  </h3>

                  {/* ROI stat chip */}
                  <div className="w-fit px-3 py-1.5 rounded-lg border border-brand-primary/30 bg-brand-primary/15 mb-4">
                    <span className="text-xs font-bold text-brand-primary leading-none">
                      {expandedCard.stat}
                    </span>
                  </div>

                  <p className="text-sm md:text-base leading-relaxed text-white/85">
                    {expandedCard.description}
                  </p>
                </div>

                {/* Close button — always visible, never scrolls away */}
                <div className="flex-shrink-0 px-5 md:px-7 pb-6 pt-3">
                  <button
                    type="button"
                    onClick={() => setExpandedCard(null)}
                    className="w-full rounded-xl py-3.5 text-sm font-semibold text-accent-ink transition-all active:scale-[0.98] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default IndustrySlider;
