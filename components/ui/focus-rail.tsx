import * as React from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type FocusRailItem = {
  id: string | number;
  title: string;
  description?: string;
  imageSrc: string;
  href?: string;
  meta?: string;
};

interface FocusRailProps {
  items: FocusRailItem[];
  initialIndex?: number;
  loop?: boolean;
  autoPlay?: boolean;
  interval?: number;
  className?: string;
  renderActions?: (activeItem: FocusRailItem) => React.ReactNode;
  onItemDoubleClick?: (item: FocusRailItem) => void;
}

function wrap(min: number, max: number, v: number) {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
}

const BASE_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
};

const TAP_SPRING = {
  type: "spring",
  stiffness: 450,
  damping: 18,
  mass: 1,
};

export function FocusRail({
  items,
  initialIndex = 0,
  loop = true,
  autoPlay = false,
  interval = 4000,
  className,
  renderActions,
  onItemDoubleClick,
}: FocusRailProps) {
  const [active, setActive] = React.useState(initialIndex);
  const [isHovering, setIsHovering] = React.useState(false);
  const lastWheelTime = React.useRef<number>(0);

  const count = items.length;
  if (count === 0) return null;

  const activeIndex = wrap(0, count, active);
  const activeItem = items[activeIndex];

  const handlePrev = React.useCallback(() => {
    if (!loop && activeIndex === 0) return;
    setActive((p) => p - 1);
  }, [loop, activeIndex]);

  const handleNext = React.useCallback(() => {
    if (!loop && activeIndex === count - 1) return;
    setActive((p) => p + 1);
  }, [loop, activeIndex, count]);

  const onWheel = React.useCallback(
    (e: React.WheelEvent) => {
      const now = Date.now();
      if (now - lastWheelTime.current < 400) return;

      const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const delta = isHorizontal ? e.deltaX : e.deltaY;

      if (Math.abs(delta) > 20) {
        if (delta > 0) {
          handleNext();
        } else {
          handlePrev();
        }
        lastWheelTime.current = now;
      }
    },
    [handleNext, handlePrev]
  );

  React.useEffect(() => {
    if (!autoPlay || isHovering) return;
    const timer = setInterval(() => handleNext(), interval);
    return () => clearInterval(timer);
  }, [autoPlay, isHovering, handleNext, interval]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrev();
    if (e.key === "ArrowRight") handleNext();
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

  const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, { offset, velocity }: PanInfo) => {
    const swipe = swipePower(offset.x, velocity.x);

    if (swipe < -swipeConfidenceThreshold) {
      handleNext();
    } else if (swipe > swipeConfidenceThreshold) {
      handlePrev();
    }
  };

  const visibleIndices = [-2, -1, 0, 1, 2] as const;

  return (
    <div
      className={cn(
        "group relative flex h-[620px] w-full select-none flex-col overflow-hidden overflow-x-hidden rounded-3xl border border-border bg-bg-card text-text-primary outline-none",
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`bg-${activeItem.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img
              src={activeItem.imageSrc}
              alt=""
              className="h-full w-full object-cover blur-3xl saturate-150"
            />
            <div className="focus-rail-vignette absolute inset-0" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 md:px-8">
        <motion.div
          className="relative mx-auto flex h-[340px] w-full max-w-7xl cursor-grab items-center justify-center perspective-[1200px] active:cursor-grabbing md:h-[360px]"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={onDragEnd}
        >
          {visibleIndices.map((offset) => {
            const absIndex = active + offset;
            const index = wrap(0, count, absIndex);
            const item = items[index];

            if (!loop && (absIndex < 0 || absIndex >= count)) return null;

            const isCenter = offset === 0;
            const dist = Math.abs(offset);

            const xOffset = offset * 520;
            const zOffset = -dist * 180;
            const scale = isCenter ? 1 : 0.85;
            const rotateY = offset * -20;

            const opacity = isCenter ? 1 : Math.max(0.1, 1 - dist * 0.5);
            const blur = isCenter ? 0 : dist * 6;
            const brightness = isCenter ? 1 : 0.7;

            return (
              <motion.div
                key={absIndex}
                className={cn(
                  "absolute aspect-video w-[280px] rounded-2xl border border-border bg-bg-main shadow-2xl transition-shadow duration-300 sm:w-[360px] md:w-[500px]",
                  isCenter ? "z-20" : "z-10"
                )}
                initial={false}
                animate={{
                  x: xOffset,
                  z: zOffset,
                  scale,
                  rotateY,
                  opacity,
                  filter: `blur(${blur}px) brightness(${brightness})`,
                }}
                transition={(value: string) => (value === "scale" ? TAP_SPRING : BASE_SPRING)}
                style={{
                  transformStyle: "preserve-3d",
                }}
                onClick={() => {
                  if (offset !== 0) setActive((p) => p + offset);
                }}
                onDoubleClick={() => {
                  if (offset === 0) onItemDoubleClick?.(activeItem);
                }}
              >
                <img
                  src={item.imageSrc}
                  alt={item.title}
                  className="h-full w-full rounded-2xl object-cover pointer-events-none"
                />

                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                <div className="absolute inset-0 rounded-2xl bg-black/15 pointer-events-none mix-blend-multiply" />
              </motion.div>
            );
          })}
        </motion.div>

        <div className="pointer-events-auto mx-auto mt-10 flex w-full max-w-5xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex h-32 flex-1 flex-col items-center justify-center text-center md:items-start md:text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.id}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3 }}
                className="space-y-2"
              >
                {activeItem.meta && (
                  <span className="text-xs font-medium uppercase tracking-wider text-brand-primary">
                    {activeItem.meta}
                  </span>
                )}
                <h2 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
                  {activeItem.title}
                </h2>
                {activeItem.description && (
                  <p className="max-w-xl text-sm text-text-secondary md:text-base">{activeItem.description}</p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 rounded-full bg-bg-glass p-1 ring-1 ring-border backdrop-blur-md">
              <button
                onClick={handlePrev}
                className="rounded-full p-3 text-text-secondary transition hover:bg-brand-subtle hover:text-text-primary active:scale-95"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="min-w-[56px] text-center text-xs font-mono text-text-secondary">
                {activeIndex + 1} / {count}
              </span>
              <button
                onClick={handleNext}
                className="rounded-full p-3 text-text-secondary transition hover:bg-brand-subtle hover:text-text-primary active:scale-95"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {renderActions
              ? renderActions(activeItem)
              : activeItem.href && (
                  <a
                    href={activeItem.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95"
                  >
                    Watch
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                )}
          </div>
        </div>
      </div>

      <style>{`
        .focus-rail-vignette {
          background: linear-gradient(to top, var(--bg-main) 0%, rgba(5, 5, 8, 0.45) 45%, transparent 100%);
        }

        .light .focus-rail-vignette {
          background: linear-gradient(to top, rgba(255, 255, 255, 0.92) 0%, rgba(248, 250, 252, 0.6) 45%, transparent 100%);
        }
      `}</style>
    </div>
  );
}
