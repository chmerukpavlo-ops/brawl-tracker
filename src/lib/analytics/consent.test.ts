import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAnalyticsConsent,
  hasAnalyticsConsent,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
} from "./consent";

describe("analytics consent storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns null when no decision has been made yet", () => {
    expect(getAnalyticsConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("persists the consent value", () => {
    setAnalyticsConsent("granted");
    expect(getAnalyticsConsent()).toBe("granted");
    expect(hasAnalyticsConsent()).toBe(true);
    expect(localStorage.getItem("brawl_analytics_consent")).toBe("granted");
  });

  it("clears storage when set to null", () => {
    setAnalyticsConsent("granted");
    setAnalyticsConsent(null);
    expect(localStorage.getItem("brawl_analytics_consent")).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("notifies subscribers on every change", () => {
    const log: Array<string | null> = [];
    const unsub = subscribeAnalyticsConsent((next) => log.push(next));

    setAnalyticsConsent("granted");
    setAnalyticsConsent("denied");
    setAnalyticsConsent(null);

    expect(log).toEqual(["granted", "denied", null]);
    unsub();
  });

  it("stops notifying after unsubscribe", () => {
    const log: Array<string | null> = [];
    const unsub = subscribeAnalyticsConsent((next) => log.push(next));
    unsub();
    setAnalyticsConsent("granted");
    expect(log).toEqual([]);
  });

  it("treats unrelated localStorage values as 'no decision'", () => {
    localStorage.setItem("brawl_analytics_consent", "yes-please");
    expect(getAnalyticsConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });
});
