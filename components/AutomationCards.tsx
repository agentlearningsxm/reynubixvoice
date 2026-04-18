import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AUTOMATION_TOOLS } from '../data/automation-tools';
import { useAutoplayCarousel } from '../hooks/useAutoplayCarousel';
import { useScrollLock } from '../hooks/useScrollLock';

// ─── Particle type for scanner obliteration effect ───
interface ScanParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  hueShift: number;
  kind: 'spark' | 'ember' | 'debris'; // visual variety
}

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
    library.push(
      `const v${i} = (${randInt(1, 9)} + ${randInt(10, 99)}) * 0.${randInt(1, 9)};`,
    );
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
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
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
  const particlesRef = useRef<ScanParticle[]>([]);
  const prevCardEdgesRef = useRef<Map<number, { left: number; right: number }>>(
    new Map(),
  );
  const canvasDprRef = useRef(1);
  const frameCountRef = useRef(0);
  const cachedRectsRef = useRef<Map<number, DOMRect>>(new Map());

  // Spawn particles at the laser intersection point
  const spawnParticles = useCallback(
    (laserScreenX: number, cardRect: DOMRect, count: number) => {
      const canvas = particleCanvasRef.current;
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const canvasX = laserScreenX - canvasRect.left;
      const cardTopInCanvas = cardRect.top - canvasRect.top;
      const cardBottomInCanvas = cardRect.bottom - canvasRect.top;

      const kinds: Array<ScanParticle['kind']> = ['spark', 'ember', 'debris'];

      for (let i = 0; i < count; i++) {
        const y =
          cardTopInCanvas +
          Math.random() * (cardBottomInCanvas - cardTopInCanvas);
        const kind = kinds[Math.floor(Math.random() * kinds.length)];

        // Sparks: fast, small, spray sideways. Embers: slower, float up. Debris: medium, gravity-heavy.
        let vx: number;
        let vy: number;
        let size: number;
        let life: number;

        if (kind === 'spark') {
          const side = Math.random() > 0.5 ? 1 : -1;
          vx = side * (2.5 + Math.random() * 4);
          vy = -(1 + Math.random() * 3);
          size = 1.5 + Math.random() * 2;
          life = 20 + Math.random() * 25;
        } else if (kind === 'ember') {
          vx = (Math.random() - 0.5) * 2;
          vy = -(2 + Math.random() * 3);
          size = 2.5 + Math.random() * 3;
          life = 35 + Math.random() * 30;
        } else {
          const side = Math.random() > 0.5 ? 1 : -1;
          vx = side * (1 + Math.random() * 2.5);
          vy = -(0.5 + Math.random() * 1.5);
          size = 3 + Math.random() * 3;
          life = 25 + Math.random() * 20;
        }

        const particle: ScanParticle = {
          x: canvasX + (Math.random() - 0.5) * 8,
          y,
          vx,
          vy,
          size,
          opacity: 0.8 + Math.random() * 0.2,
          life,
          maxLife: life,
          hueShift: (Math.random() - 0.5) * 40,
          kind,
        };
        particlesRef.current.push(particle);
      }

      // Performance cap
      if (particlesRef.current.length > 60) {
        particlesRef.current.splice(0, particlesRef.current.length - 60);
      }
    },
    [],
  );

  // Render particles on canvas
  const renderParticles = useCallback(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match container dimensions (handle DPR)
    const container = containerRef.current;
    if (container) {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvasDprRef.current = dpr;
      }
    }

    ctx.clearRect(
      0,
      0,
      canvas.width / canvasDprRef.current,
      canvas.height / canvasDprRef.current,
    );

    const particles = particlesRef.current;
    const alive: ScanParticle[] = [];

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Per-kind physics: sparks decelerate fast, embers float, debris falls
      if (p.kind === 'spark') {
        p.vx *= 0.97;
        p.vy += 0.06;
      } else if (p.kind === 'ember') {
        p.vx *= 0.99;
        p.vy += 0.02; // barely any gravity — floats upward
      } else {
        p.vy += 0.14; // heavier gravity for debris chunks
      }

      p.life -= 1;

      const lifeRatio = p.life / p.maxLife;
      p.opacity = lifeRatio * 0.95;
      const currentSize = p.size * Math.max(lifeRatio, 0.1);

      if (p.life <= 0 || p.opacity <= 0) continue;
      alive.push(p);

      // Gold/amber base color (200, 169, 96) with per-particle hue variation
      const r = Math.min(255, Math.max(0, Math.round(200 + p.hueShift * 0.8)));
      const g = Math.min(255, Math.max(0, Math.round(169 + p.hueShift * 0.3)));
      const b = Math.min(255, Math.max(0, Math.round(96 - p.hueShift * 0.2)));

      if (p.kind === 'spark') {
        // Sparks: bright hot core + wide soft glow
        ctx.globalAlpha = p.opacity * 0.25;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = `rgb(${Math.min(255, r + 55)}, ${Math.min(255, g + 45)}, ${Math.min(255, b + 30)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'ember') {
        // Embers: warm glow, fading softly
        ctx.globalAlpha = p.opacity * 0.4;
        ctx.fillStyle = `rgb(${Math.min(255, r + 20)}, ${Math.min(255, g + 10)}, ${b})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize * 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = p.opacity * 0.9;
        ctx.fillStyle = `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 10)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Debris: solid chunks, minimal glow
        ctx.globalAlpha = p.opacity * 0.15;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 10)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    particlesRef.current = alive;
  }, []);

  const updateCardClipping = useCallback(() => {
    const scannerX = window.innerWidth / 2;
    const scannerWidth = 8;
    const scannerLeft = scannerX - scannerWidth / 2;
    const scannerRight = scannerX + scannerWidth / 2;
    const laserCenter = scannerX;
    // Wider threshold so fast-moving edges are reliably detected
    const edgeThreshold = 20;

    frameCountRef.current += 1;
    const shouldMeasure = frameCountRef.current % 3 === 0;

    cardWrappersRef.current.forEach((wrapper, index) => {
      let rect: DOMRect;
      if (shouldMeasure || !cachedRectsRef.current.has(index)) {
        rect = wrapper.getBoundingClientRect();
        cachedRectsRef.current.set(index, rect);
      } else {
        // biome-ignore lint/style/noNonNullAssertion: key is guaranteed to exist
        rect = cachedRectsRef.current.get(index)!;
      }
      const cardLeft = rect.left;
      const cardRight = rect.right;
      const cardWidth = rect.width;

      const normalCard = wrapper.querySelector('.card-normal') as HTMLElement;
      const asciiCard = wrapper.querySelector('.card-ascii') as HTMLElement;

      if (cardLeft < scannerRight && cardRight > scannerLeft) {
        const scannerIntersectLeft = Math.max(scannerLeft - cardLeft, 0);
        const scannerIntersectRight = Math.min(
          scannerRight - cardLeft,
          cardWidth,
        );
        const normalClipRight = (scannerIntersectLeft / cardWidth) * 100;
        const asciiClipLeft = (scannerIntersectRight / cardWidth) * 100;

        if (normalCard && asciiCard) {
          normalCard.style.setProperty('--clip-right', `${normalClipRight}%`);
          asciiCard.style.setProperty('--clip-left', `${asciiClipLeft}%`);
        }

        // ── Particle emission: detect card edge crossing the laser ──
        const prevEdges = prevCardEdgesRef.current.get(index);
        if (prevEdges) {
          // Left edge: detect crossing (was on one side, now within threshold or crossed)
          const leftDist = Math.abs(cardLeft - laserCenter);
          const prevLeftDist = Math.abs(prevEdges.left - laserCenter);
          const leftCrossed =
            (prevEdges.left > laserCenter && cardLeft <= laserCenter) ||
            (prevEdges.left < laserCenter && cardLeft >= laserCenter);

          if (
            leftCrossed ||
            (leftDist < edgeThreshold && prevLeftDist >= edgeThreshold)
          ) {
            // Big burst when edge crosses through the laser
            spawnParticles(
              laserCenter,
              rect,
              4 + Math.floor(Math.random() * 4),
            );
          } else if (leftDist < edgeThreshold) {
            // Steady spray while edge lingers near laser
            spawnParticles(
              laserCenter,
              rect,
              1 + Math.floor(Math.random() * 2),
            );
          }

          // Right edge: same crossing detection
          const rightDist = Math.abs(cardRight - laserCenter);
          const prevRightDist = Math.abs(prevEdges.right - laserCenter);
          const rightCrossed =
            (prevEdges.right > laserCenter && cardRight <= laserCenter) ||
            (prevEdges.right < laserCenter && cardRight >= laserCenter);

          if (
            rightCrossed ||
            (rightDist < edgeThreshold && prevRightDist >= edgeThreshold)
          ) {
            spawnParticles(
              laserCenter,
              rect,
              4 + Math.floor(Math.random() * 4),
            );
          } else if (rightDist < edgeThreshold) {
            spawnParticles(
              laserCenter,
              rect,
              1 + Math.floor(Math.random() * 2),
            );
          }
        }
        prevCardEdgesRef.current.set(index, {
          left: cardLeft,
          right: cardRight,
        });
      } else if (cardRight < scannerLeft) {
        normalCard?.style.setProperty('--clip-right', '100%');
        asciiCard?.style.setProperty('--clip-left', '100%');
        prevCardEdgesRef.current.set(index, {
          left: cardLeft,
          right: cardRight,
        });
      } else if (cardLeft > scannerRight) {
        normalCard?.style.setProperty('--clip-right', '0%');
        asciiCard?.style.setProperty('--clip-left', '0%');
        prevCardEdgesRef.current.set(index, {
          left: cardLeft,
          right: cardRight,
        });
      }
    });

    // Continuous "sawing" emission: while ANY card body is being cut by the laser,
    // keep spraying particles at the intersection line
    for (let i = 0; i < cardWrappersRef.current.length; i++) {
      let rect: DOMRect | undefined;
      if (shouldMeasure || !cachedRectsRef.current.has(i)) {
        rect = cardWrappersRef.current[i].getBoundingClientRect();
        cachedRectsRef.current.set(i, rect);
      } else {
        rect = cachedRectsRef.current.get(i);
      }
      if (rect && rect.left < laserCenter && rect.right > laserCenter) {
        // 50% chance each frame — creates a steady sawdust-like stream
        if (Math.random() < 0.5) {
          spawnParticles(laserCenter, rect, 2 + Math.floor(Math.random() * 3));
        }
        break; // only emit for the first overlapping card (avoid doubling)
      }
    }
  }, [spawnParticles]);

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

        positionRef.current +=
          velocityRef.current * directionRef.current * deltaTime;

        if (velocityDisplayRef.current) {
          velocityDisplayRef.current.textContent = String(
            Math.round(velocityRef.current),
          );
        }

        const containerWidth =
          containerRef.current?.offsetWidth || window.innerWidth;
        const cardLineWidth = cardLine.scrollWidth;

        if (positionRef.current < -cardLineWidth) {
          positionRef.current = containerWidth;
        } else if (positionRef.current > containerWidth) {
          positionRef.current = -cardLineWidth;
        }

        cardLine.style.transform = `translateX(${positionRef.current}px)`;
        updateCardClipping();
      }

      // Always render particles (even while dragging, so they animate out naturally)
      renderParticles();

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [updateCardClipping, renderParticles]);

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
        <div key={`${tool.name}-${i}`} className="card-wrapper" data-index={i}>
          <div className="card card-normal">
            <div
              className="card-gradient bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
              style={{ '--brand-color': tool.color } as React.CSSProperties}
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{
                  background: `linear-gradient(90deg, transparent, ${tool.color}, transparent)`,
                }}
              />
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${tool.color}40, transparent 70%)`,
                }}
              />
              <div className="card-content relative z-10">
                <div className="card-logo-wrapper">
                  <div
                    className="card-logo-glow"
                    style={{ backgroundColor: tool.color }}
                  />
                  <div className="card-logo">
                    <img
                      src={tool.logo}
                      alt={tool.name}
                      draggable={false}
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
      {/* Speed indicator — hidden on mobile to reduce clutter */}
      <div className="absolute top-4 right-4 z-50 hidden sm:block">
        <div className="glass-card rounded-full bg-bg-glass/90 px-4 py-2 text-xs font-medium text-text-secondary">
          Speed:{' '}
          <span
            ref={velocityDisplayRef}
            className="text-brand-primary font-mono"
          >
            120
          </span>{' '}
          px/s
        </div>
      </div>

      {/* Card stream container */}
      <div
        ref={containerRef}
        className="relative w-full h-[220px] sm:h-[280px] md:h-[340px] flex items-center overflow-hidden"
        style={{ cursor: 'grab' }}
      >
        {/* CSS scanner line */}
        <div
          className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[8px] z-[15] pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, transparent, rgba(200,169,96,0.6), transparent)',
            boxShadow:
              '0 0 30px rgba(200,169,96,0.3), 0 0 60px rgba(200,169,96,0.15)',
          }}
        />

        {/* Particle canvas overlay — sits above cards and scanner line */}
        <canvas
          ref={particleCanvasRef}
          className="absolute inset-0 z-[20] pointer-events-none"
        />

        {/* Card stream */}
        <div className="card-stream absolute w-full flex items-center overflow-visible h-[140px] sm:h-[160px] md:h-[180px]">
          <motion.button
            type="button"
            ref={cardLineRef}
            className="card-line appearance-none border-0 bg-transparent p-0 text-left flex items-center whitespace-nowrap select-none"
            aria-label="Automation card stream"
            onSelectStart={(e) => e.preventDefault()}
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
          </motion.button>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex justify-center mt-10 relative z-20">
        <div
          className="glass-card inline-flex items-center gap-3 rounded-full bg-bg-glass/90 px-5 py-2.5"
          style={{
            borderColor:
              'color-mix(in srgb, var(--accent-primary) 22%, var(--border))',
          }}
        >
          <span
            className="flex items-center gap-1 text-brand-primary"
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4 opacity-50 drag-hint-left"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M10 3L5 8l5 5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M9 3a1 1 0 0 1 1 1v5.268l.724-.434A1 1 0 0 1 12 10v3a5 5 0 0 1-5 5H6a5 5 0 0 1-5-5v-2.5a1 1 0 0 1 1.5-.866L4 10.732V4a1 1 0 0 1 1-1zm6 0a1 1 0 0 1 1 1v6.732l1.5-.998A1 1 0 0 1 19 10.5V13a5 5 0 0 1-5 5h-1a5 5 0 0 1-.276-.008A6.001 6.001 0 0 0 14 13v-3a3 3 0 0 0-.684-1.898L13 7.732V4a1 1 0 0 1 1-1z" />
            </svg>
            <svg
              className="w-4 h-4 opacity-50 drag-hint-right"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M6 3l5 5-5 5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-sm font-medium text-text-primary">
            Drag to explore
          </span>
          <span className="h-3.5 w-px bg-border/80" aria-hidden="true" />
          <span className="text-xs text-text-secondary">
            Cards reveal code as the scanner passes
          </span>
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
    dragFree: true,
    stopOnMouseEnter: false,
  });
  const [expandedTool, setExpandedTool] = useState<{
    name: string;
    description: string;
    logo: string;
    color: string;
  } | null>(null);

  useScrollLock(expandedTool !== null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedTool(null);
    };
    if (expandedTool) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [expandedTool]);

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
      <div className="relative min-h-[260px] xs:min-h-[300px] sm:min-h-[360px] flex items-center">
        <div className="automation-scanner" aria-hidden="true" />
        <div className="overflow-hidden w-full" ref={emblaRef}>
          <div className="flex">
            {AUTOMATION_TOOLS.map((tool) => (
              <div
                className="flex-[0_0_85%] xs:flex-[0_0_80%] sm:flex-[0_0_75%] min-w-0 pl-4 xs:pl-5"
                key={tool.name}
              >
                <div
                  className="card-surface relative h-[240px] xs:h-[280px] sm:h-[320px] overflow-hidden rounded-[20px] xs:rounded-[24px] sm:rounded-[28px] border-border/80 bg-bg-card/80"
                  style={{ '--brand-color': tool.color } as React.CSSProperties}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${tool.color}, transparent)`,
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      background: `radial-gradient(circle at 50% 0%, ${tool.color}40, transparent 70%)`,
                    }}
                  />
                  <div className="relative z-10 p-3 xs:p-4 sm:p-6 flex flex-col h-full">
                    <div className="relative w-8 h-8 xs:w-10 xs:h-10 sm:w-14 sm:h-14 flex-shrink-0">
                      <div
                        className="absolute inset-[-4px] rounded-[18px] opacity-35 blur-[10px]"
                        style={{ backgroundColor: tool.color }}
                      />
                      <div className="relative w-8 h-8 xs:w-10 xs:h-10 sm:w-14 sm:h-14 bg-white/95 rounded-[10px] xs:rounded-[14px] flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)] p-1.5 xs:p-2 sm:p-2.5">
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
                    <h3 className="text-[clamp(0.8125rem,3.2vw,1.125rem)] font-bold text-white mt-1 xs:mt-1.5 sm:mt-2.5 leading-tight">
                      {tool.name}
                    </h3>
                    <p className="mt-0.5 xs:mt-1 flex-grow line-clamp-3 xs:line-clamp-4 text-[clamp(0.5625rem,2.4vw,0.75rem)] leading-relaxed text-white/82">
                      {tool.description}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedTool({
                          name: tool.name,
                          description: tool.description,
                          logo: tool.logo,
                          color: tool.color,
                        });
                      }}
                      className="md:hidden mt-1.5 text-[clamp(0.5625rem,2.2vw,0.6875rem)] font-medium text-white/50 underline underline-offset-2 decoration-white/20 hover:text-white/80 hover:decoration-white/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
                    >
                      Read more
                    </button>
                    <div className="flex justify-between items-center mt-auto pt-1 xs:pt-1.5">
                      <span
                        className="text-[clamp(0.625rem,2vw,0.6875rem)] px-2 xs:px-2.5 py-1 rounded-full font-medium"
                        style={{
                          backgroundColor: `${tool.color}20`,
                          color: tool.color,
                          border: `1px solid ${tool.color}40`,
                        }}
                      >
                        AI Automation
                      </span>
                      <span
                        className="text-[clamp(0.625rem,2vw,0.6875rem)] font-medium"
                        style={{ color: tool.color }}
                      >
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
      <div
        className="flex justify-center gap-2 mt-4 sm:mt-6 relative z-20"
        role="tablist"
        aria-label="Carousel navigation"
      >
        {AUTOMATION_TOOLS.map((tool, i) => (
          <button
            key={tool.name}
            type="button"
            role="tab"
            aria-selected={i === selectedIndex}
            aria-label={`Go to ${tool.name}`}
            className={`w-2 h-2 p-2 rounded-full transition-all duration-300 ${
              i === selectedIndex
                ? 'bg-brand-primary w-6'
                : 'bg-text-secondary/30 hover:bg-text-secondary/60'
            }`}
            onClick={() => scrollTo(i)}
          />
        ))}
      </div>

      <div className="flex justify-center mt-4 relative z-20">
        <span className="text-xs text-text-secondary">
          Swipe or drag to explore
        </span>
      </div>

      {/* Expanded tool modal - mobile only */}
      <AnimatePresence>
        {expandedTool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end justify-center md:hidden"
            onClick={() => setExpandedTool(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Details about ${expandedTool.name}`}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              style={{ touchAction: 'none' }}
            />

            {/* Bottom sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-h-[70vh] rounded-t-3xl bg-gradient-to-b from-slate-900 to-[#0d0b09] border-t border-border/60 shadow-2xl"
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
                {/* Handle bar */}
                <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2 bg-gradient-to-b from-slate-900 to-transparent">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>

                {/* Tool header */}
                <div className="flex items-center gap-4 px-6 pt-2 pb-5">
                  <div
                    className="relative w-14 h-14 bg-white/95 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 p-2.5"
                    style={{
                      boxShadow: `0 4px 20px ${expandedTool.color}40`,
                    }}
                  >
                    <img
                      src={expandedTool.logo}
                      alt={expandedTool.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          `https://ui-avatars.com/api/?name=${expandedTool.name}&background=ffffff&color=${expandedTool.color.slice(1)}&size=48`;
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {expandedTool.name}
                    </h3>
                    <span
                      className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: `${expandedTool.color}20`,
                        color: expandedTool.color,
                        border: `1px solid ${expandedTool.color}40`,
                      }}
                    >
                      AI Automation
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="px-6 pb-6">
                  <p className="text-[clamp(0.875rem,3vw,1rem)] leading-relaxed text-white/85">
                    {expandedTool.description}
                  </p>
                </div>
              </div>

              {/* Close button */}
              <div className="sticky bottom-0 px-6 pb-6 pt-3 bg-gradient-to-t from-[#0d0b09] to-transparent">
                <button
                  type="button"
                  onClick={() => setExpandedTool(null)}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  style={{
                    background: `linear-gradient(135deg, ${expandedTool.color}, ${expandedTool.color}cc)`,
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
            <span className="section-eyebrow">Automation Layer</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display tracking-[-0.02em] mb-4 text-text-primary">
            Automations That Keep{' '}
            <span className="text-gradient">Work Moving</span>
          </h2>

          <p className="mx-auto max-w-2xl text-base leading-relaxed text-text-secondary md:text-lg">
            Pre-built workflows handle follow-up, routing, and admin tasks so
            your team spends less time on manual handoffs.
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
