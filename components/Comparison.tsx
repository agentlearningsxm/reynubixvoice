import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { IMAGES } from '../data/comparison-images';
import { useAutoplayCarousel } from '../hooks/useAutoplayCarousel';

const Comparison = () => {
  const { t } = useLanguage();
  const cards = t.comparison.gallery.map((card, i) => ({
    ...card,
    image: IMAGES[i],
  }));
  const navButtonClassName =
    'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-bg-glass/85 text-text-secondary shadow-[0_14px_32px_rgba(0,0,0,0.16)] backdrop-blur-md transition-all duration-300 hover:border-brand-primary/35 hover:bg-bg-card hover:text-text-primary';

  const { emblaRef, emblaApi, selectedIndex } = useAutoplayCarousel({
    delay: 5000,
    loop: true,
    align: 'center',
  });

  // Voice agent carousel navigation (custom event)
  useEffect(() => {
    const handler = (e: Event) => {
      const { carousel, action } = (e as CustomEvent).detail;
      if (carousel !== 'comparison' || !emblaApi) return;
      if (action === 'next') emblaApi.scrollNext();
      else if (action === 'prev') emblaApi.scrollPrev();
      else {
        const idx = parseInt(action, 10);
        if (!Number.isNaN(idx) && idx >= 0 && idx < cards.length)
          emblaApi.scrollTo(idx);
      }
    };
    window.addEventListener('navigateCarousel', handler);
    return () => window.removeEventListener('navigateCarousel', handler);
  }, [emblaApi, cards.length]);

  return (
    <section
      className="py-10 sm:py-14 md:py-28 section-grid-bg overflow-hidden relative min-h-[420px] sm:min-h-[550px] md:min-h-[650px] flex flex-col items-center justify-center"
      id="comparison"
    >
      <div className="absolute inset-0 bg-gradient pointer-events-none" />

      <div className="page-container relative z-10 flex flex-col items-center">
        {/* Header */}
        <header className="text-center mb-10 md:mb-14">
          <div className="flex justify-center mb-4">
            <span className="section-eyebrow">Interactive Showcase</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold font-display tracking-[-0.02em] text-text-primary">
            {t.comparison.title}{' '}
            <span className="text-brand-primary">
              {t.comparison.titleHighlight}
            </span>
            {t.comparison.titleSuffix ? ` ${t.comparison.titleSuffix}` : ''}
          </h2>
        </header>

        {/* Carousel */}
        <div className="relative w-full max-w-[1400px] mx-auto">
          {/* Prev button */}
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            className={`${navButtonClassName} left-2 sm:left-3 md:left-3 h-11 w-11 md:h-12 md:w-12`}
            aria-label="Previous comparison"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Next button */}
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            className={`${navButtonClassName} right-2 sm:right-3 md:right-3 h-11 w-11 md:h-12 md:w-12`}
            aria-label="Next comparison"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Embla viewport */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y">
              {cards.map((card, i) => (
                <div
                  key={card.title}
                  className="flex-[0_0_85%] md:flex-[0_0_60%] lg:flex-[0_0_45%] min-w-0 pl-5"
                >
                  <div
                    className={clsx(
                      'card-surface relative overflow-hidden rounded-[28px] transition-all duration-500 ease-out motion-reduce:transition-none',
                      i === selectedIndex
                        ? 'scale-100 border-brand-primary/30 bg-bg-card/90 opacity-100 shadow-[0_24px_60px_rgba(0,0,0,0.24)]'
                        : 'scale-[0.97] border-border/70 bg-bg-card/70 opacity-75 shadow-[0_12px_30px_rgba(0,0,0,0.14)]',
                    )}
                  >
                    {/* Card image */}
                    <div className="relative h-32 sm:h-40 md:h-52 overflow-hidden">
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500"
                        style={{ backgroundImage: `url(${card.image})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/15 to-transparent" />
                    </div>
                    {/* Card content */}
                    <div className="bg-bg-glass/80 p-4 sm:p-6 backdrop-blur-xl md:p-7">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                        0{i + 1} / 0{cards.length}
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-text-primary">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-brand-primary">
                        {card.subtitle}
                      </p>
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-text-secondary">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dot navigation */}
        <div className="flex justify-center gap-2 mt-6">
          {cards.map((_, i) => (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: static dot navigation, items never reorder
              key={`comparison-dot-${i}`}
              data-index={i}
              type="button"
              onClick={() => emblaApi?.scrollTo(i)}
              className={clsx(
                'h-2.5 p-2 rounded-full transition-all duration-300',
                i === selectedIndex
                  ? 'w-8 bg-brand-primary'
                  : 'w-2.5 bg-border/80 hover:bg-text-secondary/80',
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Comparison;
