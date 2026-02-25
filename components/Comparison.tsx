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
          <h2 className="text-sm font-medium tracking-widest text-text-secondary uppercase mb-3">Interactive Showcase</h2>
          <h1 className="text-4xl lg:text-5xl font-light tracking-tight text-text-primary">
            {t.comparison.title} <span className="font-bold text-brand-primary">{t.comparison.titleHighlight}</span>
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

      <style>{`
        .bg-gradient {
          background: radial-gradient(ellipse 80% 50% at 50% -20%, var(--accent-glow, rgba(59, 130, 246, 0.15)), transparent),
                      radial-gradient(ellipse 60% 40% at 80% 100%, rgba(168, 85, 247, 0.1), transparent),
                      radial-gradient(ellipse 60% 40% at 20% 100%, rgba(34, 197, 94, 0.08), transparent);
        }
        .light .bg-gradient {
          background: radial-gradient(ellipse 80% 50% at 50% -20%, var(--accent-subtle, rgba(59, 130, 246, 0.06)), transparent);
        }
        .bg-grid {
          background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .perspective-container {
          perspective: 1200px;
          overflow: hidden; 
          padding: 40px 0;
        }

        .scene {
          width: 300px;
          height: 400px;
          position: relative;
          transform-style: preserve-3d;
        }

        .carousel {
          width: 100%;
          height: 100%;
          position: absolute;
          transform-style: preserve-3d;
          transition: transform 0.8s cubic-bezier(0.23, 1, 0.32, 1);
        }

        /* Prevent text selection */
        .select-none {
          user-select: none;
          -webkit-user-select: none;
        }

        .light-sphere {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 10%, transparent 50%);
          box-shadow: 0 0 60px 30px var(--accent-subtle, rgba(59, 130, 246, 0.1)),
                      0 0 100px 60px rgba(168, 85, 247, 0.05);
          pointer-events: none;
          z-index: 0;
        }
        .light .light-sphere {
          box-shadow: 0 0 40px 20px var(--accent-subtle, rgba(59, 130, 246, 0.06));
        }

        .carousel__cell {
          position: absolute;
          width: 280px;
          height: 380px;
          left: 10px;
          top: 10px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding: 32px;
          backface-visibility: hidden;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(10, 10, 15, 0.85);
          box-shadow: 0 0 40px rgba(0,0,0,0.5);
        }
        
        .light .carousel__cell {
           background: rgba(255, 255, 255, 1);
           border-color: rgba(0, 0, 0, 0.1);
           box-shadow: 0 10px 40px rgba(0,0,0,0.12);
         }

        .carousel__cell:hover {
          border-color: var(--accent-primary, #3b82f6);
          transform: scale(1.02);
          box-shadow: 0 0 50px var(--accent-subtle, rgba(59, 130, 246, 0.2));
        }

        .cell__image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0.45;
          transition: all 0.6s ease;
        }
        
        .light .cell__image {
          opacity: 0.8;
        }

        /* Dark scrim for text readability over vivid images in light mode */
        .light .carousel__cell::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 40%, transparent 70%);
          pointer-events: none;
          z-index: 1;
          border-radius: 24px;
        }

        .carousel__cell:hover .cell__image {
          transform: scale(1.05);
          opacity: 0.65;
        }
        
        .light .carousel__cell:hover .cell__image {
          opacity: 0.9;
        }

        .cell__description {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: max-height 0.5s cubic-bezier(0.23, 1, 0.32, 1);
          max-height: 4em;
        }

        .carousel__cell:hover .cell__description {
          display: block;
          -webkit-line-clamp: unset !important;
          overflow: visible;
          max-height: 500px;
        }

        .cell__content {
          position: relative;
          z-index: 2;
          text-align: center;
          transform: translateY(10px);
          opacity: 0.9;
          transition: all 0.4s ease;
        }
        
        .light .cell__content p {
           color: #111111;
           font-weight: 500;
        }

        .carousel__cell:hover .cell__content {
          transform: translateY(0);
          opacity: 1;
        }

        .cell__number {
          font-size: 0.625rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.5);
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        
        .light .cell__number {
           color: rgba(0,0,0,0.8);
           font-weight: 700;
        }

        .cell__title {
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
          color: white;
        }
        
        .light .cell__title {
          color: #000000;
        }

        .cell__subtitle {
          font-size: 0.75rem;
          color: var(--accent-primary, #3b82f6);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .nav-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(5px);
        }
        
        .light .nav-btn {
          border-color: rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.5);
          color: #1a1a1a;
        }

        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }
        
        .light .nav-btn:hover {
           background: rgba(0,0,0,0.05);
        }

        .indicator__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          transition: all 0.4s ease;
          cursor: pointer;
        }
        
        .light .indicator__dot {
           background: rgba(0,0,0,0.2);
        }

        .indicator__dot.active {
          background: var(--accent-primary, #3b82f6);
          width: 24px;
          border-radius: 4px;
        }

        .play-btn {
          padding: 8px 20px;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255,255,255,0.7);
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(5px);
        }
        
        .light .play-btn {
           border-color: rgba(0,0,0,0.1);
           background: rgba(255,255,255,0.5);
           color: rgba(0,0,0,0.7);
        }

        .play-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        
        .light .play-btn:hover {
           background: rgba(0,0,0,0.05);
           color: #1a1a1a;
        }

        .play-btn.playing {
          border-color: var(--accent-primary, #3b82f6);
          color: var(--accent-primary, #3b82f6);
          box-shadow: 0 0 15px var(--accent-subtle, rgba(59, 130, 246, 0.2));
        }

        .hint {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.5);
        }
        
        .light .hint {
           color: rgba(0,0,0,0.5);
        }

        .hint kbd {
           padding: 2px 6px;
           background: rgba(255,255,255,0.1);
           border-radius: 4px;
           margin-right: 4px;
        }
        
        .light .hint kbd {
           background: rgba(0,0,0,0.1);
        }
        
        .reflection {
          position: absolute;
          bottom: -40px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 60px;
          background: radial-gradient(ellipse at center, var(--accent-glow, rgba(59,130,246,0.15)) 0%, transparent 70%);
          filter: blur(20px);
          pointer-events: none;
        }
      `}</style>
    </section>
  );
};

export default Comparison;