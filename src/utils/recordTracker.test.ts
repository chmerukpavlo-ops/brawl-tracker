import { describe, it, expect, beforeEach } from "vitest";
import {
  clearLastNotifiedRecord,
  getLastNotifiedRecord,
  setLastNotifiedRecord,
} from "./recordTracker";

const STORAGE_KEY = "brawl_last_record_notified";

describe("recordTracker", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns 0 for an unknown tag", () => {
    expect(getLastNotifiedRecord("#PYLQ20")).toBe(0);
  });

  it("round-trips set → get", () => {
    setLastNotifiedRecord("#PYLQ20", 65000);
    expect(getLastNotifiedRecord("#PYLQ20")).toBe(65000);
  });

  it("normalises tags so #pylq20 == PYLQ20", () => {
    setLastNotifiedRecord("#pylq20", 50000);
    // No `#`, lowercased — should still resolve.
    expect(getLastNotifiedRecord("pylq20")).toBe(50000);
    expect(getLastNotifiedRecord("PYLQ20")).toBe(50000);
  });

  it("keeps multiple tags independent", () => {
    setLastNotifiedRecord("#PYLQ20", 65000);
    setLastNotifiedRecord("#2PP0LJL8", 12345);
    expect(getLastNotifiedRecord("#PYLQ20")).toBe(65000);
    expect(getLastNotifiedRecord("#2PP0LJL8")).toBe(12345);
  });

  it("survives corrupted JSON without throwing", () => {
    // Plant garbage into the slot the module reads.
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(() => getLastNotifiedRecord("#PYLQ20")).not.toThrow();
    expect(getLastNotifiedRecord("#PYLQ20")).toBe(0);
    // We should still be able to write — corrupted state shouldn't
    // permanently brick the feature.
    expect(() => setLastNotifiedRecord("#PYLQ20", 100)).not.toThrow();
    expect(getLastNotifiedRecord("#PYLQ20")).toBe(100);
  });

  it("ignores non-object payloads in storage", () => {
    localStorage.setItem(STORAGE_KEY, '"a string"');
    expect(getLastNotifiedRecord("#ANY")).toBe(0);
    localStorage.setItem(STORAGE_KEY, '["array"]');
    expect(getLastNotifiedRecord("#ANY")).toBe(0);
  });

  it("rejects non-numeric values for individual tags", () => {
    // Mixed payload — only the numeric entry should round-trip.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ PYLQ20: 65000, BAD: "oops", ZERO: 0, NEG: -5 })
    );
    expect(getLastNotifiedRecord("#PYLQ20")).toBe(65000);
    expect(getLastNotifiedRecord("#BAD")).toBe(0);
    expect(getLastNotifiedRecord("#ZERO")).toBe(0);
    expect(getLastNotifiedRecord("#NEG")).toBe(0);
  });

  it("rejects bad input on write (NaN / negative / non-finite)", () => {
    setLastNotifiedRecord("#PYLQ20", NaN);
    setLastNotifiedRecord("#PYLQ20", Number.POSITIVE_INFINITY);
    setLastNotifiedRecord("#PYLQ20", -1);
    expect(getLastNotifiedRecord("#PYLQ20")).toBe(0);
  });

  it("clearLastNotifiedRecord wipes a single tag", () => {
    setLastNotifiedRecord("#PYLQ20", 65000);
    setLastNotifiedRecord("#2PP0LJL8", 12345);
    clearLastNotifiedRecord("#PYLQ20");
    expect(getLastNotifiedRecord("#PYLQ20")).toBe(0);
    expect(getLastNotifiedRecord("#2PP0LJL8")).toBe(12345);
  });

  it("clearLastNotifiedRecord() with no arg wipes everything", () => {
    setLastNotifiedRecord("#PYLQ20", 65000);
    setLastNotifiedRecord("#2PP0LJL8", 12345);
    clearLastNotifiedRecord();
    expect(getLastNotifiedRecord("#PYLQ20")).toBe(0);
    expect(getLastNotifiedRecord("#2PP0LJL8")).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
