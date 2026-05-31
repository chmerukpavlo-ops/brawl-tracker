import { useId } from "react";

/**
 * Tailwind class string for "visually hidden, but available to
 * assistive tech". Equivalent to the canonical `.sr-only` recipe.
 *
 * Why a constant instead of a CSS class? Tailwind 4's JIT only
 * generates classes that appear as string literals in source — a
 * constant referenced everywhere keeps the generated CSS small and
 * makes the intent searchable.
 *
 * Usage:
 *   ```
 *   <span className={srOnly}>5 unread notifications</span>
 *   ```
 */
export const srOnly =
  "absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)] [clip-path:inset(50%)]";

/**
 * Stable, unique-per-instance ID for ARIA wiring (`aria-labelledby`,
 * `aria-describedby`). Thin wrapper around React's `useId` so we have
 * a single import path inside `utils/a11y.ts` and consumers don't
 * have to remember which library it came from.
 */
export function useA11yId(prefix: string = "a11y"): string {
  const id = useId();
  return `${prefix}-${id.replace(/:/g, "-")}`;
}

/**
 * Polite live-region announcer.
 *
 * The two regions (`#a11y-live-polite`, `#a11y-live-assertive`) are
 * mounted once at the App root by `<LiveRegions />`. To trigger an
 * announcement we briefly clear the region's text and then write the
 * new message — without the clear, screen readers swallow updates
 * that share the previous message's text or arrive in quick
 * succession.
 *
 * Use `priority: "polite"` for non-urgent updates ("Profile saved",
 * "Search results loaded") so the SR finishes whatever it was reading
 * first. Use `"assertive"` only for things the user must be
 * interrupted for ("Connection lost", "Save failed") — overuse makes
 * the SR experience hostile.
 */
export type AnnouncePriority = "polite" | "assertive";

export function announce(
  message: string,
  priority: AnnouncePriority = "polite"
): void {
  if (typeof document === "undefined") return;
  const region = document.getElementById(`a11y-live-${priority}`);
  if (!region) return;

  // The two-step clear-then-write ensures repeated identical messages
  // (e.g. "Saved" tapped twice in a row) re-trigger the announcement.
  region.textContent = "";
  // `requestAnimationFrame` is enough for VoiceOver / NVDA to register
  // the change; setTimeout(0) sometimes lands inside the same paint.
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  } else {
    setTimeout(() => {
      region.textContent = message;
    }, 0);
  }
}

/**
 * Best-effort detection of whether a screen reader is active. Browsers
 * deliberately don't expose this directly (privacy / fingerprinting),
 * so we fall back to UA hints. Reliable enough to *enable* extra
 * affordances; never use it to *remove* features.
 */
export function isScreenReaderLikely(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // VoiceOver on iOS leaves no UA fingerprint — but the
  // `navigator.maxTouchPoints` heuristic + Safari is a weak signal.
  // We just check for the explicit assistive-tech UA strings.
  return /NVDA|JAWS|VoiceOver|TalkBack/i.test(ua);
}

/**
 * Minimum interactive target size (CSS pixels). WCAG 2.2 AA mandates
 * 24×24 for non-essential elements; AAA recommends 44×44. We aim for
 * 44 across the app — Apple HIG and Material both agree, so the user
 * also gets a more pleasant pointer experience.
 */
export const MIN_TOUCH_TARGET_PX = 44;

/**
 * Tailwind classes that bring an element up to the touch-target
 * minimum without changing its visual size. Use on icon-only buttons
 * (close, share, expand) where the visible artwork is < 44px.
 */
export const touchTarget =
  "before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']";
