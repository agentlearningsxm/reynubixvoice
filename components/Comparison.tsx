import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { IMAGES } from '../data/comparison-images';
import { useAutoplayCarousel } from '../hooks/useAutoplayCarousel';
import { useScrollLock } from '../hooks/useScrollLock';

const Comparison = () => {
  const { t } = useLanguage();
  const [expandedCard, setExpandedCard] = useState<{
    title: string;
    subtitle: string;
    description: string;
    image: string;
    index: number;
  } | null>(null);

  useScrollLock(expandedCard !== null);

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
          <div
            className="overflow-hidden mx-2 xs:mx-4 sm:mx-6 md:mx-10"
            ref={emblaRef}
          >
            <div className="flex touch-pan-y">
              {cards.map((card, i) => (
                <div
                  key={card.title}
                  className="flex-[0_0_88%] xs:flex-[0_0_85%] sm:flex-[0_0_75%] md:flex-[0_0_60%] lg:flex-[0_0_45%] min-w-0 pl-4 xs:pl-5"
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCard({
                            title: card.title,
                            subtitle: card.subtitle,
                            description: card.description,
                            image: card.image,
                            index: i,
                          });
                        }}
                        className="md:hidden mt-3 text-xs font-medium text-brand-primary/80 underline underline-offset-2 decoration-brand-primary/30 hover:text-brand-primary hover:decoration-brand-primary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 rounded"
                      >
                        Read more
                      </button>
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

      {/* Expanded description modal - mobile only */}
      <AnimatePresence>
        {expandedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:hidden"
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

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-bg-card border border-border/60 shadow-2xl"
              style={{
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
              }}
            >
              {/* Scrollable content */}
              <div
                className="overflow-y-auto"
                style={{
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {/* Card image */}
                <div className="relative h-40 rounded-t-2xl overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${expandedCard.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/20 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                    {expandedCard.index + 1} / {cards.length}
                  </div>
                  <h3 className="text-xl font-bold text-text-primary font-display leading-tight">
                    {expandedCard.title}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-brand-primary">
                    {expandedCard.subtitle}
                  </p>
                  <p className="mt-4 text-[clamp(0.875rem,3vw,1rem)] leading-relaxed text-text-secondary">
                    {expandedCard.description}
                  </p>
                </div>
              </div>

              {/* Close button */}
              <div className="sticky bottom-0 px-6 pb-6 pt-3 bg-gradient-to-t from-bg-card to-transparent">
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

export default Comparison;
