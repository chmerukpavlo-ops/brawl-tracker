import { describe, it, expect, beforeEach } from "vitest";
import {
  getConsent,
  hasConsent,
  setConsent,
  subscribeConsent,
} from "./telemetryConsent";

beforeEach(() => {
  localStorage.clear();
});

describe("telemetryConsent", () => {
  it("returns null by default (opt-in)", () => {
    expect(getConsent()).toBeNull();
    expect(hasConsent()).toBe(false);
  });

  it("persists granted state", () => {
    setConsent("granted");
    expect(getConsent()).toBe("granted");
    expect(hasConsent()).toBe(true);
  });

  it("persists denied state without enabling capture", () => {
    setConsent("denied");
    expect(getConsent()).toBe("denied");
    expect(hasConsent()).toBe(false);
  });

  it("clears the value when set to null", () => {
    setConsent("granted");
    setConsent(null);
    expect(getConsent()).toBeNull();
  });

  it("notifies subscribers on change", () => {
    const events: (string | null)[] = [];
    const unsub = subscribeConsent((v) => events.push(v));

    setConsent("granted");
    setConsent("denied");
    setConsent(null);
    unsub();
    setConsent("granted"); // should not be received

    expect(events).toEqual(["granted", "denied", null]);
  });

  it("ignores garbage stored values", () => {
    localStorage.setItem("brawl_telemetry_consent", "perhaps");
    expect(getConsent()).toBeNull();
  });
});
