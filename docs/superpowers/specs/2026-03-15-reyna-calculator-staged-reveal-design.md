# Reyna Calculator Staged Reveal — Design Spec

**Date:** 2026-03-15
**Status:** Approved
**Goal:** Make the calculator presentation a perfectly timed "wow factor" moment by syncing Reyna's voice delivery with staged visual animations.

## The Experience

When a prospect gives Reyna their numbers (revenue per job + missed calls per day), Reyna:
1. Repeats their numbers back to confirm
2. Says "Let's check the calculator and see how much revenue you're losing"
3. That line triggers the calculator to scroll into view
4. The sliders physically move to the customer's values while they watch
5. The monthly loss counts up dramatically from $0
6. Reyna narrates each number with deliberate pauses between them

## Sequence Timeline

| Step | Time  | Reyna (Voice)                                                    | Calculator (Visual)                              |
|------|-------|------------------------------------------------------------------|--------------------------------------------------|
| 1    | 0s    | "So [X] calls a day, each worth $[Y]..."                        | Not visible yet                                  |
| 2    | ~2s   | "Let's check the calculator and see how much you're losing."    | **Scrolls into view**                            |
| 3    | ~3.5s | *pause — lets user look*                                         | Sliders at default values, user sees the tool     |
| 4    | ~4s   | —                                                                | Revenue slider **physically slides** to value     |
| 5    | ~5.5s | —                                                                | Missed calls slider **physically slides** to value|
| 6    | ~7s   | *drops tone* "That means every single month..."                  | Monthly loss **counts up** $0 → final, pulse      |
| 7    | ~9s   | "You're losing $[monthly] every month."                          | Number lands, scale pulse animation               |
| 8    | ~11s  | *pause* "Over a year? That's $[yearly]."                         | Yearly loss **fades in**                          |
| 9    | ~13s  | *silence — lets it sit*                                          |                                                   |
| 10   | ~15s  | "Does that number surprise you?"                                 |                                                   |

## Layer 1: AgentPrompt.ts Changes

Rewrite the `## Calculator Flow` section with:
- Explicit instruction to repeat customer numbers back first
- The exact transition line: "Let's check the calculator..."
- Instruction to DROP energy/pace when presenting numbers
- Walk through three components one at a time: calls → clients → revenue
- Explicit pauses between each number
- "Let the number land" instruction with specific silence duration
- End with "Does that number surprise you?"

## Layer 2: Calculator.tsx Changes

Add "presentation mode" triggered by the `updateCalculator` custom event:

### State
- `presentationMode: boolean` — when true, staged animation is active
- `presentationStage: number` (0-4) — which stage we're at
- `targetRevenue: number` — the target value to animate to
- `targetMissedCalls: number` — the target value to animate to

### Animation Stages
1. **Stage 0 — Scroll** (0ms): Scroll calculator into view with smooth behavior
2. **Stage 1 — Revenue slider** (1500ms delay): Animate `revenuePerCustomer` from current → target using `requestAnimationFrame` over 800ms
3. **Stage 2 — Missed calls slider** (3000ms delay): Animate `missedCalls` from current → target over 800ms
4. **Stage 3 — Monthly loss count-up** (4500ms delay): Count up the monthly loss display from $0 → final over 1500ms with easing, then pulse/scale animation
5. **Stage 4 — Yearly reveal** (7000ms delay): Fade in yearly loss card with opacity animation

### Visual Effects
- Slider thumbs should visibly move (CSS transition on the range input value)
- Monthly loss number: count-up animation with `ease-out` curve
- Monthly loss card: `scale(1) → scale(1.05) → scale(1)` pulse when number lands
- Yearly loss card: `opacity: 0 → 1` fade-in over 500ms
- After all stages complete, `presentationMode` resets to false (user can interact normally)

### Implementation Notes
- Range inputs don't animate natively — use controlled state updates via `requestAnimationFrame` to step the value incrementally
- The count-up effect uses a separate display value that interpolates toward the calculated result
- Manual slider interaction during presentation mode cancels the animation (user takes control)
- `updateCalculator` event handler checks if already in presentation mode to prevent double-triggering

## Files Changed

| File | Change |
|------|--------|
| `components/AgentPrompt.ts` | Rewrite Calculator Flow section |
| `components/Calculator.tsx` | Add presentation mode with staged animations |

## No Changes Needed
- `hooks/useGeminiLive.ts` — tool call stays the same (`update_calculator(revenue, missedCalls)`)
- No new tools or API changes
