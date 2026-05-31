import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface SwipeableStepsProps {
  currentStep: number;
  totalSteps: number;
  onNavigate: (nextStep: number) => void;
  /**
   * When false, swipe gestures are disabled (handy for steps that hold
   * a form / text input — accidental swipes are jarring there).
   */
  allowSwipe?: boolean;
  children: ReactNode;
}

const SWIPE_THRESHOLD = 60;
const SWIPE_VELOCITY = 380;

// `direction` is a custom prop passed to AnimatePresence so the same
// component can animate left/right depending on which way the user is
// moving through the flow.
const variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 280 : -280,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -280 : 280,
    opacity: 0,
  }),
};

/**
 * Wraps a single visible step in a horizontally-animated container with
 * touch-drag support. Only the active child is rendered to keep cost
 * low; siblings are mounted lazily as the user swipes to them.
 */
export default function SwipeableSteps({
  currentStep,
  totalSteps,
  onNavigate,
  allowSwipe = true,
  children,
}: SwipeableStepsProps) {
  const reduceMotion = usePrefersReducedMotion();
  const prevStepRef = useRef(currentStep);
  const direction = useMemo(() => {
    const dir = currentStep - prevStepRef.current;
    return dir === 0 ? 1 : Math.sign(dir);
  }, [currentStep]);

  useEffect(() => {
    prevStepRef.current = currentStep;
  }, [currentStep]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!allowSwipe) return;
    const distance = info.offset.x;
    const velocity = info.velocity.x;
    const goNext = distance < -SWIPE_THRESHOLD || velocity < -SWIPE_VELOCITY;
    const goPrev = distance > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY;
    if (goNext && currentStep < totalSteps - 1) {
      onNavigate(currentStep + 1);
    } else if (goPrev && currentStep > 0) {
      onNavigate(currentStep - 1);
    }
  };

  const childArray = Array.isArray(children) ? children : [children];
  const activeChild = childArray[currentStep] ?? childArray[0];

  return (
    <div className="relative flex-1 overflow-hidden">
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={reduceMotion ? undefined : variants}
          initial={reduceMotion ? { opacity: 0 } : "enter"}
          animate={reduceMotion ? { opacity: 1 } : "center"}
          exit={reduceMotion ? { opacity: 0 } : "exit"}
          transition={
            reduceMotion
              ? { duration: 0.15 }
              : { type: "spring", stiffness: 320, damping: 32 }
          }
          drag={allowSwipe && !reduceMotion ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 flex touch-pan-y flex-col overflow-y-auto overscroll-contain px-6 pb-32 pt-2"
        >
          {activeChild}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
