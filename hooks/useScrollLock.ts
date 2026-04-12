import { useEffect, useRef } from 'react';

// Module-level ref counter for concurrent lock support
let activeLocks = 0;

/**
 * useScrollLock — Prevent body scroll when modal/sheet is open.
 *
 * Handles iOS Safari quirks by using position:fixed + scrollY preservation
 * instead of overflow:hidden (which has WebKit bugs).
 *
 * Supports concurrent locks — only restores scroll when the last lock is released.
 *
 * Usage:
 *   const [isOpen, setIsOpen] = useState(false);
 *   useScrollLock(isOpen);
 *
 * @param isLocked - Whether to lock the body scroll
 */
export function useScrollLock(isLocked: boolean) {
  const scrollYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLocked || typeof window === 'undefined') return;

    // Store current scroll position (only on first lock)
    if (activeLocks === 0) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    }
    activeLocks++;

    // Cleanup: restore scroll position only when last lock is released
    return () => {
      activeLocks--;
      if (activeLocks > 0) return;

      // Safety: only restore if body is actually locked
      if (document.body.style.position !== 'fixed') return;

      const scrollY = scrollYRef.current ?? 0;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
      scrollYRef.current = null;
    };
  }, [isLocked]);
}
