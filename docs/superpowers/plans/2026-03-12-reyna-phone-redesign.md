# Reyna Phone Redesign — "Reyna Awakens" Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Hero phone mockup so it is visually striking, fully functional, and shows the live transcript clearly — with a rotating constellation orb replacing the old blob, and a progressive layout that transforms when a call starts.

**Architecture:** Extract the phone UI from `Hero.tsx` into a focused `PhoneDemo.tsx` component. Create a pure-CSS `ConstellationOrb.tsx` for the animated star. Hero.tsx becomes a clean layout file that passes state props down. All voice logic stays untouched in the hooks.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion (already installed), Lucide React icons, no new dependencies.

---

## Chunk 1: ConstellationOrb Component

### Task 1: Create the ConstellationOrb component

**Files:**
- Create: `components/ui/ConstellationOrb.tsx`

This is a pure visual component — zero audio logic. It renders three concentric rings of dots that rotate independently. Props control the visual state (idle/connecting/agent_speaking/user_speaking/error).

The `@keyframes` are declared **once** in a single `<style>` block at the top of the SVG, NOT inside the `.map()` loop, to avoid duplicate rule injection on re-renders.

The SVG has an explicit CSS `transition` on `width`/`height` so the orb shrinks smoothly when the parent changes the `size` prop from 160→80.

- [ ] **Step 1: Create the file**

```tsx
// components/ui/ConstellationOrb.tsx
import type React from 'react';

export type OrbState =
  | 'idle'
  | 'connecting'
  | 'agent_speaking'
  | 'user_speaking'
  | 'error';

interface ConstellationOrbProps {
  state: OrbState;
  size?: number; // px, default 160
}

// Ring config: [dotCount, radiusFraction, baseDurationSeconds, direction]
const RINGS: [number, number, number, 1 | -1][] = [
  [6,  0.28, 8,  1],   // inner — 6 dots, clockwise
  [10, 0.44, 14, -1],  // mid   — 10 dots, counter-clockwise
  [14, 0.60, 20, 1],   // outer — 14 dots, clockwise
];

const STATE_COLORS: Record<OrbState, { dot: string; glow: string; speed: number }> = {
  idle:           { dot: '#4fa8ff', glow: 'rgba(79,168,255,0.18)',  speed: 1   },
  connecting:     { dot: '#f59e0b', glow: 'rgba(245,158,11,0.22)',  speed: 2.2 },
  agent_speaking: { dot: '#4ade80', glow: 'rgba(74,222,128,0.28)',  speed: 3.5 },
  user_speaking:  { dot: '#38bdf8', glow: 'rgba(56,189,248,0.28)',  speed: 2.8 },
  error:          { dot: '#f87171', glow: 'rgba(248,113,113,0.22)', speed: 1   },
};

// Build the @keyframes CSS string once — not inside any render loop.
// Three animation names: orbRing0CW, orbRing1CCW, orbRing2CW
const KEYFRAMES_CSS = RINGS.map(([, , , dir], i) => {
  const name = `orbRing${i}${dir > 0 ? 'CW' : 'CCW'}`;
  return `@keyframes ${name} {
    from { transform: rotate(${dir > 0 ? '0deg' : '360deg'}); }
    to   { transform: rotate(${dir > 0 ? '360deg' : '0deg'}); }
  }`;
}).join('\n');

const ConstellationOrb: React.FC<ConstellationOrbProps> = ({ state, size = 160 }) => {
  const { dot: dotColor, glow, speed } = STATE_COLORS[state];
  const center = size / 2;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      // CSS transition on the container so the orb shrinks smoothly
      style={{ width: size, height: size, transition: 'width 0.5s ease, height 0.5s ease' }}
      aria-hidden="true"
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-700"
        style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)` }}
      />

      {/* SVG rings — keyframes declared once at top, not per-ring */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          position: 'absolute',
          inset: 0,
          // Smooth resize with the container
          transition: 'width 0.5s ease, height 0.5s ease',
        }}
      >
        {/* Single style block for all keyframes */}
        <style>{KEYFRAMES_CSS}</style>

        {RINGS.map(([count, radiusFraction, baseDuration, dir], ringIndex) => {
          const radius = center * radiusFraction;
          const duration = (baseDuration / speed).toFixed(2);
          const animName = `orbRing${ringIndex}${dir > 0 ? 'CW' : 'CCW'}`;

          return (
            <g
              key={`ring-${ringIndex}`}
              style={{
                transformOrigin: `${center}px ${center}px`,
                animation: `${animName} ${duration}s linear infinite`,
              }}
            >
              {Array.from({ length: count }).map((_, i) => {
                const angle = (i / count) * Math.PI * 2;
                const x = center + Math.cos(angle) * radius;
                const y = center + Math.sin(angle) * radius;
                const dotR = ringIndex === 0 ? 2.2 : ringIndex === 1 ? 1.8 : 1.4;
                const opacity = 0.55 + (i % 3) * 0.15;

                return (
                  <circle
                    key={`dot-${ringIndex}-${i}`}
                    cx={x}
                    cy={y}
                    r={dotR}
                    fill={dotColor}
                    opacity={opacity}
                    style={{ transition: 'fill 0.6s ease, opacity 0.6s ease' }}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Center core */}
      <div
        className="relative rounded-full transition-all duration-700"
        style={{
          width: size * 0.14,
          height: size * 0.14,
          background: dotColor,
          boxShadow: `0 0 ${size * 0.1}px ${dotColor}`,
          opacity: state === 'idle' ? 0.7 : 1,
        }}
      />
    </div>
  );
};

export default ConstellationOrb;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run lint` in `d:/Desktop/reynubix/reynubixvoice-landing-page/`
Expected: no errors in `components/ui/ConstellationOrb.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/ui/ConstellationOrb.tsx
git commit -m "feat: add ConstellationOrb animated SVG component"
```

---

## Chunk 2: PhoneDemo Component

### Task 2: Create PhoneDemo.tsx

**Files:**
- Create: `components/PhoneDemo.tsx`
- Read for reference: `components/Hero.tsx` (lines 255–577)
- Read for reference: `contexts/LanguageContext.tsx`

**Key design decisions documented here:**

- `consentHelp` subtext IS preserved — it appears below the checkbox in the consent card
- The floating phone bob animation (`y: [0,-16,0]`) is preserved on the outer `motion.div` wrapper in Hero.tsx (see Chunk 3). The phone itself does not include this animation.
- `<LayoutGroup>` from Framer Motion wraps `PhoneDemo` to enable the `layout` prop to animate the orb container's size transition. The `layout` prop animates the *container* while the `ConstellationOrb`'s own CSS transitions handle the SVG/glow smoothly.
- Mic icon: shows `Mic` (active) when user is speaking, `MicOff` when silent — semantically correct.

- [ ] **Step 1: Read LanguageContext to verify translation keys**

Open `contexts/LanguageContext.tsx` and confirm all of these keys exist across all locales. If any are missing, add them (see Chunk 4 for the audit checklist).

- [ ] **Step 2: Create PhoneDemo.tsx**

```tsx
// components/PhoneDemo.tsx
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { LoaderCircle, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { TranscriptEntry } from '../hooks/useGeminiLive';
import ConstellationOrb, { type OrbState } from './ui/ConstellationOrb';

interface PhoneDemoProps {
  connected: boolean;
  isConnecting: boolean;
  isAgentSpeaking: boolean;
  isUserSpeaking: boolean;
  error: string | null;
  transcript: TranscriptEntry[];
  isLiveSession: boolean;
  isReconnecting: boolean;
  isGroqActive: boolean;
  consentAccepted: boolean;
  consentError: string | null;
  onConsentChange: (accepted: boolean) => void;
  onPhoneButtonClick: () => void;
}

function getOrbState(props: PhoneDemoProps): OrbState {
  if (props.error) return 'error';
  if (props.isConnecting) return 'connecting';
  if (props.isAgentSpeaking) return 'agent_speaking';
  if (props.isUserSpeaking) return 'user_speaking';
  return 'idle';
}

const PhoneDemo: React.FC<PhoneDemoProps> = (props) => {
  const { t } = useLanguage();
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript to bottom on new entries
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [props.transcript]);

  const orbState = getOrbState(props);
  const orbSize = props.connected ? 80 : 160;

  let phoneTitle = t.hero.live.idleTitle;
  let phoneSubtitle = t.hero.live.idleSubtitle;

  if (props.error) {
    phoneTitle = t.hero.live.errorTitle;
    phoneSubtitle = props.error;
  } else if (props.isConnecting) {
    phoneTitle = t.hero.live.connectingTitle;
    phoneSubtitle = t.hero.live.connectingSubtitle;
  } else if (props.connected) {
    phoneTitle = t.hero.live.connectedTitle;
    if (props.isAgentSpeaking) phoneSubtitle = t.hero.live.speaking;
    else if (props.isUserSpeaking) phoneSubtitle = t.hero.live.listening;
    else phoneSubtitle = t.hero.live.connectedSubtitle;
  }

  const callBtnBg = props.connected
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : props.isConnecting
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';

  const callBtnShadow = props.connected
    ? '0 0 24px rgba(239,68,68,0.45), 0 4px 12px rgba(0,0,0,0.3)'
    : props.isConnecting
      ? '0 0 24px rgba(245,158,11,0.4), 0 4px 12px rgba(0,0,0,0.3)'
      : '0 0 20px rgba(34,197,94,0.4), 0 4px 12px rgba(0,0,0,0.3)';

  return (
    // LayoutGroup enables the Framer Motion `layout` prop on the orb container
    // to animate its size change smoothly when connected state flips.
    <LayoutGroup>
      <div
        className="relative w-[320px] rounded-[2.5rem] overflow-hidden flex flex-col"
        style={{
          height: 'clamp(520px, 58vw, 620px)',
          background: 'linear-gradient(145deg, #1a1a2e 0%, #0a0a0f 50%, #16162a 100%)',
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.06),
            0 0 0 3px #0a0a0f,
            0 0 0 4px rgba(255,255,255,0.08),
            0 25px 60px -12px rgba(0,0,0,0.7),
            0 8px 20px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.05)
          `,
        }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-20" />

        {/* Inner screen */}
        <div
          className="absolute inset-[3px] rounded-[2.3rem] overflow-hidden flex flex-col"
          style={{ background: 'linear-gradient(180deg, #0c0c14 0%, #060609 40%, #0a0a12 100%)' }}
        >
          {/* ── STATUS BAR ─────────────────────────────── */}
          <div className="pt-8 pb-3 px-5 shrink-0 flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  props.error
                    ? 'bg-red-400'
                    : props.isLiveSession
                      ? 'bg-green-400 animate-pulse'
                      : 'bg-[#4fa8ff]'
                }`}
              />
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/70 whitespace-nowrap">
                {props.isLiveSession ? t.hero.live.sessionLabel : t.hero.tag}
              </span>
            </div>
            {props.isGroqActive && (
              <span className="text-[9px] text-amber-400 font-medium tracking-wider uppercase">
                Backup
              </span>
            )}
            {props.isReconnecting && (
              <span className="text-[9px] text-yellow-300/80 font-medium tracking-wider uppercase animate-pulse">
                Reconnecting…
              </span>
            )}
          </div>

          {/* ── ORB (shrinks when connected) ────────────── */}
          {/* motion.div layout animates the container's padding/size smoothly */}
          <motion.div
            layout
            className="flex justify-center shrink-0"
            style={{ paddingBottom: props.connected ? 8 : 16 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ConstellationOrb state={orbState} size={orbSize} />
          </motion.div>

          {/* ── TITLE + SUBTITLE (idle / connecting / error) ─ */}
          <AnimatePresence mode="wait">
            {!props.connected && (
              <motion.div
                key="idle-text"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-center px-5 shrink-0 mb-1"
              >
                <h2 className="text-white text-xl font-bold mb-1">{phoneTitle}</h2>
                <p className="text-[11px] leading-[1.55] text-white/55">{phoneSubtitle}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── TRANSCRIPT (connected only) ──────────────── */}
          <AnimatePresence>
            {props.connected && (
              <motion.div
                key="transcript"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex-1 mx-4 mb-3 min-h-0 overflow-hidden"
              >
                <div
                  className="h-full overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 space-y-3"
                  style={{ maxHeight: 210 }}
                >
                  {props.transcript.filter((e) => e.text.trim()).length === 0 ? (
                    <p className="text-[11px] text-white/40 text-center pt-2">
                      {phoneSubtitle}
                    </p>
                  ) : (
                    props.transcript
                      .filter((e) => e.text.trim())
                      .map((entry) => (
                        <div key={entry.id}>
                          <p
                            className="text-[9px] font-bold uppercase tracking-[0.16em] mb-0.5"
                            style={{ color: entry.speaker === 'ai' ? '#4fa8ff' : '#38bdf8' }}
                          >
                            {entry.speaker === 'ai'
                              ? t.hero.widget.agent
                              : t.hero.live.userLabel}
                          </p>
                          <p className="text-[12px] leading-[1.6] text-white/80">
                            {entry.text}
                          </p>
                        </div>
                      ))
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── CONSENT (idle / pre-connect only) ────────── */}
          <AnimatePresence>
            {!props.connected && (
              <motion.div
                key="consent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mx-4 mb-3 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
              >
                <label className="flex items-start gap-2.5 text-[10.5px] leading-[1.5] text-white/75 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={props.consentAccepted}
                    onChange={(e) => props.onConsentChange(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-white/25 bg-white/10 text-[#4fa8ff] shrink-0 cursor-pointer"
                  />
                  <span>{t.hero.live.consentLabel}</span>
                </label>
                {/* consentHelp secondary text — preserved from original */}
                <p className="mt-1.5 text-[10px] text-white/50 pl-6">
                  {t.hero.live.consentHelp}
                </p>
                {props.consentError && (
                  <p className="mt-1 text-[9.5px] text-red-300 pl-6">{props.consentError}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── CONTROLS ─────────────────────────────────── */}
          <div className="flex items-center justify-center gap-6 pb-6 pt-1 shrink-0">
            {/* Left — end call indicator */}
            <div
              className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors ${
                props.connected
                  ? 'bg-red-500/10 border-red-400/30 text-red-300'
                  : 'bg-white/[0.04] border-white/10 text-white/25'
              }`}
            >
              <PhoneOff size={18} />
            </div>

            {/* Center — main call button */}
            <button
              type="button"
              onClick={props.onPhoneButtonClick}
              disabled={props.isConnecting}
              aria-label={props.connected ? t.hero.live.endButtonLabel : t.hero.live.startButtonLabel}
              aria-busy={props.isConnecting}
              aria-pressed={props.connected}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white transition-transform duration-200 active:scale-95 disabled:active:scale-100 disabled:cursor-wait disabled:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060b]"
              style={{
                background: callBtnBg,
                boxShadow: callBtnShadow,
                animation:
                  props.connected || props.isConnecting
                    ? 'none'
                    : 'phoneBtnPulse 2s ease-in-out infinite',
              }}
            >
              {props.isConnecting ? (
                <LoaderCircle size={28} className="animate-spin" />
              ) : props.connected ? (
                <PhoneOff size={28} />
              ) : (
                <Phone size={28} />
              )}
            </button>

            {/* Right — mic state indicator (Mic when active, MicOff when silent) */}
            <div
              className={`w-11 h-11 rounded-full border flex items-center justify-center transition-colors ${
                props.isUserSpeaking
                  ? 'bg-sky-500/[0.12] border-sky-400/30 text-sky-300'
                  : 'bg-white/[0.04] border-white/10 text-white/25'
              }`}
            >
              {props.isUserSpeaking ? <Mic size={18} /> : <MicOff size={18} />}
            </div>
          </div>

          <style>{`
            @keyframes phoneBtnPulse {
              0%, 100% { box-shadow: 0 0 20px rgba(34,197,94,0.4), 0 4px 12px rgba(0,0,0,0.3); }
              50%       { box-shadow: 0 0 32px rgba(34,197,94,0.65), 0 4px 16px rgba(0,0,0,0.4); }
            }
          `}</style>
        </div>
      </div>
    </LayoutGroup>
  );
};

export default PhoneDemo;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run lint`
Expected: no errors in `components/PhoneDemo.tsx`

- [ ] **Step 4: Commit**

```bash
git add components/PhoneDemo.tsx
git commit -m "feat: add PhoneDemo component with progressive idle/connected layout"
```

---

## Chunk 3: Refactor Hero.tsx to use PhoneDemo

### Task 3: Replace inline phone JSX in Hero.tsx with PhoneDemo

**Files:**
- Modify: `components/Hero.tsx`

**What to keep, what to remove, and what to add — precisely:**

**REMOVE** (these become dead code after PhoneDemo takes over):
- Lines 55–73: the `phoneTitle` / `phoneSubtitle` / `centerButtonBackground` / `centerButtonShadow` / `orbOuterGlow` / `orbInnerGlow` derivation block
- Lines 357–569: the entire `<motion.div className="relative w-[280px]..."` phone block including the `<style>` block at lines 556–569
- From the imports: `MicOff`, `Phone`, `PhoneOff`, `LoaderCircle` (only if they are not used anywhere else in Hero.tsx)

**KEEP** (untouched):
- All hook calls (`useGeminiLive`)
- Lines 25–53: the unified interface variables (`connected`, `isConnecting`, etc.)
- Lines 111–132: `handlePhoneButtonClick`
- Lines 32–33: `consentAccepted` / `consentError` state
- Lines 266–355: the three floating widget `motion.div` blocks

**ADD:**
- Import: `import PhoneDemo from './PhoneDemo';`

- [ ] **Step 1: Add PhoneDemo import**

In `components/Hero.tsx`, add after the last existing import:
```tsx
import PhoneDemo from './PhoneDemo';
```

- [ ] **Step 2: Remove dead derivation variables**

Delete the block in `Hero.tsx` that starts with:
```tsx
let phoneTitle = t.hero.live.idleTitle;
```
and ends with:
```tsx
const orbInnerGlow = error
  ? ...
  : ...
```
This entire block (roughly lines 55–109) is now handled inside `PhoneDemo.tsx`.

- [ ] **Step 3: Replace the phone motion.div with PhoneDemo**

Replace the second `<motion.div>` inside the grid (the one wrapping the phone — line ~255 to the matching `</motion.div>` at ~570, including the `<style>` block) with the following.

**Keep the floating bob animation** (`y: [0,-16,0]`) from the original outer phone wrapper:

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  // The outer bob animation is preserved — it makes the whole phone float
  animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
  transition={{
    opacity: { duration: 1.2, delay: 0.18, ease: [0.25, 0.46, 0.45, 0.94] },
    scale:   { duration: 1.2, delay: 0.18, ease: [0.25, 0.46, 0.45, 0.94] },
    y:       { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.18 },
  }}
  className="relative flex items-center justify-center"
  style={{ height: 'clamp(520px, 58vw, 640px)' }}
>
  {/* ── Floating widget: Appointment Booked ───────────────────────── */}
  {/* Copy lines 266–305 from the current Hero.tsx verbatim here.     */}
  {/* This is the motion.div with animate={{ y: [0,-12,0] }}          */}
  {/* containing the hero-float-card with the calendar icon.          */}

  {/* ── Floating widget: Revenue Saved ────────────────────────────── */}
  {/* Copy lines 306–337 from the current Hero.tsx verbatim here.     */}
  {/* This is the motion.div with animate={{ y: [0,-10,0] }}          */}
  {/* containing the hero-float-card with the $ badge.                */}

  {/* ── Floating widget: 100% Answer Rate ─────────────────────────── */}
  {/* Copy lines 338–356 from the current Hero.tsx verbatim here.     */}
  {/* This is the motion.div with animate={{ y: [0,-8,0] }}           */}
  {/* containing the green dot + "100% Answer Rate" pill.             */}

  {/* ── New phone UI ──────────────────────────────────────────────── */}
  <PhoneDemo
    connected={connected}
    isConnecting={isConnecting}
    isAgentSpeaking={isAgentSpeaking}
    isUserSpeaking={isUserSpeaking}
    error={error}
    transcript={transcript}
    isLiveSession={isLiveSession}
    isReconnecting={gemini.isReconnecting}
    isGroqActive={isGroqActive}
    consentAccepted={consentAccepted}
    consentError={consentError}
    onConsentChange={(accepted) => {
      setConsentAccepted(accepted);
      if (accepted) setConsentError(null);
    }}
    onPhoneButtonClick={handlePhoneButtonClick}
  />
</motion.div>
```

> **Implementation note:** The three floating widget blocks use line numbers from the **current** `Hero.tsx`. Read the file before editing and copy those exact JSX blocks — do not paraphrase. The comments above tell you precisely which blocks to copy.

> **Framer Motion note:** The outer wrapper uses two separate `animate` keys for `scale`/`opacity` (entrance) and `y` (infinite bob). Framer Motion supports this with per-key `transition` objects as shown above.

- [ ] **Step 4: Verify TypeScript compiles — no unused variables**

Run: `npm run lint`
Expected: no unused variable warnings for `phoneTitle`, `phoneSubtitle`, `centerButtonBackground`, `centerButtonShadow`, `orbOuterGlow`, `orbInnerGlow`. Fix any that remain.

- [ ] **Step 5: Verify the app runs**

Run: `npm run dev` — open `http://localhost:3000/`
Check:
- Hero section loads, phone visible
- Idle state: orb (160px, 3 rings rotating), title, consent card, green call button
- The three floating info cards (Appointment, Revenue, Answer Rate) are still visible around the phone
- Status badge is NOT clipped by the notch

- [ ] **Step 6: Commit**

```bash
git add components/Hero.tsx
git commit -m "refactor: replace inline phone JSX with PhoneDemo component"
```

---

## Chunk 4: Translation Keys Audit

### Task 4: Ensure all required keys exist in LanguageContext

**Files:**
- Read + possibly modify: `contexts/LanguageContext.tsx`

- [ ] **Step 1: Open `contexts/LanguageContext.tsx` and verify ALL of these keys exist in every locale (en, fr, nl or whatever locales are defined):**

```
t.hero.tag
t.hero.live.idleTitle
t.hero.live.idleSubtitle
t.hero.live.errorTitle
t.hero.live.connectingTitle
t.hero.live.connectingSubtitle
t.hero.live.connectedTitle
t.hero.live.speaking
t.hero.live.listening
t.hero.live.connectedSubtitle
t.hero.live.sessionLabel
t.hero.live.userLabel
t.hero.live.consentLabel
t.hero.live.consentHelp        ← used in PhoneDemo consent card
t.hero.live.consentRequired    ← used in handlePhoneButtonClick in Hero.tsx
t.hero.live.startButtonLabel
t.hero.live.endButtonLabel
t.hero.live.retry
t.hero.widget.agent
```

- [ ] **Step 2: Add any missing keys** following the exact same pattern/format used for existing keys in the file.

- [ ] **Step 3: Run lint check**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit if changes were made**

```bash
git add contexts/LanguageContext.tsx
git commit -m "fix: add any missing hero phone translation keys"
```

---

## Chunk 5: Final QA Checklist

### Task 5: End-to-end visual + functional verification

- [ ] **Idle state** — Open `http://localhost:3000/`:
  - [ ] Phone is 320px wide with dark glass aesthetic
  - [ ] Status badge fully visible, NOT clipped by the notch
  - [ ] Constellation orb: 3 concentric rings of dots, rotating independently
  - [ ] Orb is blue (#4fa8ff) in idle state
  - [ ] Title and subtitle text visible below orb
  - [ ] Consent card shows checkbox + label + `consentHelp` subtext
  - [ ] Green call button pulsing softly
  - [ ] Three floating info cards visible around the phone

- [ ] **Consent validation** — Click call button WITHOUT ticking consent:
  - [ ] Red error text appears below the checkbox
  - [ ] No connection attempt is made

- [ ] **Connect transition** — Tick consent, click green button:
  - [ ] Orb smoothly shrinks from 160px to 80px
  - [ ] Consent card fades out
  - [ ] Transcript panel slides in and fills the vacated space
  - [ ] Status badge changes to "LIVE" with green pulse dot
  - [ ] Orb color: blue → amber (connecting) → green (agent speaking)

- [ ] **Transcript legibility** — During a live call:
  - [ ] AI lines shown with blue label, user lines with sky label
  - [ ] Text size is 12px — readable without squinting
  - [ ] Panel auto-scrolls to newest message
  - [ ] Shows full conversation history (not capped at 2 entries)

- [ ] **End call** — Press red button or center button while connected:
  - [ ] Orb grows back to 160px
  - [ ] Transcript fades out
  - [ ] Consent card reappears
  - [ ] Status resets to idle badge

- [ ] **Mic indicator** — During a call:
  - [ ] `Mic` icon (filled) shown when user is speaking
  - [ ] `MicOff` shown when silent

- [ ] **Reconnect recovery**:
  - [ ] After repeated Gemini failures, session backup remains available for recovery
  - [ ] Voice interaction resumes through the Gemini live reconnection path when the connection returns

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: Reyna phone redesign — constellation orb + progressive layout (Reyna Awakens)"
```

---

## Summary of All Changes

| File | Action | Reason |
|---|---|---|
| `components/ui/ConstellationOrb.tsx` | **CREATE** | New rotating SVG star animation |
| `components/PhoneDemo.tsx` | **CREATE** | New phone UI extracted from Hero |
| `components/Hero.tsx` | **MODIFY** | Remove ~300 lines of inline phone JSX, import PhoneDemo |
| `contexts/LanguageContext.tsx` | **MAYBE MODIFY** | Ensure `consentHelp` + other keys exist in all locales |
| `hooks/useGeminiLive.ts` | **ALREADY DONE** | Fixed model: `gemini-2.0-flash` → `gemini-2.0-flash-live-001` |
| `.env.local` | **ALREADY DONE** | Gemini live + server-side Groq analysis envs documented |

**No new npm dependencies.** Uses: React 19, Framer Motion, Tailwind CSS, Lucide React — all already installed.
