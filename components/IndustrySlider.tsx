import type React from 'react';
import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { industryImages, fallbackImage } from '../data/industry-images';
import { useAutoplayCarousel } from '../hooks/useAutoplayCarousel';
import { cn } from '../lib/utils';

const IndustrySlider: React.FC = () => {
  const { t } = useLanguage();
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      className="relative w-full py-16 md:py-24 section-grid-bg text-(--text-primary)"
      style={{ minHeight: '600px' }}
    >
      {/* Header */}
      <div className="text-center px-6 mb-10 md:mb-14">
        <div className="flex justify-center mb-4">
          <span className="section-eyebrow">Industries We Serve</span>
        </div>
        <h2 className="text-3xl sm:text-5xl lg:text-7xl font-display font-bold leading-tight tracking-[-0.02em] mb-3">
          <span className="text-text-primary">{t.industries.title} </span>
          <span className="text-brand-primary">{t.industries.titleHighlight}</span>
          <span className="text-text-primary"> {t.industries.titleSuffix}</span>
        </h2>
        <p className="text-text-secondary text-lg opacity-70">{t.industries.subtitle}</p>
      </div>

      {/* Carousel */}
      <div className="relative max-w-7xl mx-auto px-4">
        {/* Prev / Next arrowsvisible on ALL viewports */}
        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[var(--bg-glass)] border border-[var(--border)] flex items-center justify-center text-text-primary backdrop-blur-sm transition-colors hover:bg-[var(--accent-subtle)] cursor-pointer"
          aria-label="Previous industry"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[var(--bg-glass)] border border-[var(--border)] flex items-center justify-center text-text-primary backdrop-blur-sm transition-colors hover:bg-[var(--accent-subtle)] cursor-pointer"
          aria-label="Next industry"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9 18l6-6-6-6" /></svg>
        </button>

        {/* Embla viewport */}
        <div className="overflow-hidden mx-8 md:mx-14" ref={emblaRef}>
          <div className="flex">
            {industries.map((card, i) => {
              const isActive = i === selectedIndex;
              return (
                <div
                  key={card.id}
                  className="flex-[0_0_80%] md:flex-[0_0_33.333%] min-w-0 pl-4"
                >
                  <div
                    className={cn(
                      'relative rounded-2xl overflow-hidden aspect-[5/7] group transition-all duration-300',
                      isActive
                        ? 'scale-100 md:scale-105 shadow-2xl z-10 opacity-100'
                        : 'scale-95 shadow-lg opacity-70',
                    )}
                  >
                    <img
                      src={card.image}
                      alt={card.title}
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 group-hover:blur-[3px] group-hover:brightness-40 pointer-events-none select-none"
                    />
                    {/* Gradient scrim for title readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    {/* Always-visible title at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-[1]">
                      <h3 className="font-display font-bold text-xl md:text-2xl text-white drop-shadow-lg">
                        {card.title}
                      </h3>
                    </div>
                    {/* Hover overlay with description */}
                    <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-center p-4 md:p-6 text-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-400 z-[2] overflow-y-auto scrollbar-none">
                      <h3 className="font-display font-bold text-xl md:text-2xl mb-3 drop-shadow-lg">
                        {card.title}
                      </h3>
                      <p className="text-sm md:text-base leading-relaxed opacity-90">
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
        <div className="flex justify-center gap-2 mt-8" role="tablist" aria-label="Industry slides">
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
                  : 'bg-[var(--text-secondary)] opacity-40 hover:opacity-70',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustrySlider;
