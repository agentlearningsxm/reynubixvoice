import React, { useEffect, useRef, useCallback } from 'react';

interface VoiceOrbProps
{
  isActive: boolean;
  isSpeaking: boolean;
  isUserSpeaking?: boolean;
}

/**
 * Perplexity-style Voice Orb
 * 
 * States:
 * - Dormant (!isActive): Dim, slow breathing, muted colors
 * - Startup (isActive transitions true): Particles gather inward, orb forms
 * - Idle (isActive, !isSpeaking, !isUserSpeaking): Gentle breathing pulse, slow rotation
 * - Agent Speaking (isSpeaking): Rhythmic pulsation, brighter glow, faster rotation
 * - User Speaking (isUserSpeaking): Subtle reactive glow, slight contraction ("listening")
 * - Shutdown (isActive transitions false): Orb dissolves outward
 */
const VoiceOrb: React.FC<VoiceOrbProps> = ({ isActive, isSpeaking, isUserSpeaking = false }) =>
{
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const stateRef = useRef({
    // Animated values (lerped smoothly)
    currentScale: 0.3,       // Orb scale (0 = nothing, 1 = full)
    currentGlow: 0,          // Glow intensity (0-1)
    currentRotationSpeed: 0, // Rotation speed multiplier
    currentBrightness: 0.3,  // Particle brightness
    currentPulse: 0,         // Pulse amount for speaking
    // Targets (set by state)
    targetScale: 0.3,
    targetGlow: 0,
    targetRotationSpeed: 0.3,
    targetBrightness: 0.3,
    targetPulse: 0,
    // Internal
    time: 0,
    rotation: 0,
    phase: 'dormant' as 'dormant' | 'starting' | 'active' | 'stopping',
    startTime: 0,
  });

  // Particle data (created once)
  const particlesRef = useRef<{
    theta: number; phi: number; baseR: number; speed: number; offset: number;
  }[]>([]);

  // Initialize particles
  useEffect(() =>
  {
    const count = 200;
    const particles = [];
    for (let i = 0; i < count; i++)
    {
      particles.push({
        theta: Math.random() * Math.PI * 2,
        phi: Math.acos(2 * Math.random() - 1),
        baseR: 55 + Math.random() * 15, // Varied radii for depth
        speed: 0.3 + Math.random() * 0.7,
        offset: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = particles;
  }, []);

  // Handle state transitions
  useEffect(() =>
  {
    const s = stateRef.current;
    if (isActive)
    {
      if (s.phase === 'dormant' || s.phase === 'stopping')
      {
        s.phase = 'starting';
        s.startTime = s.time;
      }
      // Set targets based on sub-state
      if (isSpeaking)
      {
        s.targetScale = 1.05;
        s.targetGlow = 1.0;
        s.targetRotationSpeed = 2.0;
        s.targetBrightness = 1.0;
        s.targetPulse = 0.2; // Strong rhythmic pulse — very visible
      } else if (isUserSpeaking)
      {
        s.targetScale = 0.85;
        s.targetGlow = 0.65;
        s.targetRotationSpeed = 0.7;
        s.targetBrightness = 0.85;
        s.targetPulse = 0.08; // Moderate reactivity
      } else
      {
        // Idle / listening
        s.targetScale = 0.9;
        s.targetGlow = 0.35;
        s.targetRotationSpeed = 0.4;
        s.targetBrightness = 0.65;
        s.targetPulse = 0.03; // Gentle breathing
      }
    } else
    {
      if (s.phase === 'starting' || s.phase === 'active')
      {
        s.phase = 'stopping';
        s.startTime = s.time;
      }
      s.targetScale = 0.3;
      s.targetGlow = 0;
      s.targetRotationSpeed = 0.1;
      s.targetBrightness = 0.25;
      s.targetPulse = 0;
    }
  }, [isActive, isSpeaking, isUserSpeaking]);

  // Get theme color from CSS variable
  const getAccentColor = useCallback((): [number, number, number] =>
  {
    if (typeof window === 'undefined') return [59, 130, 246]; // Default blue
    const root = document.documentElement;
    const accent = getComputedStyle(root).getPropertyValue('--accent-primary').trim();
    // Parse hex or rgb
    if (accent.startsWith('#'))
    {
      const hex = accent.replace('#', '');
      return [
        parseInt(hex.substring(0, 2), 16),
        parseInt(hex.substring(2, 4), 16),
        parseInt(hex.substring(4, 6), 16),
      ];
    }
    // Fallback
    return [59, 130, 246];
  }, []);

  // Main render loop
  useEffect(() =>
  {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 280 * dpr;
    canvas.height = 280 * dpr;
    ctx.scale(dpr, dpr);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const accentColor = getAccentColor();

    const render = () =>
    {
      const s = stateRef.current;
      s.time += 0.016; // ~60fps

      // Smooth interpolation — fast enough to feel responsive
      const lerpSpeed = 0.15; // Snappy transitions (~6 frames to 90%)
      s.currentScale = lerp(s.currentScale, s.targetScale, lerpSpeed);
      s.currentGlow = lerp(s.currentGlow, s.targetGlow, lerpSpeed);
      s.currentRotationSpeed = lerp(s.currentRotationSpeed, s.targetRotationSpeed, lerpSpeed);
      s.currentBrightness = lerp(s.currentBrightness, s.targetBrightness, lerpSpeed);
      s.currentPulse = lerp(s.currentPulse, s.targetPulse, lerpSpeed * 1.5); // Even faster for pulse

      // Phase transitions
      if (s.phase === 'starting' && s.time - s.startTime > 1.0)
      {
        s.phase = 'active';
      }
      if (s.phase === 'stopping' && s.currentScale < 0.35)
      {
        s.phase = 'dormant';
      }

      // Rotation
      s.rotation += 0.008 * s.currentRotationSpeed;

      // Pulsation (Perplexity-style: smooth sine wave)
      const breathe = Math.sin(s.time * 1.5) * 0.015; // Subtle always-on breathing
      const speakPulse = Math.sin(s.time * 8) * s.currentPulse; // Rhythmic speaking pulse
      const totalPulse = breathe + speakPulse;
      const effectiveScale = s.currentScale + totalPulse;

      // Clear
      ctx.clearRect(0, 0, 280, 280);
      const cx = 140;
      const cy = 140;

      // --- Draw Glow (behind particles) ---
      if (s.currentGlow > 0.01)
      {
        const glowRadius = 70 * effectiveScale;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius * 1.8);
        gradient.addColorStop(0, `rgba(${accentColor[0]}, ${accentColor[1]}, ${accentColor[2]}, ${0.3 * s.currentGlow})`);
        gradient.addColorStop(0.5, `rgba(${accentColor[0]}, ${accentColor[1]}, ${accentColor[2]}, ${0.1 * s.currentGlow})`);
        gradient.addColorStop(1, `rgba(${accentColor[0]}, ${accentColor[1]}, ${accentColor[2]}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, glowRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- Draw Particles ---
      const particles = particlesRef.current;
      // Sort by z for depth (back-to-front)
      const projected: { x: number; y: number; z: number; alpha: number; size: number }[] = [];

      for (const p of particles)
      {
        const r = p.baseR * effectiveScale;
        // Spherical to cartesian
        let x = r * Math.sin(p.phi) * Math.cos(p.theta + s.rotation * p.speed);
        let y = r * Math.sin(p.phi) * Math.sin(p.theta + s.rotation * p.speed);
        let z = r * Math.cos(p.phi);

        // Y-axis rotation
        const cosR = Math.cos(s.rotation * 0.3);
        const sinR = Math.sin(s.rotation * 0.3);
        const x2 = x * cosR - z * sinR;
        const z2 = x * sinR + z * cosR;
        x = x2;
        z = z2;

        // Perspective projection
        const perspective = 400;
        const scale = perspective / (perspective + z);
        const px = x * scale + cx;
        const py = y * scale + cy;

        // Depth-based alpha and size
        const depthAlpha = (z + r) / (2 * r);
        const alpha = depthAlpha * s.currentBrightness;
        const size = Math.max(0.5, scale * 2.5 * s.currentBrightness);

        projected.push({ x: px, y: py, z, alpha, size });
      }

      // Sort back-to-front
      projected.sort((a, b) => a.z - b.z);

      for (const pt of projected)
      {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accentColor[0]}, ${accentColor[1]}, ${accentColor[2]}, ${pt.alpha})`;
        ctx.fill();
      }

      // --- Inner Core Glow (Perplexity-style bright center) ---
      if (s.currentGlow > 0.05)
      {
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25 * effectiveScale);
        coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.15 * s.currentGlow})`);
        coreGrad.addColorStop(0.5, `rgba(${accentColor[0]}, ${accentColor[1]}, ${accentColor[2]}, ${0.08 * s.currentGlow})`);
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 25 * effectiveScale, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () =>
    {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [getAccentColor]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={280}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default VoiceOrb;