import * as THREE from 'three';
import { getAccentColor, hexToRgb } from './helpers';

// Three.js Particle System Class
class ParticleSystem {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: THREE.Points | null = null;
  private particleCount: number = 400;
  private canvas: HTMLCanvasElement;
  private velocities: Float32Array;
  private alphas: Float32Array;
  private animationId: number | null = null;
  private currentTexture: THREE.CanvasTexture | null = null;
  private resizeHandler: () => void;
  private themeObserver: MutationObserver | null = null;

  constructor(canvas: HTMLCanvasElement) {
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
      1000,
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

    this.resizeHandler = () => this.onWindowResize();
    window.addEventListener('resize', this.resizeHandler);

    // Listen for theme changes
    this.themeObserver = new MutationObserver(() =>
      this.updateParticleColors(),
    );
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-accent'],
    });
  }

  private updateParticleColors() {
    if (!this.particles) return;

    // Create new texture with updated colors
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;
    const half = canvas.width / 2;

    const lightMode = document.documentElement.classList.contains('light');
    const accentColor = getAccentColor();
    const primaryRgb = hexToRgb(accentColor.primary);
    const secondaryRgb = hexToRgb(accentColor.secondary);

    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);

    if (lightMode) {
      const darkerR = Math.floor(primaryRgb.r * 0.6);
      const darkerG = Math.floor(primaryRgb.g * 0.6);
      const darkerB = Math.floor(primaryRgb.b * 0.6);
      gradient.addColorStop(0.025, accentColor.primary);
      gradient.addColorStop(
        0.1,
        `rgba(${darkerR}, ${darkerG}, ${darkerB}, 0.9)`,
      );
      gradient.addColorStop(
        0.25,
        `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.5)`,
      );
      gradient.addColorStop(1, 'transparent');
    } else {
      gradient.addColorStop(0.025, '#fff');
      gradient.addColorStop(
        0.1,
        `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.8)`,
      );
      gradient.addColorStop(
        0.25,
        `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`,
      );
      gradient.addColorStop(1, 'transparent');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();

    const newTexture = new THREE.CanvasTexture(canvas);

    const material = this.particles.material as THREE.ShaderMaterial;
    if (material.uniforms?.pointTexture) {
      material.uniforms.pointTexture.value = newTexture;
    }

    if (this.currentTexture) {
      this.currentTexture.dispose();
    }
    this.currentTexture = newTexture;
  }

  private createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;
    const half = canvas.width / 2;

    const lightMode = document.documentElement.classList.contains('light');
    const accentColor = getAccentColor();
    const primaryRgb = hexToRgb(accentColor.primary);
    const secondaryRgb = hexToRgb(accentColor.secondary);

    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);

    if (lightMode) {
      // Light mode: Use darker accent color for visibility
      const darkerR = Math.floor(primaryRgb.r * 0.6);
      const darkerG = Math.floor(primaryRgb.g * 0.6);
      const darkerB = Math.floor(primaryRgb.b * 0.6);
      gradient.addColorStop(0.025, accentColor.primary);
      gradient.addColorStop(
        0.1,
        `rgba(${darkerR}, ${darkerG}, ${darkerB}, 0.9)`,
      );
      gradient.addColorStop(
        0.25,
        `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.5)`,
      );
      gradient.addColorStop(1, 'transparent');
    } else {
      // Dark mode: Use white with accent tint
      gradient.addColorStop(0.025, '#fff');
      gradient.addColorStop(
        0.1,
        `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.8)`,
      );
      gradient.addColorStop(
        0.25,
        `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`,
      );
      gradient.addColorStop(1, 'transparent');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    this.currentTexture = texture;

    for (let i = 0; i < this.particleCount; i++) {
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

    for (let i = 0; i < this.particleCount; i++) {
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

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    if (this.particles) {
      const positions = this.particles.geometry.attributes.position
        .array as Float32Array;
      const alphas = this.particles.geometry.attributes.alpha
        .array as Float32Array;
      const time = Date.now() * 0.001;

      for (let i = 0; i < this.particleCount; i++) {
        positions[i * 3] += this.velocities[i] * 0.016;

        if (positions[i * 3] > window.innerWidth / 2 + 100) {
          positions[i * 3] = -window.innerWidth / 2 - 100;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
        }

        positions[i * 3 + 1] += Math.sin(time + i * 0.1) * 0.5;

        const twinkle = Math.floor(Math.random() * 10);
        if (twinkle === 1 && alphas[i] > 0) {
          alphas[i] -= 0.05;
        } else if (twinkle === 2 && alphas[i] < 1) {
          alphas[i] += 0.05;
        }

        alphas[i] = Math.max(0, Math.min(1, alphas[i]));
      }

      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.geometry.attributes.alpha.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize() {
    this.camera.left = -window.innerWidth / 2;
    this.camera.right = window.innerWidth / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, 250);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.resizeHandler);
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }
    if (this.currentTexture) {
      this.currentTexture.dispose();
    }
  }
}

export { ParticleSystem };
