import type { ReactNode } from "react";
import FocusTrapImpl from "focus-trap-react";

interface AccessibleFocusTrapProps {
  /** Whether the trap is engaged. */
  active: boolean;
  /** Wrapped content — must contain at least one focusable element. */
  children: ReactNode;
  /**
   * Selector or element to focus on activation. Defaults to the
   * first focusable descendant via `focus-trap`'s built-in heuristics.
   */
  initialFocus?: string | HTMLElement | (() => HTMLElement | null);
  /**
   * Disable the trap's automatic focus restoration — useful when the
   * caller (e.g. our `useFocusReturn` hook) is handling restoration
   * itself, to avoid double-focus jumps.
   */
  returnFocus?: boolean;
  /** Called when the user presses ESC inside the trap. */
  onEscape?: () => void;
}

/**
 * Thin wrapper around `focus-trap-react` that defaults to the
 * settings we want for every modal in the app:
 *
 *   - `clickOutsideDeactivates: true` — backdrop clicks dismiss the
 *     trap (matches what BottomSheet does anyway).
 *   - `escapeDeactivates: true` — ESC dismisses; the caller still
 *     gets a chance to do cleanup via the `onEscape` callback.
 *   - `allowOutsideClick: true` — the trap doesn't `preventDefault`
 *     on outside pointer events, so taps still scroll the underlying
 *     content (we lock body scroll separately).
 *
 * Importing the underlying library directly works too, but every
 * additional callsite means another opportunity to mis-configure
 * trap behaviour. Use this wrapper.
 */
export default function FocusTrap({
  active,
  children,
  initialFocus,
  returnFocus = true,
  onEscape,
}: AccessibleFocusTrapProps) {
  return (
    <FocusTrapImpl
      active={active}
      focusTrapOptions={{
        initialFocus,
        returnFocusOnDeactivate: returnFocus,
        escapeDeactivates: true,
        clickOutsideDeactivates: true,
        allowOutsideClick: true,
        // We render dialogs inside portals; `focus-trap` queries the
        // DOM for tabbables, so portal children are already covered.
        fallbackFocus: () => {
          // Last-ditch fallback if the dialog has no tabbable
          // children yet (e.g. async content). Keep focus on the
          // dialog itself rather than letting the trap throw.
          return document.querySelector<HTMLElement>("[role=dialog]") ??
            document.body;
        },
        onDeactivate: onEscape,
      }}
    >
      {/* `focus-trap-react` requires its child to be a single element
          that forwards a ref, but we don't want to enforce that on
          every caller. Wrap in a fragment-equivalent <div> with
          display:contents so styles aren't affected. */}
      <div style={{ display: "contents" }}>{children}</div>
    </FocusTrapImpl>
  );
}
