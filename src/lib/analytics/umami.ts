import type { AnalyticsAdapter } from "../../types/analytics";
import { scrubAnalyticsProps } from "./scrub";

declare global {
  interface Window {
    umami?: {
      track: (
        nameOrCallback?: string | ((props: Record<string, unknown>) => Record<string, unknown>),
        properties?: Record<string, unknown>
      ) => Promise<unknown>;
      identify?: (id: string, traits?: Record<string, unknown>) => void;
    };
  }
}

/**
 * Umami adapter.
 *
 * Umami is a self-hostable, open-source analytics service. The tracker
 * is a single `<script>` that exposes `window.umami.track`. We disable
 * its auto-tracking (`data-auto-track="false"`) so we can manually
 * attribute pageviews to our SPA tab changes — relying on `popstate`
 * misses tab switches that don't push to history.
 *
 * Self-hosting recipe: see `docker-compose.umami.yml` in `ANALYTICS.md`.
 */
export class UmamiAdapter implements AnalyticsAdapter {
  private optOut = false;
  private booted = false;

  constructor(
    private readonly websiteId: string,
    private readonly apiHost: string
  ) {}

  init(): void {
    if (this.booted || this.optOut || import.meta.env.DEV) return;
    if (!this.websiteId || !this.apiHost) return;

    const script = document.createElement("script");
    script.defer = true;
    script.dataset.websiteId = this.websiteId;
    script.dataset.autoTrack = "false";
    script.dataset.doNotTrack = "true";
    script.src = `${this.apiHost.replace(/\/+$/, "")}/script.js`;
    script.onerror = () => {
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) console.warn("[analytics] umami script failed to load");
    };
    document.head.appendChild(script);

    this.booted = true;
  }

  trackPageView(path: string, properties?: Record<string, unknown>): void {
    if (this.optOut) return;
    try {
      // Umami's track callback receives the auto-detected props and lets
      // us override `url` for SPA navigations.
      void window.umami?.track((p) => ({
        ...p,
        url: path,
        ...scrubAnalyticsProps(properties),
      }));
    } catch {
      /* swallow */
    }
  }

  trackEvent(name: string, properties?: Record<string, unknown>): void {
    if (this.optOut) return;
    try {
      void window.umami?.track(name, scrubAnalyticsProps(properties));
    } catch {
      /* swallow */
    }
  }

  identify(anonymousId: string, traits?: Record<string, unknown>): void {
    if (this.optOut) return;
    try {
      window.umami?.identify?.(anonymousId, scrubAnalyticsProps(traits));
    } catch {
      /* swallow */
    }
  }

  reset(): void {
    // Umami's tracker has no client-side identity to clear.
  }

  setOptOut(optOut: boolean): void {
    this.optOut = optOut;
  }
}
