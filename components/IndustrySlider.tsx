import type React from 'react';
import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { fallbackImage, industryImages } from '../data/industry-images';
import { useAutoplayCarousel } from '../hooks/useAutoplayCarousel';
import { cn } from '../lib/utils';

const IndustrySlider: React.FC = () => {
  const { t } = useLanguage();
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const { emblaRef, emblaApi, selectedIndex } = useAutoplayCarousel({
    delay: 4000,
    loop: true,
    align: 'center',
    skipSnaps: false,
    dragFree: false,
    disableAutoplay: prefersReducedMotion,
  });

  const industries = Object.entries(t.industries.items).map(([key, item]) => {
    const data = item as { name: string; desc: string };
    return {
      id: key,
      title: key === 'hvac' ? 'Plumbing & AC' : data.name,
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
      style={{ minHeight: '600px' }}
    >
      {/* Header */}
      <div className="text-center px-6 mb-10 md:mb-14">
        <div className="flex justify-center mb-4">
          <span className="section-eyebrow">Industries We Serve</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-7xl font-display font-bold leading-tight tracking-[-0.02em] mb-3">
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
          className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-bg-glass/85 text-text-secondary shadow-[0_14px_32px_rgba(0,0,0,0.16)] backdrop-blur-md transition-all duration-300 hover:border-brand-primary/35 hover:bg-bg-card hover:text-text-primary md:h-12 md:w-12"
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
          className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-bg-glass/85 text-text-secondary shadow-[0_14px_32px_rgba(0,0,0,0.16)] backdrop-blur-md transition-all duration-300 hover:border-brand-primary/35 hover:bg-bg-card hover:text-text-primary md:h-12 md:w-12"
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
        <div className="overflow-hidden mx-8 md:mx-14" ref={emblaRef}>
          <div className="flex">
            {industries.map((card, i) => {
              const isActive = i === selectedIndex;
              return (
                <div
                  key={card.id}
                  className="flex-[0_0_85%] md:flex-[0_0_33.333%] min-w-0 pl-5"
                >
                  <div
                    className={cn(
                      'card-surface group relative aspect-[5/7] overflow-hidden rounded-[28px] border-border/80 transition-all duration-300',
                      isActive
                        ? 'z-10 scale-100 border-brand-primary/30 bg-bg-card/90 opacity-100 shadow-[0_24px_60px_rgba(0,0,0,0.24)] md:scale-[1.02]'
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
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72">
                        Use Case
                      </p>
                      <h3 className="font-display font-bold text-xl md:text-2xl text-white drop-shadow-lg">
                        {card.title}
                      </h3>
                      <p
                        className={cn(
                          'mt-3 text-sm leading-relaxed text-white/88 transition-all duration-300 md:text-base',
                          isActive
                            ? 'translate-y-0 opacity-100'
                            : 'translate-y-4 opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100',
                        )}
                      >
                        {card.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dots */}
        <div
          className="flex justify-center gap-2 mt-8"
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
                'w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer',
                i === selectedIndex
                  ? 'bg-[var(--accent-primary)] scale-125'
                  : 'bg-text-secondary/55 hover:bg-text-secondary/80',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustrySlider;
