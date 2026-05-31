import { useEffect, useRef } from "react";

/**
 * Saves the currently-focused element when `active` flips to `true`,
 * and restores focus to it when `active` flips back to `false`. Use
 * inside any modal / sheet / overlay so the user's keyboard context
 * isn't lost when the dialog closes.
 *
 * Why a hook and not a wrapper component? The capture must happen
 * synchronously *before* the dialog mounts (otherwise it's already
 * stolen focus). A hook called at the parent level gets that timing
 * right.
 */
export function useFocusReturn(active: boolean): void {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (active) {
      const el =
        typeof document !== "undefined"
          ? (document.activeElement as HTMLElement | null)
          : null;
      previouslyFocused.current = el && el !== document.body ? el : null;
      return;
    }

    // `active` is false → restore. The dialog has unmounted by now,
    // so the previously-focused element is back in the layout.
    const target = previouslyFocused.current;
    previouslyFocused.current = null;
    if (!target) return;
    // If the element is no longer in the DOM (rare — happens when the
    // dialog navigated the user elsewhere) fall back to <body>.
    if (typeof document !== "undefined" && !document.contains(target)) {
      return;
    }
    // Defer one frame so we don't fight motion's exit animation for
    // focus on the unmounting dialog.
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => target.focus({ preventScroll: true }));
    } else {
      target.focus({ preventScroll: true });
    }
  }, [active]);
}
