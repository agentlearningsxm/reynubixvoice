import type { EmblaOptionsType } from 'embla-carousel';
import Autoplay from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';

interface UseAutoplayCarouselOptions {
  delay?: number;
  loop?: boolean;
  align?: EmblaOptionsType['align'];
  skipSnaps?: boolean;
  dragFree?: boolean;
  stopOnInteraction?: boolean;
  stopOnMouseEnter?: boolean;
  disableAutoplay?: boolean;
}

export function useAutoplayCarousel(options: UseAutoplayCarouselOptions = {}) {
  const {
    delay = 4000,
    loop = true,
    align = 'center',
    skipSnaps,
    dragFree,
    stopOnInteraction = true,
    stopOnMouseEnter = true,
    disableAutoplay = false,
  } = options;

  const emblaOptions: EmblaOptionsType = { loop, align };
  if (skipSnaps !== undefined) emblaOptions.skipSnaps = skipSnaps;
  if (dragFree !== undefined) emblaOptions.dragFree = dragFree;

  const plugins = disableAutoplay
    ? []
    : [Autoplay({ delay, stopOnInteraction, stopOnMouseEnter })];

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions, plugins);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  return {
    emblaRef,
    emblaApi,
    selectedIndex,
    scrollPrev,
    scrollNext,
    scrollTo,
  };
}
