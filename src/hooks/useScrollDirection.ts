import { useEffect, useRef, useState } from "react";

export type ScrollDirection = "up" | "down" | "idle";

/**
 * Tracks vertical scroll direction across the document.
 *
 * Works by listening to `scroll` events in capture phase, so it picks up
 * scroll on any nested `overflow-y-auto` container (the app uses one such
 * container per swipeable screen).
 *
 * `threshold` (default 8) — minimum delta in pixels before reporting a
 * direction change, to avoid flicker on inertial scrolls.
 */
export function useScrollDirection(threshold = 8): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>("idle");
  const lastYRef = useRef<number>(0);
  const lastTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const target = event.target;
      if (!target) return;
      let scrollTop = 0;
      if (target === document || target === document.documentElement) {
        scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      } else if (target instanceof HTMLElement) {
        scrollTop = target.scrollTop;
      } else {
        return;
      }

      // Reset baseline if we switched to a different scroll container.
      if (lastTargetRef.current !== target) {
        lastTargetRef.current = target;
        lastYRef.current = scrollTop;
        return;
      }

      const delta = scrollTop - lastYRef.current;
      if (Math.abs(delta) < threshold) return;
      lastYRef.current = scrollTop;
      setDirection((prev) => {
        const next: ScrollDirection = delta > 0 ? "down" : "up";
        return prev === next ? prev : next;
      });
    };

    document.addEventListener("scroll", handler, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", handler, { capture: true });
    };
  }, [threshold]);

  return direction;
}
