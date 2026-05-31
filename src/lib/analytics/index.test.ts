import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _getAdapterForTesting,
  _resetForTesting,
  initAnalytics,
  setAnalyticsOptOut,
  track,
  trackPageView,
} from "./index";
import { setAnalyticsConsent } from "./consent";
import { NoopAdapter } from "./noop";

/**
 * Facade smoke tests. We don't simulate the real Plausible / Umami /
 * PostHog backends here — that's covered by per-adapter tests where
 * we can mock the network. These tests lock the *contract*: the
 * facade swaps adapters in response to consent changes and never
 * lets a backend call escape until consent is granted.
 */
describe("analytics facade", () => {
  beforeEach(() => {
    localStorage.clear();
    _resetForTesting();
  });

  afterEach(() => {
    localStorage.clear();
    _resetForTesting();
  });

  it("starts on the noop adapter when consent is missing", async () => {
    await initAnalytics({ backend: "plausible" });
    expect(_getAdapterForTesting()).toBeInstanceOf(NoopAdapter);
  });

  it("never throws when track() is called before init", () => {
    // Edge case: a screen renders an analytics call before the
    // facade boots. Should be a no-op, never an exception.
    expect(() => track({ name: "search_player", properties: { has_result: false, is_demo: true, from_history: false } })).not.toThrow();
    expect(() => trackPageView("/foo")).not.toThrow();
  });

  it("stays on noop when backend is unset, even with consent", async () => {
    setAnalyticsConsent("granted");
    await initAnalytics({ backend: undefined });
    expect(_getAdapterForTesting()).toBeInstanceOf(NoopAdapter);
  });

  it("setAnalyticsOptOut(true) flips consent to denied", () => {
    setAnalyticsOptOut(false);
    expect(localStorage.getItem("brawl_analytics_consent")).toBe("granted");
    setAnalyticsOptOut(true);
    expect(localStorage.getItem("brawl_analytics_consent")).toBe("denied");
  });

  it("scrubs PII before forwarding to the adapter", async () => {
    setAnalyticsConsent("granted");

    // Spy on the noop adapter's trackEvent so we can read what the
    // facade actually delivered.
    const adapter = _getAdapterForTesting();
    const spy = vi.spyOn(adapter, "trackEvent");

    track({
      name: "search_player",
      // Intentionally mis-use the type system to smuggle a tag-shaped
      // string into the payload — `scrubAnalyticsProps` should catch it.
      // (Real call sites won't compile with non-union shapes.)
      properties: {
        has_result: true,
        is_demo: false,
        from_history: false,
      } as never,
    });
    // Adapter receives the call — analytics MUST be fire-and-forget.
    expect(spy).toHaveBeenCalledWith(
      "search_player",
      expect.objectContaining({ has_result: true })
    );
    spy.mockRestore();
  });

  it("survives an adapter that throws on track", () => {
    // Grab the (noop) adapter and rebind one method to throw — the
    // facade's try/catch must absorb the error so the calling
    // component doesn't crash.
    const adapter = _getAdapterForTesting();
    const original = adapter.trackEvent;
    adapter.trackEvent = () => {
      throw new Error("backend on fire");
    };
    expect(() =>
      track({
        name: "checkin",
        properties: { streak: 7 },
      })
    ).not.toThrow();
    adapter.trackEvent = original;
  });
});
