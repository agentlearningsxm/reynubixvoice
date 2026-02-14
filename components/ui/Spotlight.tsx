import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Spotlight: React.FC = () => {
  const [targetRect, setTargetRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handleHighlight = (event: CustomEvent) => {
      const elementId = event.detail.id;
      const element = document.getElementById(elementId);

      if (element) {
        // Scroll to element if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Calculate position
        const updateRect = () => {
          const rect = element.getBoundingClientRect();
          setTargetRect({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height
          });
        };

        updateRect();
        setActive(true);

        // Auto-hide after 4 seconds if no new highlight comes in
        const timer = setTimeout(() => {
          setActive(false);
        }, 5000);

        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('highlightElement', handleHighlight as EventListener);
    return () => window.removeEventListener('highlightElement', handleHighlight as EventListener);
  }, []);

  return (
    <AnimatePresence>
      {active && targetRect && (
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5, ease: "circOut" }}
          style={{
            position: 'absolute',
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            zIndex: 40,
            pointerEvents: 'none', // Let clicks pass through
          }}
          className="hidden md:block" // Hide on mobile to prevent layout issues
        >
          {/* The Glowing Border */}
          <div className="absolute -inset-4 border-2 border-brand-primary/50 rounded-xl shadow-[0_0_50px_rgba(99,102,241,0.3)] animate-pulse" />
          
          {/* The Corner Brackets */}
          <div className="absolute top-[-10px] left-[-10px] w-6 h-6 border-t-2 border-l-2 border-brand-primary" />
          <div className="absolute top-[-10px] right-[-10px] w-6 h-6 border-t-2 border-r-2 border-brand-primary" />
          <div className="absolute bottom-[-10px] left-[-10px] w-6 h-6 border-b-2 border-l-2 border-brand-primary" />
          <div className="absolute bottom-[-10px] right-[-10px] w-6 h-6 border-b-2 border-r-2 border-brand-primary" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Spotlight;