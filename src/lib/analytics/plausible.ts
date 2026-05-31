import type { AnalyticsAdapter } from "../../types/analytics";
import { scrubAnalyticsProps } from "./scrub";

declare global {
  interface Window {
    plausible?: PlausibleFunction & { q?: unknown[] };
  }
}

type PlausibleFunction = (
  event: string,
  options?: { u?: string; props?: Record<string, unknown>; callback?: () => void }
) => void;

/**
 * Plausible Analytics adapter.
 *
 * Plausible's tracker is a tiny `<script>` that exposes
 * `window.plausible(eventName, options)`. We use the
 * `plausible.tagged-events.js` build because it lets us attach custom
 * properties — the default `script.js` only counts pageviews.
 *
 * The script ships from Plausible's CDN (or your self-hosted host).
 * Ad-blockers commonly block the default `/js/script.js` path; for a
 * production deployment, document a proxy through your own domain
 * (e.g. `/p/script.js` → `plausible.io/js/script.js`) — see
 * `ANALYTICS.md` for the recipe.
 */
export class PlausibleAdapter implements AnalyticsAdapter {
  private optOut = false;
  private booted = false;

  constructor(
    private readonly domain: string,
    private readonly apiHost: string = "https://plausible.io"
  ) {}

  init(): void {
    if (this.booted || this.optOut || import.meta.env.DEV) return;
    if (!this.domain) return;

    // Standard Plausible queue shim — ensures calls made before the
    // script loads aren't lost.
    if (!window.plausible) {
      const queue: unknown[] = [];
      const stub = ((...args: unknown[]) => {
        (stub as { q?: unknown[] }).q ||= queue;
        queue.push(args);
      }) as PlausibleFunction & { q?: unknown[] };
      window.plausible = stub;
    }

    const script = document.createElement("script");
    script.defer = true;
    script.dataset.domain = this.domain;
    script.src = `${this.apiHost.replace(/\/+$/, "")}/js/script.tagged-events.js`;
    // Failure to load the analytics script must NEVER break the app.
    script.onerror = () => {
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) console.warn("[analytics] plausible script failed to load");
    };
    document.head.appendChild(script);

    this.booted = true;
  }

  trackPageView(path: string, properties?: Record<string, unknown>): void {
    if (this.optOut) return;
    try {
      window.plausible?.("pageview", {
        u: window.location.origin + path,
        props: scrubAnalyticsProps(properties),
      });
    } catch {
      /* never throw from analytics */
    }
  }

  trackEvent(name: string, properties?: Record<string, unknown>): void {
    if (this.optOut) return;
    try {
      window.plausible?.(name, { props: scrubAnalyticsProps(properties) });
    } catch {
      /* never throw from analytics */
    }
  }

  identify(): void {
    // Plausible is intentionally identity-free — no-op.
  }

  reset(): void {
    // Plausible holds no client-side state per visitor.
  }

  setOptOut(optOut: boolean): void {
    this.optOut = optOut;
  }
}
