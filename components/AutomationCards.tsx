import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';

// Automation tools data with logos and descriptions
const AUTOMATION_TOOLS = [
  {
    name: 'Claude Code',
    description: 'AI-powered coding assistant for intelligent automation',
    logo: 'https://claude.ai/images/claude_app_icon.png',
    color: '#D97706',
    gradient: 'from-orange-500 to-amber-600',
    iconBg: 'bg-gradient-to-br from-orange-400 to-amber-500'
  },
  {
    name: 'n8n',
    description: 'Open-source workflow automation platform',
    logo: 'https://cdn.simpleicons.org/n8n/EA4B71',
    color: '#EA4B71',
    gradient: 'from-pink-500 to-rose-600',
    iconBg: 'bg-gradient-to-br from-pink-400 to-rose-500'
  },
  {
    name: 'Antigravity',
    description: 'Advanced AI automation for enterprise workflows',
    logo: 'https://www.google.com/favicon.ico',
    color: '#4285F4',
    gradient: 'from-blue-500 to-cyan-500',
    iconBg: 'bg-gradient-to-br from-blue-400 to-cyan-500'
  },
  {
    name: 'Make',
    description: 'Visual platform for building automated workflows',
    logo: 'https://cdn.simpleicons.org/make/6D28D9',
    color: '#6D28D9',
    gradient: 'from-purple-600 to-violet-600',
    iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600'
  },
  {
    name: 'OpenAI',
    description: 'GPT-powered intelligent automation solutions',
    logo: 'https://openai.com/favicon.svg',
    color: '#00A67E',
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500'
  },
  {
    name: 'Zapier',
    description: 'Connect apps and automate workflows effortlessly',
    logo: 'https://cdn.simpleicons.org/zapier/FF4A00',
    color: '#FF4A00',
    gradient: 'from-orange-500 to-red-500',
    iconBg: 'bg-gradient-to-br from-orange-400 to-red-500'
  }
];

const CODE_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789(){}[]<>;:,._-+=!@#$%^&*|\\/\"'`~?";

interface Particle
{
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  originalAlpha: number;
  life: number;
  time: number;
  startX: number;
  twinkleSpeed: number;
  twinkleAmount: number;
}

// Three.js Particle System Class
class ParticleSystem
{
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: THREE.Points | null = null;
  private particleCount: number = 400;
  private canvas: HTMLCanvasElement;
  private velocities: Float32Array;
  private alphas: Float32Array;
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement)
  {
    this.canvas = canvas;
    this.velocities = new Float32Array(this.particleCount);
    this.alphas = new Float32Array(this.particleCount);

    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(
      -window.innerWidth / 2,
      window.innerWidth / 2,
      125,
      -125,
      1,
      1000
    );
    this.camera.position.z = 100;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, 250);
    this.renderer.setClearColor(0x000000, 0);

    this.createParticles();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  private createParticles()
  {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    // Create particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;
    const half = canvas.width / 2;
    const hue = 217;

    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0.025, "#fff");
    gradient.addColorStop(0.1, `hsl(${hue}, 61%, 33%)`);
    gradient.addColorStop(0.25, `hsl(${hue}, 64%, 6%)`);
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);

    for (let i = 0; i < this.particleCount; i++)
    {
      positions[i * 3] = (Math.random() - 0.5) * window.innerWidth * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
      positions[i * 3 + 2] = 0;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;

      const orbitRadius = Math.random() * 200 + 100;
      sizes[i] = (Math.random() * (orbitRadius - 60) + 60) / 8;

      this.velocities[i] = Math.random() * 60 + 30;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    for (let i = 0; i < this.particleCount; i++)
    {
      this.alphas[i] = (Math.random() * 8 + 2) / 10;
    }
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: texture },
        size: { value: 15.0 },
      },
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        varying vec3 vColor;
        uniform float size;
        
        void main() {
          vAlpha = alpha;
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying float vAlpha;
        varying vec3 vColor;
        
        void main() {
          gl_FragColor = vec4(vColor, vAlpha) * texture2D(pointTexture, gl_PointCoord);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private animate()
  {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (this.particles)
    {
      const positions = this.particles.geometry.attributes.position.array as Float32Array;
      const alphas = this.particles.geometry.attributes.alpha.array as Float32Array;
      const time = Date.now() * 0.001;

      for (let i = 0; i < this.particleCount; i++)
      {
        positions[i * 3] += this.velocities[i] * 0.016;

        if (positions[i * 3] > window.innerWidth / 2 + 100)
        {
          positions[i * 3] = -window.innerWidth / 2 - 100;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
        }

        positions[i * 3 + 1] += Math.sin(time + i * 0.1) * 0.5;

        const twinkle = Math.floor(Math.random() * 10);
        if (twinkle === 1 && alphas[i] > 0)
        {
          alphas[i] -= 0.05;
        } else if (twinkle === 2 && alphas[i] < 1)
        {
          alphas[i] += 0.05;
        }

        alphas[i] = Math.max(0, Math.min(1, alphas[i]));
      }

      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.geometry.attributes.alpha.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize()
  {
    this.camera.left = -window.innerWidth / 2;
    this.camera.right = window.innerWidth / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, 250);
  }

  destroy()
  {
    if (this.animationId)
    {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer)
    {
      this.renderer.dispose();
    }
    if (this.particles)
    {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }
  }
}

// Particle Scanner Class
class ParticleScanner
{
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private w: number;
  private h: number;
  private particles: (Particle | null)[];
  private count: number;
  private maxParticles: number = 800;
  private intensity: number = 0.8;
  private lightBarX: number;
  private lightBarWidth: number = 3;
  private fadeZone: number = 60;
  private scanningActive: boolean = false;
  private baseIntensity: number;
  private baseMaxParticles: number;
  private baseFadeZone: number;
  private currentIntensity: number;
  private currentMaxParticles: number;
  private currentFadeZone: number;
  private transitionSpeed: number = 0.05;
  private currentGlowIntensity: number = 1;
  private gradientCanvas: HTMLCanvasElement;
  private gradientCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement)
  {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.w = window.innerWidth;
    this.h = 300;
    this.particles = [];
    this.count = 0;
    this.lightBarX = this.w / 2;

    this.baseIntensity = this.intensity;
    this.baseMaxParticles = this.maxParticles;
    this.baseFadeZone = this.fadeZone;
    this.currentIntensity = this.intensity;
    this.currentMaxParticles = this.maxParticles;
    this.currentFadeZone = this.fadeZone;

    // Create gradient cache
    this.gradientCanvas = document.createElement('canvas');
    this.gradientCtx = this.gradientCanvas.getContext('2d')!;
    this.gradientCanvas.width = 16;
    this.gradientCanvas.height = 16;
    this.createGradientCache();

    this.setupCanvas();
    this.initParticles();
    this.animate();

    window.addEventListener('resize', () => this.onResize());
  }

  private createGradientCache()
  {
    const half = this.gradientCanvas.width / 2;
    const gradient = this.gradientCtx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.3, "rgba(196, 181, 253, 0.8)");
    gradient.addColorStop(0.7, "rgba(139, 92, 246, 0.4)");
    gradient.addColorStop(1, "transparent");

    this.gradientCtx.fillStyle = gradient;
    this.gradientCtx.beginPath();
    this.gradientCtx.arc(half, half, half, 0, Math.PI * 2);
    this.gradientCtx.fill();
  }

  private setupCanvas()
  {
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  private onResize()
  {
    this.w = window.innerWidth;
    this.lightBarX = this.w / 2;
    this.setupCanvas();
  }

  private randomFloat(min: number, max: number): number
  {
    return Math.random() * (max - min) + min;
  }

  private createParticle(): Particle
  {
    const intensityRatio = this.intensity / this.baseIntensity;
    const speedMultiplier = 1 + (intensityRatio - 1) * 1.2;
    const sizeMultiplier = 1 + (intensityRatio - 1) * 0.7;

    return {
      x: this.lightBarX + this.randomFloat(-this.lightBarWidth / 2, this.lightBarWidth / 2),
      y: this.randomFloat(0, this.h),
      vx: this.randomFloat(0.2, 1.0) * speedMultiplier,
      vy: this.randomFloat(-0.15, 0.15) * speedMultiplier,
      radius: this.randomFloat(0.4, 1) * sizeMultiplier,
      alpha: this.randomFloat(0.6, 1),
      decay: this.randomFloat(0.005, 0.025) * (2 - intensityRatio * 0.5),
      originalAlpha: 0,
      life: 1.0,
      time: 0,
      startX: 0,
      twinkleSpeed: this.randomFloat(0.02, 0.08) * speedMultiplier,
      twinkleAmount: this.randomFloat(0.1, 0.25),
    };
  }

  private initParticles()
  {
    for (let i = 0; i < this.maxParticles; i++)
    {
      const particle = this.createParticle();
      particle.originalAlpha = particle.alpha;
      particle.startX = particle.x;
      this.count++;
      this.particles[this.count] = particle;
    }
  }

  private updateParticle(particle: Particle)
  {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.time++;

    particle.alpha = particle.originalAlpha * particle.life +
      Math.sin(particle.time * particle.twinkleSpeed) * particle.twinkleAmount;

    particle.life -= particle.decay;

    if (particle.x > this.w + 10 || particle.life <= 0)
    {
      this.resetParticle(particle);
    }
  }

  private resetParticle(particle: Particle)
  {
    particle.x = this.lightBarX + this.randomFloat(-this.lightBarWidth / 2, this.lightBarWidth / 2);
    particle.y = this.randomFloat(0, this.h);
    particle.vx = this.randomFloat(0.2, 1.0);
    particle.vy = this.randomFloat(-0.15, 0.15);
    particle.alpha = this.randomFloat(0.6, 1);
    particle.originalAlpha = particle.alpha;
    particle.life = 1.0;
    particle.time = 0;
    particle.startX = particle.x;
  }

  private drawParticle(particle: Particle)
  {
    if (particle.life <= 0) return;

    let fadeAlpha = 1;

    if (particle.y < this.fadeZone)
    {
      fadeAlpha = particle.y / this.fadeZone;
    } else if (particle.y > this.h - this.fadeZone)
    {
      fadeAlpha = (this.h - particle.y) / this.fadeZone;
    }

    fadeAlpha = Math.max(0, Math.min(1, fadeAlpha));

    this.ctx.globalAlpha = particle.alpha * fadeAlpha;
    this.ctx.drawImage(
      this.gradientCanvas,
      particle.x - particle.radius,
      particle.y - particle.radius,
      particle.radius * 2,
      particle.radius * 2
    );
  }

  private drawLightBar()
  {
    const verticalGradient = this.ctx.createLinearGradient(0, 0, 0, this.h);
    verticalGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
    verticalGradient.addColorStop(this.fadeZone / this.h, "rgba(255, 255, 255, 1)");
    verticalGradient.addColorStop(1 - this.fadeZone / this.h, "rgba(255, 255, 255, 1)");
    verticalGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    this.ctx.globalCompositeOperation = 'lighter';

    const targetGlowIntensity = this.scanningActive ? 3.5 : 1;
    this.currentGlowIntensity += (targetGlowIntensity - this.currentGlowIntensity) * this.transitionSpeed;

    const glowIntensity = this.currentGlowIntensity;
    const lineWidth = this.lightBarWidth;
    const glow1Alpha = this.scanningActive ? 1.0 : 0.8;
    const glow2Alpha = this.scanningActive ? 0.8 : 0.6;
    const glow3Alpha = this.scanningActive ? 0.6 : 0.4;

    // Core gradient
    const coreGradient = this.ctx.createLinearGradient(
      this.lightBarX - lineWidth / 2, 0,
      this.lightBarX + lineWidth / 2, 0
    );
    coreGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
    coreGradient.addColorStop(0.3, `rgba(255, 255, 255, ${0.9 * glowIntensity})`);
    coreGradient.addColorStop(0.5, `rgba(255, 255, 255, ${1 * glowIntensity})`);
    coreGradient.addColorStop(0.7, `rgba(255, 255, 255, ${0.9 * glowIntensity})`);
    coreGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = coreGradient;
    this.ctx.beginPath();
    this.ctx.roundRect(this.lightBarX - lineWidth / 2, 0, lineWidth, this.h, 15);
    this.ctx.fill();

    // Glow 1
    const glow1Gradient = this.ctx.createLinearGradient(
      this.lightBarX - lineWidth * 2, 0,
      this.lightBarX + lineWidth * 2, 0
    );
    glow1Gradient.addColorStop(0, "rgba(139, 92, 246, 0)");
    glow1Gradient.addColorStop(0.5, `rgba(196, 181, 253, ${0.8 * glowIntensity})`);
    glow1Gradient.addColorStop(1, "rgba(139, 92, 246, 0)");

    this.ctx.globalAlpha = glow1Alpha;
    this.ctx.fillStyle = glow1Gradient;
    this.ctx.beginPath();
    this.ctx.roundRect(this.lightBarX - lineWidth * 2, 0, lineWidth * 4, this.h, 25);
    this.ctx.fill();

    // Glow 2
    const glow2Gradient = this.ctx.createLinearGradient(
      this.lightBarX - lineWidth * 4, 0,
      this.lightBarX + lineWidth * 4, 0
    );
    glow2Gradient.addColorStop(0, "rgba(139, 92, 246, 0)");
    glow2Gradient.addColorStop(0.5, `rgba(139, 92, 246, ${0.4 * glowIntensity})`);
    glow2Gradient.addColorStop(1, "rgba(139, 92, 246, 0)");

    this.ctx.globalAlpha = glow2Alpha;
    this.ctx.fillStyle = glow2Gradient;
    this.ctx.beginPath();
    this.ctx.roundRect(this.lightBarX - lineWidth * 4, 0, lineWidth * 8, this.h, 35);
    this.ctx.fill();

    // Glow 3 (when scanning)
    if (this.scanningActive)
    {
      const glow3Gradient = this.ctx.createLinearGradient(
        this.lightBarX - lineWidth * 8, 0,
        this.lightBarX + lineWidth * 8, 0
      );
      glow3Gradient.addColorStop(0, "rgba(139, 92, 246, 0)");
      glow3Gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.2)");
      glow3Gradient.addColorStop(1, "rgba(139, 92, 246, 0)");

      this.ctx.globalAlpha = glow3Alpha;
      this.ctx.fillStyle = glow3Gradient;
      this.ctx.beginPath();
      this.ctx.roundRect(this.lightBarX - lineWidth * 8, 0, lineWidth * 16, this.h, 45);
      this.ctx.fill();
    }

    this.ctx.globalCompositeOperation = 'destination-in';
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = verticalGradient;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  private render()
  {
    const targetIntensity = this.scanningActive ? 1.8 : this.baseIntensity;
    const targetMaxParticles = this.scanningActive ? 2500 : this.baseMaxParticles;
    const targetFadeZone = this.scanningActive ? 35 : this.baseFadeZone;

    this.currentIntensity += (targetIntensity - this.currentIntensity) * this.transitionSpeed;
    this.currentMaxParticles += (targetMaxParticles - this.currentMaxParticles) * this.transitionSpeed;
    this.currentFadeZone += (targetFadeZone - this.currentFadeZone) * this.transitionSpeed;

    this.intensity = this.currentIntensity;
    this.maxParticles = Math.floor(this.currentMaxParticles);
    this.fadeZone = this.currentFadeZone;

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.clearRect(0, 0, this.w, this.h);

    this.drawLightBar();

    this.ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i <= this.count; i++)
    {
      if (this.particles[i])
      {
        this.updateParticle(this.particles[i]!);
        this.drawParticle(this.particles[i]!);
      }
    }

    const currentIntensity = this.intensity;
    const currentMaxParticles = this.maxParticles;

    if (Math.random() < currentIntensity && this.count < currentMaxParticles)
    {
      const particle = this.createParticle();
      particle.originalAlpha = particle.alpha;
      particle.startX = particle.x;
      this.count++;
      this.particles[this.count] = particle;
    }

    const intensityRatio = this.intensity / this.baseIntensity;

    if (intensityRatio > 1.1 && Math.random() < (intensityRatio - 1.0) * 1.2)
    {
      const particle = this.createParticle();
      particle.originalAlpha = particle.alpha;
      particle.startX = particle.x;
      this.count++;
      this.particles[this.count] = particle;
    }

    if (intensityRatio > 1.3 && Math.random() < (intensityRatio - 1.3) * 1.4)
    {
      const particle = this.createParticle();
      particle.originalAlpha = particle.alpha;
      particle.startX = particle.x;
      this.count++;
      this.particles[this.count] = particle;
    }

    if (intensityRatio > 1.5 && Math.random() < (intensityRatio - 1.5) * 1.8)
    {
      const particle = this.createParticle();
      particle.originalAlpha = particle.alpha;
      particle.startX = particle.x;
      this.count++;
      this.particles[this.count] = particle;
    }

    if (intensityRatio > 2.0 && Math.random() < (intensityRatio - 2.0) * 2.0)
    {
      const particle = this.createParticle();
      particle.originalAlpha = particle.alpha;
      particle.startX = particle.x;
      this.count++;
      this.particles[this.count] = particle;
    }

    if (this.count > currentMaxParticles + 200)
    {
      const excessCount = Math.min(15, this.count - currentMaxParticles);
      for (let i = 0; i < excessCount; i++)
      {
        delete this.particles[this.count - i];
      }
      this.count -= excessCount;
    }
  }

  private animate()
  {
    this.render();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  setScanningActive(active: boolean)
  {
    this.scanningActive = active;
  }

  destroy()
  {
    if (this.animationId)
    {
      cancelAnimationFrame(this.animationId);
    }
    this.particles = [];
    this.count = 0;
  }
}

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
  const animationRef = useRef<number>();
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

    return (
      <div key={index} className="card-wrapper" data-index={index}>
        <div className="card card-normal">
          <div className="card-gradient bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" style={{ '--brand-color': tool.color } as React.CSSProperties}>
            {/* Brand color accent bar at top */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${tool.color}, transparent)` }}></div>
            {/* Subtle brand color glow */}
            <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 50% 0%, ${tool.color}40, transparent 70%)` }}></div>
            <div className="card-content relative z-10">
              <div className="card-logo">
                <img
                  src={tool.logo}
                  alt={tool.name}
                  onError={(e) =>
                  {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${tool.name}&background=ffffff&color=${tool.color.slice(1)}&size=48`;
                  }}
                />
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
    <section className="py-24 relative overflow-hidden bg-black" id="automations">
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-brand-primary text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
            </span>
            And we're not done yet...
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold font-display tracking-tight mb-4 text-text-primary">
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

      <style>{`
        .card-stream {
          position: absolute;
          width: 100vw;
          height: 180px;
          display: flex;
          align-items: center;
          overflow: visible;
        }

        .card-line {
          display: flex;
          align-items: center;
          gap: 60px;
          white-space: nowrap;
          cursor: grab;
          user-select: none;
          will-change: transform;
        }

        .card-line.dragging {
          cursor: grabbing;
        }

        .card-wrapper {
          position: relative;
          width: 400px;
          height: 250px;
          flex-shrink: 0;
        }

        .card {
          position: absolute;
          top: 0;
          left: 0;
          width: 400px;
          height: 250px;
          border-radius: 15px;
          overflow: hidden;
        }

        .card-normal {
          background: transparent;
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
          z-index: 2;
          clip-path: inset(0 0 0 var(--clip-right, 0%));
        }

        .card-gradient {
          width: 100%;
          height: 100%;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .card-content {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .card-logo {
          width: 56px;
          height: 56px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          padding: 10px;
        }

        .card-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .card-title {
          font-size: 20px;
          font-weight: 700;
          color: white;
          margin-top: 16px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .card-description {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
          margin-top: 8px;
          line-height: 1.4;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
        }

        .card-badge {
          font-size: 11px;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          color: white;
          font-weight: 500;
        }

        .card-status {
          font-size: 11px;
          color: #4ADE80;
          font-weight: 500;
        }

        .card-ascii {
          background: transparent;
          z-index: 1;
          position: absolute;
          top: 0;
          left: 0;
          width: 400px;
          height: 250px;
          border-radius: 15px;
          overflow: hidden;
          clip-path: inset(0 calc(100% - var(--clip-left, 0%)) 0 0);
        }

        .ascii-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          color: rgba(196, 181, 253, 0.6);
          font-family: 'Courier New', monospace;
          font-size: 11px;
          line-height: 13px;
          overflow: hidden;
          white-space: pre;
          padding: 0;
          text-align: left;
          vertical-align: top;
          box-sizing: border-box;
          -webkit-mask-image: linear-gradient(
            to right,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.8) 30%,
            rgba(0, 0, 0, 0.6) 50%,
            rgba(0, 0, 0, 0.4) 80%,
            rgba(0, 0, 0, 0.2) 100%
          );
          mask-image: linear-gradient(
            to right,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.8) 30%,
            rgba(0, 0, 0, 0.6) 50%,
            rgba(0, 0, 0, 0.4) 80%,
            rgba(0, 0, 0, 0.2) 100%
          );
          animation: glitch 0.1s infinite linear alternate-reverse;
        }

        @keyframes glitch {
          0% { opacity: 1; }
          15% { opacity: 0.9; }
          16% { opacity: 1; }
          49% { opacity: 0.8; }
          50% { opacity: 1; }
          99% { opacity: 0.9; }
          100% { opacity: 1; }
        }

        .scan-effect {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(139, 92, 246, 0.4),
            transparent
          );
          animation: scanEffect 0.6s ease-out;
          pointer-events: none;
          z-index: 5;
        }

        @keyframes scanEffect {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
};

export default AutomationCards;
