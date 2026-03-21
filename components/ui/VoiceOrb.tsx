import type React from 'react';
import { useEffect, useRef } from 'react';

/**
 * 3D Particle Sphere Orb — rectangleworld.com algorithm adapted for React
 *
 * States:
 * - Dormant (!isActive)       : dim gold, slow rotation
 * - Idle (active, quiet)      : gold (#42°), gentle breathing
 * - User speaking             : warm amber (#36°), slight contraction
 * - Agent speaking (isSpeaking): green (#142°), fast spin + pulse
 * - Error                     : red (#5°), slow pulse
 * - isVisible=false           : particles dissolve outward (orb explodes away)
 */

interface VoiceOrbProps {
  isActive: boolean;
  isSpeaking: boolean;
  isUserSpeaking?: boolean;
  /** When false the orb dissolves — used to hide during live transcription */
  isVisible?: boolean;
  hasError?: boolean;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  dead: boolean;
  attack: number;
  hold: number;
  decay: number;
  holdV: number;
  alpha: number;
  stuck: number;
  projX: number;
  projY: number;
  prev: Particle | null;
  next: Particle | null;
}

const VoiceOrb: React.FC<VoiceOrbProps> = ({
  isActive,
  isSpeaking,
  isUserSpeaking = false,
  isVisible = true,
  hasError = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // All smoothly animated state lives here — readable from the RAF loop without recreating it
  const anim = useRef({
    hue: 42,
    targetHue: 42,
    sat: 75,
    targetSat: 75,
    lit: 58,
    targetLit: 58,
    globalAlpha: 0,
    targetGlobalAlpha: 1,
    speedMult: 0.45,
    targetSpeedMult: 0.45,
    pulseMag: 0.02,
    targetPulseMag: 0.02,
    pulseFreq: 1.8,
    targetPulseFreq: 1.8,
    // Secondary color for multi-tone effect
    hue2: 48,
    targetHue2: 48,
    turnAngle: 0,
    time: 0,
  });

  // Sync props → anim targets on every prop change
  useEffect(() => {
    const a = anim.current;
    if (hasError) {
      a.targetHue = 5;
      a.targetHue2 = 25;
      a.targetSat = 90;
      a.targetLit = 62;
      a.targetSpeedMult = 0.35;
      a.targetPulseMag = 0.14;
      a.targetPulseFreq = 4.5;
    } else if (!isActive) {
      a.targetHue = 40;
      a.targetHue2 = 46;
      a.targetSat = 52;
      a.targetLit = 36;
      a.targetSpeedMult = 0.22;
      a.targetPulseMag = 0.012;
      a.targetPulseFreq = 1.4;
    } else if (isSpeaking) {
      // Agent speaking — vibrant green
      a.targetHue = 142;
      a.targetHue2 = 168;
      a.targetSat = 90;
      a.targetLit = 60;
      a.targetSpeedMult = 2.6;
      a.targetPulseMag = 0.22;
      a.targetPulseFreq = 7.5;
    } else if (isUserSpeaking) {
      // User speaking — warm amber, listening contraction
      a.targetHue = 36;
      a.targetHue2 = 44;
      a.targetSat = 94;
      a.targetLit = 66;
      a.targetSpeedMult = 0.65;
      a.targetPulseMag = 0.055;
      a.targetPulseFreq = 3.2;
    } else {
      // Connected idle — warm gold
      a.targetHue = 42;
      a.targetHue2 = 48;
      a.targetSat = 84;
      a.targetLit = 62;
      a.targetSpeedMult = 0.48;
      a.targetPulseMag = 0.022;
      a.targetPulseFreq = 1.8;
    }
    a.targetGlobalAlpha = isVisible ? 1 : 0;
  }, [isActive, isSpeaking, isUserSpeaking, isVisible, hasError]);

  // Main render loop — runs once, reads from anim ref
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const SIZE = 200;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);
    const cx = SIZE / 2;
    const cy = SIZE / 2;

    // --- Sphere constants (from rectangleworld.com approach) ---
    const SPHERE_R = 66; // sphere radius in px
    const F_LEN = 250; // focal length (distance viewer → z=0)
    const SPH_CZ = -3 - SPHERE_R; // sphere center Z (keeps it in view)
    const ZERO_ALPHA_Z = -580; // depth at which alpha → 0
    const P_RAD = 1.9; // base particle draw radius
    const NUM_ADD = 5; // particles added per frame
    const BASE_TURN = (2 * Math.PI) / 1400; // one full rotation per 1400 frames
    const RAND_ACCEL = 0.075;

    // --- Particle linked list ---
    const pList: { first: Particle | null } = { first: null };
    const bin: { first: Particle | null } = { first: null };

    function addP(
      x: number,
      y: number,
      z: number,
      vx: number,
      vy: number,
      vz: number,
    ): Particle {
      let p: Particle;
      if (bin.first) {
        p = bin.first;
        if (p.next) {
          bin.first = p.next;
          p.next.prev = null;
        } else bin.first = null;
      } else {
        p = {} as Particle;
      }
      if (!pList.first) {
        pList.first = p;
        p.prev = null;
        p.next = null;
      } else {
        p.next = pList.first;
        pList.first.prev = p;
        pList.first = p;
        p.prev = null;
      }
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = vx;
      p.vy = vy;
      p.vz = vz;
      p.age = 0;
      p.dead = false;
      p.alpha = 0;
      p.projX = 0;
      p.projY = 0;
      return p;
    }

    function recP(p: Particle) {
      if (pList.first === p) {
        if (p.next) {
          p.next.prev = null;
          pList.first = p.next;
        } else pList.first = null;
      } else {
        if (p.prev) p.prev.next = p.next;
        if (p.next) p.next.prev = p.prev;
      }
      if (!bin.first) {
        bin.first = p;
        p.prev = null;
        p.next = null;
      } else {
        p.next = bin.first;
        bin.first.prev = p;
        bin.first = p;
        p.prev = null;
      }
    }

    const lerpN = (x: number, y: number, t: number) => x + (y - x) * t;
    const lerpH = (x: number, y: number, t: number) => {
      let d = y - x;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      return x + d * t;
    };

    const a = anim.current;
    a.globalAlpha = 0; // Start faded in

    const render = () => {
      a.time += 0.016;

      // Smooth lerp all targets
      const T = 0.035;
      a.hue = lerpH(a.hue, a.targetHue, T);
      a.hue2 = lerpH(a.hue2, a.targetHue2, T);
      a.sat = lerpN(a.sat, a.targetSat, T);
      a.lit = lerpN(a.lit, a.targetLit, T);
      a.globalAlpha = lerpN(a.globalAlpha, a.targetGlobalAlpha, 0.04);
      a.speedMult = lerpN(a.speedMult, a.targetSpeedMult, T);
      a.pulseMag = lerpN(a.pulseMag, a.targetPulseMag, 0.055);
      a.pulseFreq = lerpN(a.pulseFreq, a.targetPulseFreq, T);

      // Skip expensive work when nearly invisible
      if (a.globalAlpha < 0.004) {
        ctx.clearRect(0, 0, SIZE, SIZE);
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      a.turnAngle = (a.turnAngle + BASE_TURN * a.speedMult) % (2 * Math.PI);
      const sinA = Math.sin(a.turnAngle);
      const cosA = Math.cos(a.turnAngle);

      // Pulsing sphere radius
      const pulse = 1 + Math.sin(a.time * a.pulseFreq) * a.pulseMag;
      const sr = SPHERE_R * pulse;

      // Spawn new particles on sphere surface
      for (let i = 0; i < NUM_ADD; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(Math.random() * 2 - 1);
        const x0 = sr * Math.sin(phi) * Math.cos(theta);
        const y0 = sr * Math.sin(phi) * Math.sin(theta);
        const z0 = sr * Math.cos(phi);
        const p = addP(x0, y0, SPH_CZ + z0, 0.002 * x0, 0.002 * y0, 0.002 * z0);
        p.attack = 42;
        p.hold = 58;
        p.decay = 92;
        p.holdV = 1;
        p.stuck = 78 + Math.random() * 28;
      }

      // Clear
      ctx.clearRect(0, 0, SIZE, SIZE);

      // === Outer ambient glow (large, soft) ===
      {
        const gr = 72 * pulse;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr * 1.7);
        grd.addColorStop(
          0,
          `hsla(${a.hue},${a.sat}%,${a.lit}%,${0.2 * a.globalAlpha})`,
        );
        grd.addColorStop(
          0.45,
          `hsla(${a.hue},${a.sat}%,${a.lit}%,${0.07 * a.globalAlpha})`,
        );
        grd.addColorStop(1, `hsla(${a.hue},${a.sat}%,${a.lit}%,0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, gr * 1.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // === Inner core glow (tight, bright) ===
      {
        const cr = 28 * pulse;
        const cgrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        cgrd.addColorStop(0, `rgba(255,255,255,${0.12 * a.globalAlpha})`);
        cgrd.addColorStop(
          0.4,
          `hsla(${a.hue},${a.sat}%,${a.lit + 12}%,${0.08 * a.globalAlpha})`,
        );
        cgrd.addColorStop(1, `hsla(${a.hue},${a.sat}%,${a.lit}%,0)`);
        ctx.fillStyle = cgrd;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }

      // === Update + draw particles ===
      let p = pList.first;
      while (p !== null) {
        const nx = p.next;
        p.age++;

        // After stuck time, drift outward with random micro-turbulence
        if (p.age > p.stuck) {
          p.vx += RAND_ACCEL * (Math.random() * 2 - 1);
          p.vy += RAND_ACCEL * (Math.random() * 2 - 1);
          p.vz += RAND_ACCEL * (Math.random() * 2 - 1);
          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;
        }

        // Rotate around Y axis (same as rectangleworld)
        const relZ = p.z - SPH_CZ;
        const rx = cosA * p.x + sinA * relZ;
        const rz = -sinA * p.x + cosA * relZ + SPH_CZ;

        // Perspective projection
        const m = F_LEN / (F_LEN - rz);
        p.projX = rx * m + cx;
        p.projY = p.y * m + cy;

        // Alpha envelope (attack → hold → decay)
        const tot = p.attack + p.hold + p.decay;
        if (p.age < tot) {
          if (p.age < p.attack) p.alpha = (p.holdV / p.attack) * p.age;
          else if (p.age < p.attack + p.hold) p.alpha = p.holdV;
          else p.alpha = p.holdV * (1 - (p.age - p.attack - p.hold) / p.decay);
        } else {
          p.dead = true;
        }

        const outside =
          p.projX > SIZE ||
          p.projX < 0 ||
          p.projY > SIZE ||
          p.projY < 0 ||
          rz > F_LEN - 2;

        if (outside || p.dead) {
          recP(p);
          p = nx;
          continue;
        }

        // Depth-based darkening (back particles dimmer)
        const depthF = Math.max(0, Math.min(1, 1 - rz / ZERO_ALPHA_Z));
        const fa = depthF * p.alpha * a.globalAlpha;

        // Slight hue shift by depth for chromatic depth — front particles hue2, back particles hue
        const hueBlend = a.hue + (a.hue2 - a.hue) * Math.max(0, rz / -200);

        ctx.fillStyle = `hsla(${hueBlend},${a.sat}%,${a.lit}%,${fa})`;
        ctx.beginPath();
        ctx.arc(p.projX, p.projY, m * P_RAD, 0, 2 * Math.PI, false);
        ctx.closePath();
        ctx.fill();

        p = nx;
      }

      rafRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      className="block w-[200px] h-[200px]"
      aria-hidden="true"
    />
  );
};

export default VoiceOrb;
