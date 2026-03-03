import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ParticleSystem } from '../lib/three/ParticleSystem';
import { ParticleScanner } from '../lib/three/ParticleScanner';
import { isLightMode } from '../lib/three/helpers';

// Automation tools data with logos and descriptions
const AUTOMATION_TOOLS = [
  {
    name: 'Claude Code',
    description: 'Builds and updates your website, apps, and digital tools automatically — saving you thousands in developer costs every month.',
    logo: '/claude-logo-light.png',
    logoDark: '/claude-logo-dark.png',
    color: '#D97706',
    gradient: 'from-orange-500 to-amber-600',
    iconBg: 'bg-gradient-to-br from-orange-400 to-amber-500'
  },
  {
    name: 'n8n',
    description: 'Connects all your business apps together so data flows automatically — no more copying and pasting between your CRM, email, calendar, and billing.',
    logo: '/n8n-logo.webp',
    color: '#EA4B71',
    gradient: 'from-pink-500 to-rose-600',
    iconBg: 'bg-gradient-to-br from-pink-400 to-rose-500'
  },
  {
    name: 'Antigravity',
    description: 'Your 24/7 digital employee that handles research, planning, and complex tasks while you sleep — scaling your team without adding headcount.',
    logo: '/Antigravity-logo.webp',
    color: '#8B5CF6',
    gradient: 'from-purple-500 to-violet-600',
    iconBg: 'bg-gradient-to-br from-purple-400 to-violet-500'
  },
  {
    name: 'Airtable',
    description: 'Replaces your messy spreadsheets with a smart database your whole team loves — track projects, clients, and inventory without hiring a developer.',
    logo: '/airtable-logo.png',
    color: '#FCB400',
    gradient: 'from-yellow-400 to-amber-500',
    iconBg: 'bg-gradient-to-br from-yellow-300 to-amber-400'
  },
  {
    name: 'OpenAI',
    description: 'Writes your marketing copy, analyzes customer feedback, and creates business strategies on demand — like having an expert consultant always on call.',
    logo: '/chatgpt-logo.webp',
    color: '#00A67E',
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500'
  },
  {
    name: 'Retell AI',
    description: 'Answers every customer call instantly with a natural human voice, books appointments, and never misses a lead — your 24/7 AI receptionist.',
    logo: '/retell-logo-light.png',
    logoDark: '/retell-logo-dark.png',
    color: '#004CC6',
    gradient: 'from-blue-600 to-blue-800',
    iconBg: 'bg-gradient-to-br from-blue-600 to-blue-800'
  },
  {
    name: 'LiveKit',
    description: 'Powers real-time voice and video conversations with your customers — qualify leads and provide instant support right on your website.',
    logo: '/livekit-logo.webp',
    color: '#FF6B6B',
    gradient: 'from-red-500 to-orange-500',
    iconBg: 'bg-gradient-to-br from-red-400 to-orange-500'
  },
  {
    name: 'Perplexity',
    description: 'Delivers instant market research and competitor analysis with verified sources — make confident business decisions in minutes, not weeks.',
    logo: '/Perplexity-logo.webp',
    color: '#20B2AA',
    gradient: 'from-teal-500 to-cyan-500',
    iconBg: 'bg-gradient-to-br from-teal-400 to-cyan-500'
  }
];

const CODE_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789(){}[]<>;:,._-+=!@#$%^&*|\\/\"'`~?";

const AutomationCards: React.FC = () =>
{
  const containerRef = useRef<HTMLDivElement>(null);
  const cardLineRef = useRef<HTMLDivElement>(null);
  const scannerCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);

  const [velocity, setVelocity] = useState(120);
  const positionRef = useRef(0);
  const velocityRef = useRef(120);
  const directionRef = useRef(-1);
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const mouseVelocityRef = useRef(0);
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef(0);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const particleScannerRef = useRef<ParticleScanner | null>(null);
  const scanningActiveRef = useRef(false);

  // Generate code for ASCII effect
  const generateCode = (width: number, height: number): string =>
  {
    const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = (arr: string[]) => arr[randInt(0, arr.length - 1)];

    const header = [
      "// automation workflow - ai powered",
      "/* generated for visual effect */",
      "const SCAN_WIDTH = 8;",
      "const MAX_PARTICLES = 2500;",
      "const TRANSITION = 0.05;",
    ];

    const helpers = [
      "function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }",
      "function lerp(a, b, t) { return a + (b - a) * t; }",
      "const now = () => performance.now();",
      "function rng(min, max) { return Math.random() * (max - min) + min; }",
    ];

    const automationBlock = (idx: number) => [
      `class Automation${idx} {`,
      "  constructor(trigger, action, condition) {",
      "    this.trigger = trigger;",
      "    this.action = action;",
      "    this.condition = condition;",
      "  }",
      "  async execute() { await this.action(); }",
      "}",
    ];

    const workflowBlock = [
      "const workflow = {",
      "  triggers: ['webhook', 'schedule', 'event'],",
      "  actions: ['api_call', 'transform', 'notify'],",
      "  status: 'active',",
      "};",
    ];

    const library: string[] = [];
    header.forEach(l => library.push(l));
    helpers.forEach(l => library.push(l));
    for (let b = 0; b < 3; b++) automationBlock(b).forEach(l => library.push(l));
    workflowBlock.forEach(l => library.push(l));

    for (let i = 0; i < 40; i++)
    {
      const n1 = randInt(1, 9);
      const n2 = randInt(10, 99);
      library.push(`const v${i} = (${n1} + ${n2}) * 0.${randInt(1, 9)};`);
    }

    let flow = library.join(" ");
    flow = flow.replace(/\s+/g, " ").trim();
    const totalChars = width * height;
    while (flow.length < totalChars + width)
    {
      const extra = pick(library).replace(/\s+/g, " ").trim();
      flow += " " + extra;
    }

    let out = "";
    let offset = 0;
    for (let row = 0; row < height; row++)
    {
      let line = flow.slice(offset, offset + width);
      if (line.length < width) line = line + " ".repeat(width - line.length);
      out += line + (row < height - 1 ? "\n" : "");
      offset += width;
    }
    return out;
  };

  // Create card wrapper
  const createCardElement = (index: number): React.ReactElement =>
  {
    const tool = AUTOMATION_TOOLS[index % AUTOMATION_TOOLS.length];
    // Calculate code dimensions based on 400x250 card size (from original)
    const fontSize = 11;
    const lineHeight = 13;
    const charWidth = 6;
    const width = Math.floor(400 / charWidth);  // ~66 chars
    const height = Math.floor(250 / lineHeight); // ~19 lines
    const codeContent = generateCode(width, height);

    // Logo container has white background, so use the light variant (dark icons)
    const logoSrc = tool.logo;

    return (
      <div key={index} className="card-wrapper" data-index={index}>
        <div className="card card-normal">
          <div className="card-gradient bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" style={{ '--brand-color': tool.color } as React.CSSProperties}>
            {/* Brand color accent bar at top */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${tool.color}, transparent)` }}></div>
            {/* Subtle brand color glow */}
            <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 50% 0%, ${tool.color}40, transparent 70%)` }}></div>
            <div className="card-content relative z-10">
              <div className="card-logo-wrapper">
                <div className="card-logo-glow" style={{ backgroundColor: tool.color }}></div>
                <div className="card-logo">
                  <img
                    src={logoSrc}
                    alt={tool.name}
                    onError={(e) =>
                    {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${tool.name}&background=ffffff&color=${tool.color.slice(1)}&size=48`;
                    }}
                  />
                </div>
              </div>
              <h3 className="card-title">{tool.name}</h3>
              <p className="card-description">{tool.description}</p>
              <div className="card-footer">
                <span className="card-badge" style={{ backgroundColor: `${tool.color}20`, color: tool.color, border: `1px solid ${tool.color}40` }}>AI Automation</span>
                <span className="card-status" style={{ color: tool.color }}>● Active</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card card-ascii">
          <div className="ascii-content">{codeContent}</div>
        </div>
      </div>
    );
  };

  // Voice agent carousel navigation
  useEffect(() =>
  {
    const handler = (e: Event) =>
    {
      const { carousel, action } = (e as CustomEvent).detail;
      if (carousel !== 'automation') return;
      // Boost velocity in the requested direction
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

  // Initialize Three.js particle system and scanner
  useEffect(() =>
  {
    const particleCanvas = particleCanvasRef.current;
    const scannerCanvas = scannerCanvasRef.current;

    if (particleCanvas)
    {
      particleSystemRef.current = new ParticleSystem(particleCanvas);
    }

    if (scannerCanvas)
    {
      particleScannerRef.current = new ParticleScanner(scannerCanvas);
    }

    return () =>
    {
      if (particleSystemRef.current)
      {
        particleSystemRef.current.destroy();
      }
      if (particleScannerRef.current)
      {
        particleScannerRef.current.destroy();
      }
    };
  }, []);

  // Card stream animation
  useEffect(() =>
  {
    const cardLine = cardLineRef.current;
    if (!cardLine) return;

    const animate = (currentTime: number) =>
    {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      if (!isDraggingRef.current)
      {
        const friction = 0.95;
        const minVelocity = 30;

        if (velocityRef.current > minVelocity)
        {
          velocityRef.current *= friction;
        } else
        {
          velocityRef.current = Math.max(minVelocity, velocityRef.current);
        }

        positionRef.current += velocityRef.current * directionRef.current * deltaTime;
        setVelocity(Math.round(velocityRef.current));

        // Wrap position
        const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
        const cardLineWidth = cardLine.scrollWidth;

        if (positionRef.current < -cardLineWidth)
        {
          positionRef.current = containerWidth;
        } else if (positionRef.current > containerWidth)
        {
          positionRef.current = -cardLineWidth;
        }

        cardLine.style.transform = `translateX(${positionRef.current}px)`;
        updateCardClipping();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () =>
    {
      if (animationRef.current)
      {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const updateCardClipping = () =>
  {
    const scannerX = window.innerWidth / 2;
    const scannerWidth = 8;
    const scannerLeft = scannerX - scannerWidth / 2;
    const scannerRight = scannerX + scannerWidth / 2;

    const wrappers = document.querySelectorAll('.card-wrapper');
    let anyScanningActive = false;

    wrappers.forEach((wrapper) =>
    {
      const rect = (wrapper as HTMLElement).getBoundingClientRect();
      const cardLeft = rect.left;
      const cardRight = rect.right;
      const cardWidth = rect.width;

      const normalCard = wrapper.querySelector('.card-normal') as HTMLElement;
      const asciiCard = wrapper.querySelector('.card-ascii') as HTMLElement;

      if (cardLeft < scannerRight && cardRight > scannerLeft)
      {
        anyScanningActive = true;
        const scannerIntersectLeft = Math.max(scannerLeft - cardLeft, 0);
        const scannerIntersectRight = Math.min(scannerRight - cardLeft, cardWidth);

        const normalClipRight = (scannerIntersectLeft / cardWidth) * 100;
        const asciiClipLeft = (scannerIntersectRight / cardWidth) * 100;

        if (normalCard && asciiCard)
        {
          // Use CSS variables like the original code
          normalCard.style.setProperty('--clip-right', `${normalClipRight}%`);
          asciiCard.style.setProperty('--clip-left', `${asciiClipLeft}%`);
        }
      } else
      {
        if (cardRight < scannerLeft)
        {
          // Card has passed through - show ASCII fully
          if (normalCard) normalCard.style.setProperty('--clip-right', '100%');
          if (asciiCard) asciiCard.style.setProperty('--clip-left', '100%');
        } else if (cardLeft > scannerRight)
        {
          // Card hasn't reached scanner yet - show normal fully
          if (normalCard) normalCard.style.setProperty('--clip-right', '0%');
          if (asciiCard) asciiCard.style.setProperty('--clip-left', '0%');
        }
      }
    });

    if (scanningActiveRef.current !== anyScanningActive)
    {
      scanningActiveRef.current = anyScanningActive;
      particleScannerRef.current?.setScanningActive(anyScanningActive);
    }
  };

  // Mouse/touch handlers
  const handleMouseDown = (e: React.MouseEvent) =>
  {
    isDraggingRef.current = true;
    lastMouseXRef.current = e.clientX;
    mouseVelocityRef.current = 0;
    cardLineRef.current?.classList.add('dragging');
  };

  const handleMouseMove = (e: React.MouseEvent) =>
  {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - lastMouseXRef.current;
    positionRef.current += deltaX;
    mouseVelocityRef.current = deltaX * 60;
    lastMouseXRef.current = e.clientX;

    if (cardLineRef.current)
    {
      cardLineRef.current.style.transform = `translateX(${positionRef.current}px)`;
    }
    updateCardClipping();
  };

  const handleMouseUp = () =>
  {
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;
    cardLineRef.current?.classList.remove('dragging');

    if (Math.abs(mouseVelocityRef.current) > 30)
    {
      velocityRef.current = Math.abs(mouseVelocityRef.current);
      directionRef.current = mouseVelocityRef.current > 0 ? 1 : -1;
    } else
    {
      velocityRef.current = 120;
    }

    setVelocity(Math.round(velocityRef.current));
  };

  // Generate cards - 30 cards like original for consistent infinite loop
  const cards = [];
  for (let i = 0; i < 30; i++)
  {
    cards.push(createCardElement(i));
  }

  return (
    <section className="py-24 relative overflow-hidden bg-bg-main" id="automations">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Transition text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <span className="section-eyebrow">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
              </span>
              And we're not done yet...
            </span>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold font-display tracking-[-0.02em] mb-4 text-text-primary">
            You Also Get <span className="text-gradient">Automations</span> to Speed Up Your Productivity
          </h2>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Leverage pre-built automation templates and configure them to fit your unique workflow requirements
          </p>
        </motion.div>

        {/* Speed indicator */}
        <div className="absolute top-4 right-4 z-50">
          <div className="glass-card px-4 py-2 rounded-full text-sm text-text-secondary">
            Speed: <span className="text-brand-primary font-mono">{velocity}</span> px/s
          </div>
        </div>
      </div>

      {/* Card stream container */}
      <div
        ref={containerRef}
        className="relative w-full h-[300px] flex items-center overflow-hidden"
        style={{ cursor: 'grab' }}
      >
        {/* Three.js particle canvas */}
        <canvas
          ref={particleCanvasRef}
          className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-[250px] z-0 pointer-events-none"
        />

        {/* Scanner canvas */}
        <canvas
          ref={scannerCanvasRef}
          className="absolute top-1/2 left-[-3px] -translate-y-1/2 w-full h-[300px] z-15 pointer-events-none"
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
          >
            {cards}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center mt-8 relative z-20">
        <p className="text-text-secondary text-sm">
          Drag to explore - Cards reveal code when scanned
        </p>
      </div>
    </section>
  );
};

export default AutomationCards;
