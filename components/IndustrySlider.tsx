import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const IndustrySlider: React.FC = () =>
{
  const { t } = useLanguage();

  // State for drag interaction
  const [rotate, setRotate] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  // Mapping of industry IDs to high-quality specific images
  const industryImages: Record<string, string> = {
    hvac: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=800&auto=format&fit=crop',
    dental: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=800&auto=format&fit=crop',
    roofing: 'https://images.unsplash.com/photo-1632759145351-1d592919f522?q=80&w=800&auto=format&fit=crop',
    tree: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=800&auto=format&fit=crop',
    auto: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop',
  };

  // Prepare industry data with overriding title for HVAC
  const industries = Object.entries(t.industries.items).map(([key, item]) =>
  {
    const data = item as any;
    return {
      id: key,
      title: key === 'hvac' ? 'Plumbing & AC' : data.name,
      description: data.desc,
      image: industryImages[key] || 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop',
    };
  });

  const totalCards = 20;
  const displayCards = Array.from({ length: totalCards }).map((_, i) =>
  {
    return industries[i % industries.length];
  });

  // Momentum animation after release
  const animateMomentum = useCallback(() =>
  {
    const friction = 0.95;
    const minVelocity = 0.00001;

    const step = () =>
    {
      velocityRef.current *= friction;
      if (Math.abs(velocityRef.current) < minVelocity)
      {
        velocityRef.current = 0;
        return;
      }
      setRotate(prev => prev + velocityRef.current);
      animFrameRef.current = requestAnimationFrame(step);
    };
    animFrameRef.current = requestAnimationFrame(step);
  }, []);

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) =>
  {
    // Cancel any ongoing momentum
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    velocityRef.current = 0;

    setIsDragging(true);
    setStartX(e.clientX);
    lastXRef.current = e.clientX;
    lastTimeRef.current = Date.now();
    if (containerRef.current)
    {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) =>
  {
    if (!isDragging) return;
    const delta = e.clientX - startX;
    const now = Date.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0)
    {
      velocityRef.current = (e.clientX - lastXRef.current) / (dt * 50);
    }
    lastXRef.current = e.clientX;
    lastTimeRef.current = now;
    setRotate(prev => prev + delta / 3000);
    setStartX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) =>
  {
    setIsDragging(false);
    if (containerRef.current)
    {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
    // Trigger momentum
    animateMomentum();
  };

  // Keyboard navigation (arrow keys)
  useEffect(() =>
  {
    const handleKeyDown = (e: KeyboardEvent) =>
    {
      if (e.key === 'ArrowLeft')
      {
        setRotate(prev => prev - 0.05);
      } else if (e.key === 'ArrowRight')
      {
        setRotate(prev => prev + 0.05);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cleanup animation frame on unmount
  useEffect(() =>
  {
    return () =>
    {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <section
      className="relative w-full h-[1000px] overflow-hidden bg-[var(--bg-main)] text-[var(--text-primary)]"
      id="solutions"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none', WebkitUserSelect: 'none' }}
    >

      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.bunny.net/css?family=just-me-again-down-here:400');

        /* ALL classes scoped under #solutions to prevent collision with AutomationCards */
        #solutions .industry-wrapper {
          --card-border-radius: 16px;
          --card-width: max(220px, 20vw);
          --card-height: calc(var(--card-width) * 1.4);
          --radius: calc(var(--card-width) * var(--cards) / (2 * 3.1416));

          top: 60%;
          left: 50%;
          transform-origin: center center;
          transform: translateX(-50%) rotate(calc(var(--rotate) * 360deg));
          will-change: transform;
          position: absolute;
          width: calc(var(--radius) * 2);
          height: calc(var(--radius) * 2);
        }

        #solutions .industry-wrapper > .industry-card {
          --card-offset-radius: circle(var(--radius) at 50% 50%);
          --card-offset-distance: calc((var(--card-i) - 1) / var(--cards) * 100%);
          --card-phase: calc((var(--card-i) - 1) / var(--cards) - 0.75);
          --card-pos: mod(calc(var(--card-phase) + var(--rotate) + 1), 1);
          --card-dist: min(var(--card-pos),calc(1 - var(--card-pos)));
          
          --card-grayscale: clamp(0, calc(var(--card-dist) * var(--cards)), 1);
          --card-opacity: calc(1 - (var(--card-dist) / 0.15 ));
          --card-scale: calc(1 - (var(--card-dist) * 0.5)); 

          position: absolute;
          width: var(--card-width);
          aspect-ratio: 5/7;
          border-radius: var(--card-border-radius);
          
          offset-path: var(--card-offset-radius);
          offset-distance: var(--card-offset-distance);
          offset-rotate: auto;
          offset-anchor: 50% 100%;
          
          transform-origin: center calc(var(--card-height) * 2 * -1);
          transform: scale(var(--card-scale));
          
          transition: transform 0.1s linear, box-shadow 0.3s ease;
          box-shadow: 0 20px 50px -10px rgba(0,0,0,0.5);
          overflow: hidden;
          pointer-events: auto;
          
          z-index: calc(100 - (var(--card-dist) * 1000));
        }

        /* Image Styles - SCOPED */
        #solutions .industry-card > img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: inherit;
          transition: transform 0.5s ease;
          pointer-events: none;
          -webkit-user-drag: none;
        }

        /* Hover Effect - SCOPED */
        #solutions .industry-card:hover > img {
          transform: scale(1.1);
          filter: blur(3px) brightness(0.4);
        }

        /* Content Overlay - SCOPED with unique class name */
        #solutions .industry-card-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 1.5rem;
          text-align: center;
          opacity: 0;
          transition: opacity 0.4s ease;
          background: rgba(0, 0, 0, 0.4);
          color: white;
          z-index: 2;
          pointer-events: none;
        }

        #solutions .industry-card:hover .industry-card-overlay {
          opacity: 1;
        }

        #solutions .industry-card-title {
          font-family: var(--font-display, sans-serif);
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
          transform: translateY(10px);
          transition: transform 0.4s ease;
        }

        #solutions .industry-card-desc {
          font-size: 0.95rem;
          line-height: 1.4;
          opacity: 0.9;
          transform: translateY(20px);
          transition: transform 0.4s ease 0.1s; 
        }

        #solutions .industry-card:hover .industry-card-title,
        #solutions .industry-card:hover .industry-card-desc {
          transform: translateY(0);
        }

        @property --rotate {
          syntax: "<number>";
          inherits: true;
          initial-value: 0;
        }
      `}} />

      <div
        className="industry-wrapper"
        style={{
          '--cards': totalCards,
          '--rotate': rotate,
        } as React.CSSProperties}
      >
        {displayCards.map((card, index) => (
          <div
            key={index}
            className="industry-card"
            data-title={card.title}
            style={{ '--card-i': index + 1 } as React.CSSProperties}
            onDragStart={(e) => e.preventDefault()}
          >
            <img src={card.image} alt={card.title} draggable={false} />

            <div className="industry-card-overlay">
              <h3 className="industry-card-title">{card.title}</h3>
              <p className="industry-card-desc">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Hero text below the cards */}
      <div className="absolute bottom-8 left-0 right-0 z-[1] pointer-events-none text-center px-4">
        <div className="flex justify-center mb-4">
          <span className="section-eyebrow">Industries We Serve</span>
        </div>
        <h2 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold leading-tight tracking-[-0.02em] mb-3">
          <span className="text-text-primary">{t.industries.title} </span>
          <span className="text-brand-primary">{t.industries.titleHighlight}</span>
          <span className="text-text-primary"> {t.industries.titleSuffix}</span>
        </h2>
        <p className="text-text-secondary text-lg opacity-70">
          {t.industries.subtitle}
        </p>
      </div>

    </section>
  );
};

export default IndustrySlider;