import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import Button from './ui/Button';

const IMAGES = [
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80", // Tech/Abstract
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80", // Meeting/Handshake -> Man with headset/meeting
  "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80", // Strategy/Board
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80", // Growth/Chart
  "https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=600&q=80", // Professional blonde woman stressed
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80"  // Empty/Void
];

const Comparison: React.FC = () =>
{
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Use gallery from translations
  const cards = t.comparison.gallery.map((card, index) => ({
    ...card,
    image: IMAGES[index]
  }));

  const cellCount = cards.length;
  // Calculate radius based on cell width (280px) + gap
  const radius = 340;
  const theta = 360 / cellCount;

  const rotateCarousel = (index: number) =>
  {
    if (carouselRef.current)
    {
      const angle = index * -theta;
      carouselRef.current.style.transform = `translateZ(-${radius}px) rotateY(${angle}deg)`;
    }
  };

  useEffect(() =>
  {
    rotateCarousel(selectedIndex);
  }, [selectedIndex]);

  const nextSlide = () =>
  {
    setSelectedIndex((prev) => (prev + 1) % cellCount);
  };

  const prevSlide = () =>
  {
    setSelectedIndex((prev) => (prev - 1 + cellCount) % cellCount);
  };

  const toggleAutoPlay = () =>
  {
    setIsPlaying(!isPlaying);
  };

  useEffect(() =>
  {
    if (isPlaying)
    {
      autoPlayRef.current = setInterval(nextSlide, 3000);
    } else
    {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    }
    return () =>
    {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPlaying]);

  // Keyboard Navigation
  useEffect(() =>
  {
    const handleKeyDown = (e: KeyboardEvent) =>
    {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === ' ')
      {
        e.preventDefault();
        toggleAutoPlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Drag / Swipe Logic
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragDiff, setDragDiff] = useState(0);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) =>
  {
    setIsDragging(true);
    setStartX('touches' in e ? e.touches[0].clientX : e.clientX);

    // Disable transition during drag for direct 1:1 feel
    if (carouselRef.current)
    {
      carouselRef.current.style.transition = 'none';
    }
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) =>
  {
    if (!isDragging) return;

    const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const diff = currentX - startX;
    setDragDiff(diff);

    // Rotate visually while dragging
    if (carouselRef.current)
    {
      const currentAngle = selectedIndex * -theta;
      const dragRotation = (diff / window.innerWidth) * 360; // Map drag to rotation
      carouselRef.current.style.transform = `translateZ(-${radius}px) rotateY(${currentAngle + dragRotation}deg)`;
    }
  };

  const handleDragEnd = () =>
  {
    if (!isDragging) return;
    setIsDragging(false);

    // Re-enable transition smoothly
    if (carouselRef.current)
    {
      carouselRef.current.style.transition = 'transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
    }

    // Determine swipe direction threshold (small flick is enough)
    if (dragDiff > 50)
    {
      prevSlide();
    } else if (dragDiff < -50)
    {
      nextSlide();
    } else
    {
      // Snap back if threshold not met
      rotateCarousel(selectedIndex);
    }
    setDragDiff(0);
  };

  return (
    <section className="py-24 bg-bg-main overflow-hidden relative min-h-[800px] flex flex-col items-center justify-center select-none" id="comparison">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-20" />

      <div className="container relative z-10 flex flex-col items-center">
        <header className="text-center mb-12">
          <div className="flex justify-center mb-3">
            <span className="section-eyebrow">Interactive Showcase</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold font-display tracking-[-0.02em] text-text-primary">
            {t.comparison.title} <span className="text-brand-primary">{t.comparison.titleHighlight}</span>
          </h1>
        </header>

        <div
          className="main-content w-full flex justify-center perspective-container cursor-grab active:cursor-grabbing"
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="scene">
            <div className="light-sphere" />
            <div className="carousel" ref={carouselRef}>
              {cards.map((card, i) => (
                <div key={i} className="carousel__cell" style={{
                  transform: `rotateY(${i * theta}deg) translateZ(${radius}px)`
                }}>
                  <div className="cell__image" style={{ backgroundImage: `url(${card.image})` }} />
                  <div className="cell__content">
                    <div className="cell__number">0{i + 1} / 0{cellCount}</div>
                    <div className="cell__title">{card.title}</div>
                    <div className="cell__subtitle">{card.subtitle}</div>
                    <p className="cell__description mt-2 text-xs text-text-secondary/80">{card.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="reflection" />
          </div>
        </div>

        {/* Controls */}
        <div className="absolute top-[50%] -translate-y-[50%] left-[10%] hidden md:flex flex-col items-center gap-4 z-50 pointer-events-none">
          <button onClick={prevSlide} className="nav-btn pointer-events-auto">
            <ChevronLeft size={24} />
          </button>
          <div className="hint text-center">
            <span><kbd>←</kbd> Prev</span>
          </div>
        </div>

        <div className="absolute top-[50%] -translate-y-[50%] right-[10%] hidden md:flex flex-col items-center gap-4 z-50 pointer-events-none">
          <button onClick={nextSlide} className="nav-btn pointer-events-auto">
            <ChevronRight size={24} />
          </button>
          <div className="hint text-center">
            <span><kbd>→</kbd> Next</span>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center gap-6 z-50">
          <div className="flex gap-2">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedIndex(i)}
                className={`indicator__dot ${i === selectedIndex ? 'active' : ''}`}
              />
            ))}
          </div>

          <button
            onClick={toggleAutoPlay}
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
          >
            {isPlaying ? <span className="flex items-center gap-2"><Pause size={12} /> Pause</span> : <span className="flex items-center gap-2"><Play size={12} /> Auto Play</span>}
          </button>
        </div>
      </div>
    </section>
  );
};

export default Comparison;
