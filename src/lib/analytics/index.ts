import type {
  AnalyticsAdapter,
  AnalyticsBackend,
  AnalyticsEvent,
} from "../../types/analytics";
import { getOrCreateAnonId } from "../anonId";
import {
  getAnalyticsConsent,
  hasAnalyticsConsent,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
} from "./consent";
import { NoopAdapter } from "./noop";

/**
 * Public entry point for product analytics.
 *
 * Design goals:
 *   1. Zero cost when disabled. The default adapter is `NoopAdapter`
 *      (already in the bundle) and we only `import()` the heavy
 *      adapters when consent is granted AND a backend is configured.
 *   2. Safe to call from anywhere. If `init` hasn't run, calls land
 *      on the noop adapter and silently disappear.
 *   3. Privacy by default. Consent is opt-in (no decision == no
 *      events). Toggling consent off shuts the adapter down without
 *      a reload.
 */

let adapter: AnalyticsAdapter = new NoopAdapter();
let initialized = false;
let identifiedId: string | null = null;

export interface InitAnalyticsOptions {
  backend: AnalyticsBackend | undefined;
  /** Identity traits sent with `identify` once consent is granted. */
  traits?: Record<string, unknown>;
}

export async function initAnalytics(opts: InitAnalyticsOptions): Promise<void> {
  initialized = true;

  // Hot-swap the adapter whenever consent changes — flipping the
  // toggle in Settings does NOT require a reload.
  subscribeAnalyticsConsent(async (next) => {
    if (next === "granted") {
      await loadAdapter(opts);
    } else {
      await unloadAdapter();
    }
  });

  if (hasAnalyticsConsent()) {
    await loadAdapter(opts);
  }
}

async function loadAdapter(opts: InitAnalyticsOptions): Promise<void> {
  const backend = opts.backend ?? "noop";

  // Each non-noop adapter is dynamically imported so its source code
  // ships in its own chunk. Visitors who never grant consent never pay
  // the network cost.
  let next: AnalyticsAdapter;
  switch (backend) {
    case "plausible": {
      const { PlausibleAdapter } = await import("./plausible");
      next = new PlausibleAdapter(
        import.meta.env.VITE_PLAUSIBLE_DOMAIN ?? "",
        import.meta.env.VITE_PLAUSIBLE_HOST
      );
      break;
    }
    case "umami": {
      const { UmamiAdapter } = await import("./umami");
      next = new UmamiAdapter(
        import.meta.env.VITE_UMAMI_WEBSITE_ID ?? "",
        import.meta.env.VITE_UMAMI_HOST ?? ""
      );
      break;
    }
    case "posthog": {
      const { PostHogAdapter } = await import("./posthog");
      next = new PostHogAdapter(
        import.meta.env.VITE_POSTHOG_KEY ?? "",
        import.meta.env.VITE_POSTHOG_HOST
      );
      break;
    }
    default:
      next = new NoopAdapter();
  }

  try {
    await next.init();
  } catch {
    // If a backend's init throws (network, blocked script…) fall back
    // to noop so the app keeps working.
    next = new NoopAdapter();
  }

  adapter = next;

  // Re-attach identity. The id is generated locally on first use and
  // is not derived from any account or game data — see anonId.ts.
  identifiedId = getOrCreateAnonId();
  try {
    adapter.identify(identifiedId, opts.traits);
  } catch {
    /* swallow */
  }
}

async function unloadAdapter(): Promise<void> {
  try {
    adapter.setOptOut(true);
    adapter.reset();
  } catch {
    /* swallow */
  }
  adapter = new NoopAdapter();
  identifiedId = null;
}

/**
 * Emit a virtual page view. The path should mirror what the user sees
 * in the URL, e.g. `/tabs/stats`.
 */
export function trackPageView(
  path: string,
  properties?: Record<string, unknown>
): void {
  try {
    adapter.trackPageView(path, properties);
  } catch {
    /* never throw */
  }
}

/**
 * Emit a typed analytics event. The discriminated union in
 * `src/types/analytics.ts` is the contract — adding a new event there
 * is what unlocks calling it here.
 */
export function track<E extends AnalyticsEvent>(event: E): void {
  try {
    adapter.trackEvent(event.name, event.properties);
  } catch {
    /* never throw */
  }
}

/**
 * Toggle consent at runtime (e.g. from Settings). The adapter is
 * loaded / unloaded as a side-effect via the consent subscriber set up
 * in `initAnalytics`.
 */
export function setAnalyticsOptOut(optOut: boolean): void {
  setAnalyticsConsent(optOut ? "denied" : "granted");
}

export {
  getAnalyticsConsent,
  hasAnalyticsConsent,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
} from "./consent";

/** Test-only: read the current adapter (e.g. to spy on calls). */
export function _getAdapterForTesting(): AnalyticsAdapter {
  return adapter;
}

/** Test-only: reset module state between tests. */
export function _resetForTesting(): void {
  adapter = new NoopAdapter();
  initialized = false;
  identifiedId = null;
}

export const __isInitialized = () => initialized;
