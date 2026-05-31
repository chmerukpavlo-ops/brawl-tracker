import { describe, expect, it } from "vitest";
import { NoopAdapter } from "./noop";

describe("NoopAdapter", () => {
  const adapter = new NoopAdapter();

  it("never throws from any method", () => {
    expect(() => adapter.init()).not.toThrow();
    expect(() => adapter.trackPageView("/foo")).not.toThrow();
    expect(() => adapter.trackEvent("bar", { x: 1 })).not.toThrow();
    expect(() => adapter.identify("anon")).not.toThrow();
    expect(() => adapter.reset()).not.toThrow();
    expect(() => adapter.setOptOut(true)).not.toThrow();
    expect(() => adapter.setOptOut(false)).not.toThrow();
  });

  it("accepts the same shapes as the real adapters (interface lock)", () => {
    // If this compiles + runs we know `NoopAdapter` is a structural
    // match for `AnalyticsAdapter` — useful as the canary that catches
    // accidental signature drift in any of the real adapters.
    adapter.trackPageView("/path", { ref: "homepage" });
    adapter.trackEvent("search_player", {
      has_result: true,
      is_demo: false,
      from_history: false,
    });
    adapter.identify("uuid", { locale: "uk" });
    expect(true).toBe(true);
  });
});
