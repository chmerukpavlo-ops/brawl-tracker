import type { AnalyticsAdapter } from "../../types/analytics";

/**
 * No-op adapter. The default when:
 *   - No `VITE_ANALYTICS_BACKEND` is configured (zero bundle bloat).
 *   - The user has revoked consent.
 *   - We're in a test environment.
 *
 * Safe to call any method; nothing happens. In dev we forward to
 * `console.debug` so you can verify your `track()` call sites without
 * setting up a real backend.
 */
export class NoopAdapter implements AnalyticsAdapter {
  init(): void {
    // intentionally empty
  }

  trackPageView(path: string, properties?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[analytics:noop] pageview", path, properties ?? {});
    }
  }

  trackEvent(name: string, properties?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[analytics:noop] event", name, properties ?? {});
    }
  }

  identify(_anonymousId?: string, _traits?: Record<string, unknown>): void {
    // intentionally empty — noop never identifies
    void _anonymousId;
    void _traits;
  }

  reset(): void {
    // intentionally empty
  }

  setOptOut(_optOut?: boolean): void {
    // intentionally empty — there's nothing to opt out of
    void _optOut;
  }
}
