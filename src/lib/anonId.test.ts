import { describe, it, expect } from "vitest";
import { getOrCreateAnonId } from "./anonId";

describe("getOrCreateAnonId", () => {
  it("returns a UUID-shaped string on first call", () => {
    const id = getOrCreateAnonId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("returns the same id on subsequent calls", () => {
    const a = getOrCreateAnonId();
    const b = getOrCreateAnonId();
    expect(a).toBe(b);
  });

  it("persists the id in localStorage", () => {
    const id = getOrCreateAnonId();
    expect(localStorage.getItem("brawl_anon_id")).toBe(id);
  });

  it("re-uses existing storage value if present", () => {
    localStorage.setItem("brawl_anon_id", "preset-1234567890");
    expect(getOrCreateAnonId()).toBe("preset-1234567890");
  });

  it("regenerates if stored value is too short", () => {
    localStorage.setItem("brawl_anon_id", "abc");
    const id = getOrCreateAnonId();
    expect(id).not.toBe("abc");
    expect(id.length).toBeGreaterThanOrEqual(8);
  });
});
