import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  type PanInfo,
  type Transition,
} from "motion/react";
import { TABS_ORDER, getTabIndex, type TabId } from "./types";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { haptic } from "../hooks/useHaptic";
import { trackAchievementEvent } from "../hooks/useAchievements";

interface SwipeableScreensProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  screens: Record<TabId, ReactNode>;
}

const SWIPE_OFFSET = 80;
const SWIPE_VELOCITY = 500;

export default function SwipeableScreens({
  activeTab,
  onTabChange,
  screens,
}: SwipeableScreensProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);
  const dragControls = useDragControls();
  const reducedMotion = usePrefersReducedMotion();

  const getSpring = useCallback((): Transition => {
    return reducedMotion
      ? { duration: 0 }
      : { type: "spring", stiffness: 400, damping: 40 };
  }, [reducedMotion]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      setWidth((prev) => (prev === w ? prev : w));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!width) return;
    const target = -getTabIndex(activeTab) * width;
    const controls = animate(x, target, getSpring());
    return () => controls.stop();
  }, [activeTab, width, x, getSpring]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (!width) return;
      const currentIdx = getTabIndex(activeTab);
      let nextIdx = currentIdx;

      if (info.offset.x < -SWIPE_OFFSET || info.velocity.x < -SWIPE_VELOCITY) {
        nextIdx = Math.min(TABS_ORDER.length - 1, currentIdx + 1);
      } else if (info.offset.x > SWIPE_OFFSET || info.velocity.x > SWIPE_VELOCITY) {
        nextIdx = Math.max(0, currentIdx - 1);
      }

      if (nextIdx !== currentIdx) {
        haptic.light();
        trackAchievementEvent("swipe_tab");
        onTabChange(TABS_ORDER[nextIdx]);
      } else {
        animate(x, -currentIdx * width, getSpring());
      }
    },
    [activeTab, onTabChange, width, x, getSpring]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-scroll-x]")) return;
      if (target.closest("[data-no-swipe]")) return;
      dragControls.start(event);
    },
    [dragControls]
  );

  const dragConstraints = {
    left: -(TABS_ORDER.length - 1) * width,
    right: 0,
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className="relative h-full w-full overflow-hidden"
      style={{ touchAction: "pan-y" }}
    >
      <motion.div
        drag="x"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={dragConstraints}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{
          x,
          width: `${TABS_ORDER.length * 100}%`,
          willChange: "transform",
        }}
        className="flex h-full"
      >
        {TABS_ORDER.map((id) => (
          <div
            key={id}
            id={`tab-panel-${id}`}
            role="tabpanel"
            aria-labelledby={`tab-${id}`}
            tabIndex={id === activeTab ? 0 : -1}
            className="relative h-full shrink-0 overflow-y-auto overflow-x-hidden focus:outline-none"
            style={{ width: `${100 / TABS_ORDER.length}%` }}
            aria-hidden={id !== activeTab}
          >
            {screens[id]}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
