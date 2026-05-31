import { useCallback, useEffect, type KeyboardEvent, type RefObject } from "react";

export type ArrowOrientation = "horizontal" | "vertical" | "both";

interface UseArrowNavigationOptions {
  /** Which arrow keys move focus. */
  orientation?: ArrowOrientation;
  /** Wrap from last → first (and vice versa). */
  loop?: boolean;
  /** Also move focus to first item on Home and last on End. */
  homeEnd?: boolean;
  /** Item count — needed because items may render lazily. */
  count: number;
  /** Currently-focused index (controlled by the caller). */
  index: number;
  /** Called with the new index. The caller is expected to call `focus()`. */
  onIndexChange: (next: number) => void;
}

/**
 * Generic arrow-key keyboard navigation for tablists, listboxes, and
 * grids. The hook is *headless*: it only computes the next index and
 * delegates the actual focus / activation to the caller. That keeps it
 * compatible with any wrapper component (BottomTabBar, Menu, Listbox).
 *
 * Returned `onKeyDown` should be attached to the *container*, not each
 * item — that way the focus management works even when items mount /
 * unmount asynchronously.
 *
 * Reference: WAI-ARIA Authoring Practices "Tabs" pattern.
 *   https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
export function useArrowNavigation({
  orientation = "horizontal",
  loop = true,
  homeEnd = true,
  count,
  index,
  onIndexChange,
}: UseArrowNavigationOptions): {
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
} {
  const move = useCallback(
    (delta: number) => {
      if (count <= 0) return;
      let next = index + delta;
      if (loop) {
        next = (next + count) % count;
      } else {
        next = Math.max(0, Math.min(count - 1, next));
      }
      if (next !== index) onIndexChange(next);
    },
    [count, index, loop, onIndexChange]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const horiz = orientation === "horizontal" || orientation === "both";
      const vert = orientation === "vertical" || orientation === "both";

      switch (e.key) {
        case "ArrowRight":
          if (horiz) {
            e.preventDefault();
            move(+1);
          }
          break;
        case "ArrowLeft":
          if (horiz) {
            e.preventDefault();
            move(-1);
          }
          break;
        case "ArrowDown":
          if (vert) {
            e.preventDefault();
            move(+1);
          }
          break;
        case "ArrowUp":
          if (vert) {
            e.preventDefault();
            move(-1);
          }
          break;
        case "Home":
          if (homeEnd && count > 0) {
            e.preventDefault();
            if (index !== 0) onIndexChange(0);
          }
          break;
        case "End":
          if (homeEnd && count > 0) {
            e.preventDefault();
            const last = count - 1;
            if (index !== last) onIndexChange(last);
          }
          break;
      }
    },
    [count, homeEnd, index, move, onIndexChange, orientation]
  );

  return { onKeyDown };
}

/**
 * Helper that focuses the element at `index` inside a container. Pair
 * with `useArrowNavigation` when the caller wants automatic focus
 * movement (vs only updating its own state).
 *
 * The selector is `[role="tab"], [role="menuitem"], [role="option"]` —
 * matches the three common ARIA composite-widget patterns.
 */
export function useFocusOnIndex(
  containerRef: RefObject<HTMLElement | null>,
  index: number,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>(
      '[role="tab"], [role="menuitem"], [role="option"], [data-arrow-item]'
    );
    items[index]?.focus();
  }, [containerRef, enabled, index]);
}
