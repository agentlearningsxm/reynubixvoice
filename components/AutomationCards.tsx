import { motion } from 'framer-motion';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AUTOMATION_TOOLS } from '../data/automation-tools';
import { useAutoplayCarousel } from '../hooks/useAutoplayCarousel';

// Generate code text for ASCII card effect
const generateCode = (width: number, height: number): string => {
  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr: string[]) => arr[randInt(0, arr.length - 1)];

  const library = [
    '// automation workflow - ai powered',
    '/* generated for visual effect */',
    'const SCAN_WIDTH = 8;',
    'const MAX_PARTICLES = 2500;',
    'const TRANSITION = 0.05;',
    'function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }',
    'function lerp(a, b, t) { return a + (b - a) * t; }',
    'const now = () => performance.now();',
    'function rng(min, max) { return Math.random() * (max - min) + min; }',
    'class Automation0 {',
    '  constructor(trigger, action, condition) {',
    '    this.trigger = trigger;',
    '    this.action = action;',
    '  }',
    '  async execute() { await this.action(); }',
    '}',
    'const workflow = {',
    "  triggers: ['webhook', 'schedule', 'event'],",
    "  actions: ['api_call', 'transform', 'notify'],",
    "  status: 'active',",
    '};',
  ];

  for (let i = 0; i < 40; i++) {
    library.push(`const v${i} = (${randInt(1, 9)} + ${randInt(10, 99)}) * 0.${randInt(1, 9)};`);
  }

  let flow = library.join(' ').replace(/\s+/g, ' ').trim();
  const totalChars = width * height;
  while (flow.length < totalChars + width) {
    flow += ` ${pick(library).replace(/\s+/g, ' ').trim()}`;
  }

  let out = '';
  let offset = 0;
  for (let row = 0; row < height; row++) {
    let line = flow.slice(offset, offset + width);
    if (line.length < width) line = line + ' '.repeat(width - line.length);
    out += line + (row < height - 1 ? '\n' : '');
    offset += width;
  }
  return out;
};

// ─── Desktop: Physics-based scrolling cards ───
const DesktopCardStream: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardLineRef = useRef<HTMLDivElement>(null);
  const velocityDisplayRef = useRef<HTMLSpanElement>(null);
  const positionRef = useRef(0);
  const velocityRef = useRef(120);
  const directionRef = useRef(-1);
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const mouseVelocityRef = useRef(0);
  const animationRef = useRef<number | undefined>(undefined);
  const cardWrappersRef = useRef<HTMLElement[]>([]);
  const lastTimeRef = useRef(0);

  const updateCardClipping = useCallback(() => {
    const scannerX = window.innerWidth / 2;
    const scannerWidth = 8;
    const scannerLeft = scannerX - scannerWidth / 2;
    const scannerRight = scannerX + scannerWidth / 2;

    cardWrappersRef.current.forEach((wrapper) => {
      const rect = wrapper.getBoundingClientRect();
      const cardLeft = rect.left;
      const cardRight = rect.right;
      const cardWidth = rect.width;

      const normalCard = wrapper.querySelector('.card-normal') as HTMLElement;
      const asciiCard = wrapper.querySelector('.card-ascii') as HTMLElement;

      if (cardLeft < scannerRight && cardRight > scannerLeft) {
        const scannerIntersectLeft = Math.max(scannerLeft - cardLeft, 0);
        const scannerIntersectRight = Math.min(scannerRight - cardLeft, cardWidth);
        const normalClipRight = (scannerIntersectLeft / cardWidth) * 100;
        const asciiClipLeft = (scannerIntersectRight / cardWidth) * 100;

        if (normalCard && asciiCard) {
          normalCard.style.setProperty('--clip-right', `${normalClipRight}%`);
          asciiCard.style.setProperty('--clip-left', `${asciiClipLeft}%`);
        }
      } else if (cardRight < scannerLeft) {
        normalCard?.style.setProperty('--clip-right', '100%');
        asciiCard?.style.setProperty('--clip-left', '100%');
      } else if (cardLeft > scannerRight) {
        normalCard?.style.setProperty('--clip-right', '0%');
        asciiCard?.style.setProperty('--clip-left', '0%');
      }
    });
  }, []);

  // Animation loop
  useEffect(() => {
    const cardLine = cardLineRef.current;
    if (!cardLine) return;

    cardWrappersRef.current = Array.from(
      cardLine.querySelectorAll('.card-wrapper'),
    ) as HTMLElement[];

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      if (!isDraggingRef.current) {
        const friction = 0.95;
        const minVelocity = 30;

        if (velocityRef.current > minVelocity) {
          velocityRef.current *= friction;
        } else {
          velocityRef.current = Math.max(minVelocity, velocityRef.current);
        }

        positionRef.current += velocityRef.current * directionRef.current * deltaTime;

        if (velocityDisplayRef.current) {
          velocityDisplayRef.current.textContent = String(Math.round(velocityRef.current));
        }

        const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
        const cardLineWidth = cardLine.scrollWidth;

        if (positionRef.current < -cardLineWidth) {
          positionRef.current = containerWidth;
        } else if (positionRef.current > containerWidth) {
          positionRef.current = -cardLineWidth;
        }

        cardLine.style.transform = `translateX(${positionRef.current}px)`;
        updateCardClipping();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [updateCardClipping]);

  // Voice agent carousel navigation
  useEffect(() => {
    const handler = (e: Event) => {
      const { carousel, action } = (e as CustomEvent).detail;
      if (carousel !== 'automation') return;
      if (action === 'next') {
        directionRef.current = -1;
        velocityRef.current = Math.max(velocityRef.current, 300);
      } else if (action === 'prev') {
        directionRef.current = 1;
        velocityRef.current = Math.max(velocityRef.current, 300);
      }
    };
    window.addEventListener('navigateCarousel', handler);
    return () => window.removeEventListener('navigateCarousel', handler);
  }, []);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMouseXRef.current = e.clientX;
    mouseVelocityRef.current = 0;
    cardLineRef.current?.classList.add('dragging');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMouseXRef.current;
    positionRef.current += deltaX;
    mouseVelocityRef.current = deltaX * 60;
    lastMouseXRef.current = e.clientX;
    if (cardLineRef.current) {
      cardLineRef.current.style.transform = `translateX(${positionRef.current}px)`;
    }
    updateCardClipping();
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    cardLineRef.current?.classList.remove('dragging');

    if (Math.abs(mouseVelocityRef.current) > 30) {
      velocityRef.current = Math.abs(mouseVelocityRef.current);
      directionRef.current = mouseVelocityRef.current > 0 ? 1 : -1;
    } else {
      velocityRef.current = 120;
    }
  };

  // Memoize cards (generateCode is expensive)
  const cards = useMemo(() => {
    const charWidth = 6;
    const lineHeight = 13;
    const w = Math.floor(400 / charWidth);
    const h = Math.floor(250 / lineHeight);

    return Array.from({ length: 30 }, (_, i) => {
      const tool = AUTOMATION_TOOLS[i % AUTOMATION_TOOLS.length];
      const codeContent = generateCode(w, h);

      return (
        <div key={i} className="card-wrapper" data-index={i}>
          <div className="card card-normal">
            <div
              className="card-gradient bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
              style={{ '--brand-color': tool.color } as React.CSSProperties}
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ background: `linear-gradient(90deg, transparent, ${tool.color}, transparent)` }}
              />
              <div
                className="absolute inset-0 opacity-10"
                style={{ background: `radial-gradient(circle at 50% 0%, ${tool.color}40, transparent 70%)` }}
              />
              <div className="card-content relative z-10">
                <div className="card-logo-wrapper">
                  <div className="card-logo-glow" style={{ backgroundColor: tool.color }} />
                  <div className="card-logo">
                    <img
                      src={tool.logo}
                      alt={tool.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          `https://ui-avatars.com/api/?name=${tool.name}&background=ffffff&color=${tool.color.slice(1)}&size=48`;
                      }}
                    />
                  </div>
                </div>
                <h3 className="card-title">{tool.name}</h3>
                <p className="card-description">{tool.description}</p>
                <div className="card-footer">
                  <span
                    className="card-badge"
                    style={{
                      backgroundColor: `${tool.color}20`,
                      color: tool.color,
                      border: `1px solid ${tool.color}40`,
                    }}
                  >
                    AI Automation
                  </span>
                  <span className="card-status" style={{ color: tool.color }}>
                    ● Active
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="card card-ascii">
            <div className="ascii-content">{codeContent}</div>
          </div>
        </div>
      );
    });
  }, []);

  return (
    <>
      {/* Speed indicator */}
      <div className="absolute top-4 right-4 z-50">
        <div className="glass-card px-4 py-2 rounded-full text-sm text-text-secondary">
          Speed:{' '}
          <span ref={velocityDisplayRef} className="text-brand-primary font-mono">
            120
          </span>{' '}
          px/s
        </div>
      </div>

      {/* Card stream container */}
      <div
        ref={containerRef}
        className="relative w-full h-[340px] flex items-center overflow-hidden"
        style={{ cursor: 'grab' }}
      >
        {/* CSS scanner line (replaces Three.js canvas) */}
        <div
          className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[8px] z-[15] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(200,169,96,0.6), transparent)',
            boxShadow: '0 0 30px rgba(200,169,96,0.3), 0 0 60px rgba(200,169,96,0.15)',
          }}
        />

        {/* Card stream */}
        <div className="card-stream absolute w-full flex items-center overflow-visible" style={{ height: '180px' }}>
          <div
            ref={cardLineRef}
            className="card-line flex items-center whitespace-nowrap select-none"
            style={{ gap: '60px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => {
              isDraggingRef.current = true;
              lastMouseXRef.current = e.touches[0].clientX;
              mouseVelocityRef.current = 0;
              cardLineRef.current?.classList.add('dragging');
            }}
            onTouchMove={(e) => {
              if (!isDraggingRef.current) return;
              const deltaX = e.touches[0].clientX - lastMouseXRef.current;
              positionRef.current += deltaX;
              mouseVelocityRef.current = deltaX * 60;
              lastMouseXRef.current = e.touches[0].clientX;
              if (cardLineRef.current) {
                cardLineRef.current.style.transform = `translateX(${positionRef.current}px)`;
              }
              updateCardClipping();
            }}
            onTouchEnd={handleMouseUp}
          >
            {cards}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex justify-center mt-10 relative z-20">
        <div
          className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border"
          style={{
            background: 'rgba(200, 169, 96, 0.06)',
            borderColor: 'rgba(200, 169, 96, 0.25)',
          }}
        >
          <span className="flex items-center gap-1 text-brand-primary" aria-hidden="true">
            <svg className="w-4 h-4 opacity-50 drag-hint-left" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 3a1 1 0 0 1 1 1v5.268l.724-.434A1 1 0 0 1 12 10v3a5 5 0 0 1-5 5H6a5 5 0 0 1-5-5v-2.5a1 1 0 0 1 1.5-.866L4 10.732V4a1 1 0 0 1 1-1zm6 0a1 1 0 0 1 1 1v6.732l1.5-.998A1 1 0 0 1 19 10.5V13a5 5 0 0 1-5 5h-1a5 5 0 0 1-.276-.008A6.001 6.001 0 0 0 14 13v-3a3 3 0 0 0-.684-1.898L13 7.732V4a1 1 0 0 1 1-1z" />
            </svg>
            <svg className="w-4 h-4 opacity-50 drag-hint-right" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-sm font-medium text-text-primary">Drag to explore</span>
          <span className="h-3.5 w-px bg-border/60" aria-hidden="true" />
          <span className="text-xs text-text-secondary">Cards reveal code when scanned</span>
        </div>
      </div>
    </>
  );
};

// ─── Mobile: Embla carousel ───
const MobileCarousel: React.FC = () => {
  const { emblaRef, emblaApi, selectedIndex, scrollTo } = useAutoplayCarousel({
    delay: 3000,
    loop: true,
    align: 'center',
    dragFree: false,
    stopOnMouseEnter: false,
  });

  // Voice agent carousel navigation
  useEffect(() => {
    const handler = (e: Event) => {
      const { carousel, action } = (e as CustomEvent).detail;
      if (carousel !== 'automation' || !emblaApi) return;
      if (action === 'next') emblaApi.scrollNext();
      else if (action === 'prev') emblaApi.scrollPrev();
    };
    window.addEventListener('navigateCarousel', handler);
    return () => window.removeEventListener('navigateCarousel', handler);
  }, [emblaApi]);

  return (
    <>
      <div className="relative min-h-[360px] flex items-center">
        <div className="automation-scanner" aria-hidden="true" />
        <div className="overflow-hidden w-full" ref={emblaRef}>
          <div className="flex">
            {AUTOMATION_TOOLS.map((tool) => (
              <div className="flex-[0_0_85%] min-w-0 pl-4" key={tool.name}>
                <div
                  className="relative rounded-2xl overflow-hidden h-[320px]"
                  style={{ '--brand-color': tool.color } as React.CSSProperties}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: `linear-gradient(90deg, transparent, ${tool.color}, transparent)` }}
                  />
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${tool.color}40, transparent 70%)` }}
                  />
                  <div className="relative z-10 p-6 flex flex-col h-full">
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <div
                        className="absolute inset-[-4px] rounded-[18px] opacity-35 blur-[10px]"
                        style={{ backgroundColor: tool.color }}
                      />
                      <div className="relative w-14 h-14 bg-white/95 rounded-[14px] flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)] p-2.5">
                        <img
                          src={tool.logo}
                          alt={tool.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              `https://ui-avatars.com/api/?name=${tool.name}&background=ffffff&color=${tool.color.slice(1)}&size=48`;
                          }}
                        />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-2.5 leading-tight">{tool.name}</h3>
                    <p className="text-xs text-white/75 mt-1.5 leading-relaxed line-clamp-4 flex-grow">{tool.description}</p>
                    <div className="flex justify-between items-center mt-auto pt-2">
                      <span
                        className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                        style={{
                          backgroundColor: `${tool.color}20`,
                          color: tool.color,
                          border: `1px solid ${tool.color}40`,
                        }}
                      >
                        AI Automation
                      </span>
                      <span className="text-[11px] font-medium" style={{ color: tool.color }}>
                        ● Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center gap-2 mt-6 relative z-20" role="tablist" aria-label="Carousel navigation">
        {AUTOMATION_TOOLS.map((tool, i) => (
          <button
            key={tool.name}
            type="button"
            role="tab"
            aria-selected={i === selectedIndex}
            aria-label={`Go to ${tool.name}`}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === selectedIndex
                ? 'bg-brand-primary w-6'
                : 'bg-text-secondary/30 hover:bg-text-secondary/60'
            }`}
            onClick={() => scrollTo(i)}
          />
        ))}
      </div>

      <div className="flex justify-center mt-4 relative z-20">
        <span className="text-xs text-text-secondary">Swipe or drag to explore</span>
      </div>
    </>
  );
};

// ─── Main component ───
const AutomationCards: React.FC = () => {
  return (
    <section
      className="py-14 md:py-28 relative overflow-hidden section-grid-bg"
      id="automations"
    >
      {/* CSS background glow */}
      <div className="automation-glow absolute inset-0 pointer-events-none" />

      <div className="page-container relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-16"
        >
          <div className="flex justify-center mb-4">
            <span className="section-eyebrow">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary" />
              </span>
              And we're not done yet...
            </span>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold font-display tracking-[-0.02em] mb-4 text-text-primary">
            You Also Get <span className="text-gradient">Automations</span> to
            Speed Up Your Productivity
          </h2>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Leverage pre-built automation templates and configure them to fit
            your unique workflow requirements
          </p>
        </motion.div>
      </div>

      {/* Desktop: physics-based card stream with scanner */}
      <div className="hidden md:block relative">
        <DesktopCardStream />
      </div>

      {/* Mobile: Embla carousel */}
      <div className="md:hidden">
        <MobileCarousel />
      </div>
    </section>
  );
};

export default AutomationCards;
