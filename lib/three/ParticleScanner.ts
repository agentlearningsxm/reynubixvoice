import { getAccentColor, Particle } from './helpers';

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
  private themeObserver: MutationObserver | null = null;

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

    // Listen for theme changes
    this.observeThemeChanges();
  }

  private observeThemeChanges()
  {
    this.themeObserver = new MutationObserver(() =>
    {
      this.createGradientCache();
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-accent']
    });
  }

  private createGradientCache()
  {
    const half = this.gradientCanvas.width / 2;
    const gradient = this.gradientCtx.createRadialGradient(half, half, 0, half, half, half);

    // Detect light mode and accent color for particle colors
    const lightMode = document.documentElement.classList.contains('light');
    const accentColor = getAccentColor();

    // Parse the accent color to get RGB values
    const hexToRgb = (hex: string) =>
    {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 59, g: 130, b: 246 };
    };

    const primaryRgb = hexToRgb(accentColor.primary);
    const secondaryRgb = hexToRgb(accentColor.secondary);

    if (lightMode)
    {
      // Light mode: Use darker accent color for visibility
      const darkerR = Math.floor(primaryRgb.r * 0.6);
      const darkerG = Math.floor(primaryRgb.g * 0.6);
      const darkerB = Math.floor(primaryRgb.b * 0.6);
      gradient.addColorStop(0, `rgba(${darkerR}, ${darkerG}, ${darkerB}, 1)`);
      gradient.addColorStop(0.3, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.9)`);
      gradient.addColorStop(0.7, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.5)`);
      gradient.addColorStop(1, "transparent");
    } else
    {
      // Dark mode: Use white with accent tint
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.3, `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.8)`);
      gradient.addColorStop(0.7, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.4)`);
      gradient.addColorStop(1, "transparent");
    }

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

    // Get accent color for laser
    const accentColor = getAccentColor();

    // Parse the accent color to get RGB values
    const hexToRgb = (hex: string) =>
    {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 59, g: 130, b: 246 };
    };

    const primaryRgb = hexToRgb(accentColor.primary);
    const secondaryRgb = hexToRgb(accentColor.secondary);

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
    glow1Gradient.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0)`);
    glow1Gradient.addColorStop(0.5, `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, ${0.8 * glowIntensity})`);
    glow1Gradient.addColorStop(1, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0)`);

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
    glow2Gradient.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0)`);
    glow2Gradient.addColorStop(0.5, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${0.4 * glowIntensity})`);
    glow2Gradient.addColorStop(1, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0)`);

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
      glow3Gradient.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0)`);
      glow3Gradient.addColorStop(0.5, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.2)`);
      glow3Gradient.addColorStop(1, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0)`);

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
    if (this.themeObserver)
    {
      this.themeObserver.disconnect();
    }
    this.particles = [];
    this.count = 0;
  }
}

export { ParticleScanner };
