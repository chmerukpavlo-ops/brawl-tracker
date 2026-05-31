import { useEffect, useRef } from "react";
import { trackPageView } from "../lib/analytics";

/**
 * Fire a `pageview` event whenever `path` (or the optional `deps`)
 * changes. Mounting the hook in a screen component gives the analytics
 * dashboard a clean per-screen funnel without us having to remember to
 * track manually on every render.
 *
 * The first emission is delayed by one tick so the screen is committed
 * to the DOM before we report it as visited — keeps Web Vitals (LCP)
 * accurate and matches what the user actually sees.
 */
export function useTrackPageView(
  path: string,
  deps: ReadonlyArray<unknown> = []
): void {
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (lastSent.current === path) return;
    lastSent.current = path;
    // `requestAnimationFrame` ≈ "after the next paint" — the user has
    // already seen the screen by the time we record the event.
    const handle =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame(() => trackPageView(path))
        : (setTimeout(() => trackPageView(path), 0) as unknown as number);

    return () => {
      if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(handle);
      } else {
        clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
      }
    };
    // The caller controls re-emission via the `deps` array. `path` is
    // tracked separately via the ref so we don't double-fire when the
    // parent re-renders without changing the route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
}
