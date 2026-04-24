import { AnimatePresence, motion } from 'framer-motion';
import type * as React from 'react';
import { useEffect } from 'react';
import { useScrollLock } from '../../hooks/useScrollLock';

type BottomSheetVariant = 'bottom' | 'center' | 'fullscreen';

interface BottomSheetProps {
  /** Controls visibility */
  isOpen: boolean;
  /** Callback to close the sheet */
  onClose: () => void;
  /** Sheet content */
  children: React.ReactNode;
  /** Sheet title for accessibility */
  title?: string;
  /** Presentation variant */
  variant?: BottomSheetVariant;
  /** Maximum height (default: 75vh for bottom variant) */
  maxHeight?: string;
  /** Show drag handle at top */
  showHandle?: boolean;
  /** Close on backdrop click (default: true) */
  closeOnBackdropClick?: boolean;
  /** Close on Escape key (default: true) */
  closeOnEscape?: boolean;
  /** Additional classes for the backdrop */
  backdropClassName?: string;
  /** Additional classes for the sheet container */
  containerClassName?: string;
  /** Spring animation config */
  springDamping?: number;
  springStiffness?: number;
}

/**
 * BottomSheet — Accessible, scroll-safe modal/bottom sheet component.
 *
 * Features:
 * - Body scroll lock (iOS-safe via position:fixed)
 * - Scroll event containment (no chaining to background)
 * - Keyboard support (Escape to close)
 * - Backdrop click to close
 * - ARIA attributes for screen readers
 * - Smooth spring animations via Framer Motion
 * - Three variants: bottom, center, fullscreen
 *
 * Usage:
 *   <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Details">
 *     <p>Full content here...</p>
 *   </BottomSheet>
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  variant = 'bottom',
  maxHeight,
  showHandle = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  backdropClassName,
  containerClassName,
  springDamping = 28,
  springStiffness = 300,
}: BottomSheetProps) {
  // Lock body scroll when open
  useScrollLock(isOpen);

  // Close on Escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [closeOnEscape, isOpen, onClose]);

  const defaultMaxHeight =
    variant === 'fullscreen'
      ? '100dvh'
      : variant === 'center'
        ? '88vh'
        : '75vh';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={closeOnBackdropClick ? onClose : undefined}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/70 backdrop-blur-sm ${backdropClassName ?? ''}`}
            style={{ touchAction: 'none' }}
          />

          {/* Sheet container */}
          <motion.div
            initial={
              variant === 'bottom'
                ? { y: '100%' }
                : variant === 'center'
                  ? { opacity: 0, scale: 0.95, y: 20 }
                  : { opacity: 0 }
            }
            animate={
              variant === 'bottom'
                ? { y: 0 }
                : variant === 'center'
                  ? { opacity: 1, scale: 1, y: 0 }
                  : { opacity: 1 }
            }
            exit={
              variant === 'bottom'
                ? { y: '100%' }
                : variant === 'center'
                  ? { opacity: 0, scale: 0.95, y: 20 }
                  : { opacity: 0 }
            }
            transition={{
              type: 'spring',
              damping: springDamping,
              stiffness: springStiffness,
            }}
            onClick={(e) => e.stopPropagation()}
            className={`
              relative w-full rounded-t-3xl border-t border-border/60 shadow-2xl
              bg-gradient-to-b from-[#1a1714] to-[#0d0b09]
              ${variant === 'center' ? 'max-w-2xl mx-4 sm:mx-6 rounded-2xl border' : ''}
              ${variant === 'fullscreen' ? 'rounded-none border-none max-h-screen' : ''}
              ${containerClassName ?? ''}
            `}
            style={{
              maxHeight: maxHeight ?? defaultMaxHeight,
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
            }}
          >
            {/* Scrollable content wrapper */}
            <div
              className="overflow-y-auto"
              style={{
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {/* Drag handle — larger tap target, premium visibility */}
              {showHandle && variant === 'bottom' && (
                <div
                  data-drag-handle
                  aria-hidden="true"
                  className="sticky top-0 z-10 flex justify-center pt-3 pb-3 bg-gradient-to-b from-[#1a1714] to-transparent cursor-grab active:cursor-grabbing select-none"
                  style={{ touchAction: 'none' }}
                >
                  <div className="w-12 h-1.5 rounded-full bg-white/25 transition-colors duration-200 hover:bg-white/40" />
                </div>
              )}

              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default BottomSheet;
