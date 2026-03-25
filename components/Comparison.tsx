import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { useLanguage } from '../contexts/LanguageContext';

const IMAGES = [
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
  'https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=600&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80',
];

const Comparison = () => {
  const { t } = useLanguage();
  const cards = t.comparison.gallery.map((card, i) => ({ ...card, image: IMAGES[i] }));

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'center' },
    [Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true })],
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

  // Voice agent carousel navigation (custom event)
  useEffect(() => {
    const handler = (e: Event) => {
      const { carousel, action } = (e as CustomEvent).detail;
      if (carousel !== 'comparison' || !emblaApi) return;
      if (action === 'next') emblaApi.scrollNext();
      else if (action === 'prev') emblaApi.scrollPrev();
      else {
        const idx = parseInt(action, 10);
        if (!Number.isNaN(idx) && idx >= 0 && idx < cards.length) emblaApi.scrollTo(idx);
      }
    };
    window.addEventListener('navigateCarousel', handler);
    return () => window.removeEventListener('navigateCarousel', handler);
  }, [emblaApi, cards.length]);

  return (
    <section
      className="py-14 md:py-28 section-grid-bg overflow-hidden relative min-h-[550px] md:min-h-[650px] flex flex-col items-center justify-center"
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
            <span className="text-brand-primary">{t.comparison.titleHighlight}</span>
            {t.comparison.titleSuffix ? ` ${t.comparison.titleSuffix}` : ''}
          </h2>
        </header>

        {/* Carousel */}
        <div className="relative w-full max-w-5xl mx-auto">
          {/* Prev button */}
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-1 md:left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 md:w-10 md:h-10 rounded-full bg-bg-glass/80 backdrop-blur-sm border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Previous comparison"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Next button */}
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-1 md:right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 md:w-10 md:h-10 rounded-full bg-bg-glass/80 backdrop-blur-sm border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Next comparison"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Embla viewport */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y">
              {cards.map((card, i) => (
                <div
                  key={i}
                  className="flex-[0_0_90%] md:flex-[0_0_70%] lg:flex-[0_0_60%] min-w-0 pl-4"
                >
                  <div
                    className={clsx(
                      'relative rounded-2xl overflow-hidden border transition-all duration-500 ease-out motion-reduce:transition-none',
                      i === selectedIndex
                        ? 'scale-100 opacity-100 shadow-2xl border-brand-primary/30'
                        : 'scale-95 opacity-60 shadow-md border-border-subtle',
                    )}
                  >
                    {/* Card image */}
                    <div
                      className="h-40 md:h-52 bg-cover bg-center"
                      style={{ backgroundImage: `url(${card.image})` }}
                    />
                    {/* Card content */}
                    <div className="p-5 md:p-6 bg-bg-glass/60 backdrop-blur-md">
                      <div className="text-xs text-text-secondary mb-1">
                        0{i + 1} / 0{cards.length}
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-text-primary">{card.title}</h3>
                      <p className="text-sm text-brand-primary font-medium mt-1">{card.subtitle}</p>
                      <p className="text-xs md:text-sm text-text-secondary/80 mt-2 line-clamp-3">
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
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={clsx(
                'h-2.5 rounded-full transition-all duration-300',
                i === selectedIndex ? 'bg-brand-primary w-8' : 'bg-border-subtle hover:bg-text-secondary w-2.5',
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
