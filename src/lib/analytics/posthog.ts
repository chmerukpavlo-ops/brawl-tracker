import type { AnalyticsAdapter } from "../../types/analytics";
import { scrubAnalyticsProps } from "./scrub";

/**
 * PostHog adapter implemented against PostHog's public `/capture/`
 * endpoint instead of the official `posthog-js` SDK.
 *
 * Why no SDK? `posthog-js` is ~30 KB gzipped and brings autocapture,
 * session replay, surveys, and a half-dozen other features we
 * deliberately don't want — they conflict with our privacy posture.
 * Speaking HTTP keeps the adapter under 2 KB and behaves identically
 * for the manual events we care about.
 *
 * Trade-offs we accept:
 *   - No `$session_id` clustering. Events from the same anonymous id
 *     are still grouped per-person; sessions are inferred at query time.
 *   - No offline buffering. If `navigator.sendBeacon` is unavailable
 *     and the network is down, the event is dropped — analytics MUST
 *     never block the user.
 *   - No feature flags / surveys. They need the SDK; out of scope.
 *
 * Reference: https://posthog.com/docs/api/capture
 */
export class PostHogAdapter implements AnalyticsAdapter {
  private optOut = false;
  private distinctId: string | null = null;
  private readonly endpoint: string;

  constructor(
    private readonly apiKey: string,
    apiHost: string = "https://us.i.posthog.com"
  ) {
    this.endpoint = `${apiHost.replace(/\/+$/, "")}/capture/`;
  }

  init(): void {
    // Nothing to load — pure HTTP. Honor browser DNT signal here so the
    // adapter behaves like a "real" SDK from the user's perspective.
    if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") {
      this.optOut = true;
    }
  }

  trackPageView(path: string, properties?: Record<string, unknown>): void {
    if (this.optOut || !this.apiKey) return;
    void this.send("$pageview", {
      $current_url: typeof window !== "undefined" ? window.location.origin + path : path,
      ...scrubAnalyticsProps(properties),
    });
  }

  trackEvent(name: string, properties?: Record<string, unknown>): void {
    if (this.optOut || !this.apiKey) return;
    void this.send(name, scrubAnalyticsProps(properties));
  }

  identify(anonymousId: string, traits?: Record<string, unknown>): void {
    if (this.optOut || !this.apiKey) return;
    this.distinctId = anonymousId;
    // PostHog's documented way to set person properties is the
    // `$identify` event with a `$set` property.
    void this.send("$identify", {
      $set: scrubAnalyticsProps(traits),
    });
  }

  reset(): void {
    this.distinctId = null;
  }

  setOptOut(optOut: boolean): void {
    this.optOut = optOut;
  }

  private async send(event: string, properties: Record<string, unknown>): Promise<void> {
    if (typeof fetch !== "function") return;

    const payload = {
      api_key: this.apiKey,
      event,
      // PostHog requires a `distinct_id`. Until `identify()` runs we
      // emit under the literal string `anonymous` so events don't get
      // dropped on the server side; once identified, the adapter
      // switches to the device-local UUID.
      distinct_id: this.distinctId ?? "anonymous",
      properties: {
        ...properties,
        // Helps split mobile / desktop in PostHog dashboards without
        // any IP-derived geo (which we explicitly don't want).
        $lib: "brawl-tracker-http",
      },
      timestamp: new Date().toISOString(),
    };

    try {
      // Prefer `sendBeacon` so an in-flight tracking request doesn't
      // get cancelled when the user navigates away. Fall back to
      // `fetch({ keepalive })` which has the same property.
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        const ok = navigator.sendBeacon(this.endpoint, blob);
        if (ok) return;
      }

      await fetch(this.endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        // Privacy: don't ship cookies / auth headers.
        credentials: "omit",
      });
    } catch {
      // Analytics MUST be fire-and-forget — never throw, never log a
      // network error to Sentry (would re-trigger the same flow).
    }
  }
}
