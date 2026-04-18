# Modal & Bottom Sheet QA Checklist

> **Purpose:** Ensure every modal, bottom sheet, and overlay component meets 95%+ quality standards before shipping.
> **Scope:** All projects — apply this checklist to every modal/bottom sheet implementation.

---

## Phase 1: Core Functionality (0–40%)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1.1 | Component renders without errors | ☐ | No console errors, no TypeScript errors |
| 1.2 | Opens and closes correctly | ☐ | Trigger works, close button works |
| 1.3 | Backdrop click closes modal | ☐ | Clicking outside content dismisses |
| 1.4 | Escape key closes modal | ☐ | `keydown` listener for `Escape` |
| 1.5 | Body scroll locked when open | ☐ | Use `useScrollLock` hook — position:fixed + scrollY preservation |
| 1.6 | Scroll position restored on close | ☐ | Page returns to exact scroll position |
| 1.7 | No scroll chaining to background | ☐ | `overscroll-behavior: contain` on content |
| 1.8 | Smooth animation on open/close | ☐ | Spring or ease transition, 200–400ms |

---

## Phase 2: Scroll Safety (40–60%)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 2.1 | `useScrollLock` hook used (not manual body styles) | ☐ | Import from `hooks/useScrollLock` |
| 2.2 | SSR-safe (`typeof window` guard) | ☐ | Hook checks `typeof window !== 'undefined'` |
| 2.3 | Concurrent lock support (ref counter) | ☐ | Multiple modals don't interfere |
| 2.4 | `overscroll-behavior: contain` on scrollable content | ☐ | Inline style or `.scroll-contain` class |
| 2.5 | `-webkit-overflow-scrolling: touch` for iOS | ☐ | Smooth scrolling on Safari |
| 2.6 | `touch-action: pan-y` on modal content | ☐ | Prevents horizontal scroll interference |
| 2.7 | `touch-action: none` on backdrop | ☐ | Backdrop doesn't receive scroll |
| 2.8 | No rubber-band bleed on iOS | ☐ | Body has `overscroll-behavior-y: none` |

---

## Phase 3: Accessibility (60–80%)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 3.1 | `role="dialog"` on modal container | ☐ | Screen reader announces as dialog |
| 3.2 | `aria-modal="true"` on modal container | ☐ | Indicates modal behavior |
| 3.3 | `aria-label` or `aria-labelledby` describes content | ☐ | Meaningful description |
| 3.4 | Close button is `<button type="button">` | ☐ | Not a div or span |
| 3.5 | Close button has `min-h-[44px]` (touch target) | ☐ | WCAG 2.5.5 target size |
| 3.6 | Close button has `focus-visible` ring | ☐ | Visible focus indicator |
| 3.7 | Content structured with proper headings | ☐ | `<h3>`, `<h4>` hierarchy |
| 3.8 | Respects `prefers-reduced-motion` | ☐ | Framer Motion handles automatically |
| 3.9 | Color contrast ≥ 4.5:1 for all text | ☐ | WCAG AA minimum |
| 3.10 | Decorative elements have `aria-hidden="true"` | ☐ | Handle bars, dividers |

---

## Phase 4: Cross-Browser (80–90%)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 4.1 | Chrome mobile emulation | ☐ | No overflow, scroll works |
| 4.2 | Safari iOS emulation | ☐ | No rubber-band, no position jumps |
| 4.3 | Firefox mobile | ☐ | Consistent behavior |
| 4.4 | Touch gestures work | ☐ | Tap, swipe, scroll all functional |
| 4.5 | No horizontal overflow at any breakpoint | ☐ | `overflow-x: hidden` on body |
| 4.6 | Safe area insets handled (notched devices) | ☐ | `env(safe-area-inset-*)` or `.safe-bottom` |

---

## Phase 5: Code Quality (90–100%)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 5.1 | TypeScript compiles with zero errors | ☐ | `npx tsc --noEmit` |
| 5.2 | Lint passes (or pre-existing issues only) | ☐ | `npm run lint` |
| 5.3 | No `any` types in new code | ☐ | Proper interfaces |
| 5.4 | No unused imports | ☐ | Clean imports |
| 5.5 | No dead CSS classes | ☐ | All defined classes used |
| 5.6 | Component follows project conventions | ☐ | Naming, structure, patterns |
| 5.7 | Reusable component extracted if used 2+ times | ☐ | `components/ui/bottom-sheet.tsx` |
| 5.8 | Documentation/comments for complex logic | ☐ | JSDoc on hooks, components |

---

## Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Developer | | | ☐ |
| Visual QA | | | ☐ |
| Accessibility QA | | | ☐ |
| Code Review | | | ☐ |

**Minimum score to ship: 95% (all Critical + High checks must pass)**

---

## Reusable Assets

| Asset | Path | Purpose |
|-------|------|---------|
| `useScrollLock` hook | `hooks/useScrollLock.ts` | Body scroll lock with iOS support |
| `BottomSheet` component | `components/ui/bottom-sheet.tsx` | Reusable modal/bottom sheet |
| `.scroll-contain` CSS class | `src/styles/global.css` | Scroll containment utility |
| `.modal-backdrop` CSS class | `src/styles/global.css` | Backdrop touch handling |
| `.safe-bottom` CSS class | `src/styles/global.css` | Notched device safe area |
| `.safe-top` CSS class | `src/styles/global.css` | Notched device safe area |
