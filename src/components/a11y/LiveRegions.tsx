import { srOnly } from "../../utils/a11y";

/**
 * Two persistent ARIA live regions mounted once at the App root.
 *
 * The `announce()` utility in `src/utils/a11y.ts` writes into these
 * regions. They MUST stay in the DOM for the lifetime of the app —
 * dynamically creating a region per announcement misses the
 * `aria-live` setup window in most screen readers.
 *
 * Two priorities:
 *
 *   - `polite`   — non-urgent confirmations ("Profile loaded",
 *                  "Settings saved"). The SR finishes whatever it
 *                  was reading first.
 *   - `assertive` — interruptive errors ("Connection lost", "Save
 *                  failed"). The SR stops mid-sentence to read this.
 *                  Use sparingly; overuse is hostile.
 */
export default function LiveRegions() {
  return (
    <>
      <div
        id="a11y-live-polite"
        aria-live="polite"
        aria-atomic="true"
        role="status"
        className={srOnly}
      />
      <div
        id="a11y-live-assertive"
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        className={srOnly}
      />
    </>
  );
}
