import { describe, it, expect } from "vitest";
import {
  readJson,
  writeJson,
  remove,
  wipeAllAppData,
  USER_DATA_KEYS,
  PREFERENCE_KEYS,
  estimateBackupSize,
} from "./storage";

describe("readJson / writeJson", () => {
  it("round-trips an object via JSON", () => {
    writeJson("brawl_test_obj", { a: 1, b: ["x"] });
    expect(readJson("brawl_test_obj")).toEqual({ a: 1, b: ["x"] });
  });

  it("stores plain strings verbatim (no double-encoding)", () => {
    writeJson("haptic_enabled", "true");
    expect(localStorage.getItem("haptic_enabled")).toBe("true");
    // Reading back is best-effort: a bare "true" is valid JSON so we
    // get the boolean; that matches existing hook behavior.
    expect(readJson("haptic_enabled")).toBe(true);
  });

  it("returns undefined for missing keys", () => {
    expect(readJson("does-not-exist")).toBeUndefined();
  });

  it("falls back to raw string when the stored value isn't valid JSON", () => {
    // Bypass writeJson to plant a non-JSON value (as legacy code might).
    localStorage.setItem("brawl_legacy", "not{json");
    expect(readJson("brawl_legacy")).toBe("not{json");
  });

  it("`remove` deletes the key", () => {
    writeJson("brawl_removable", { x: 1 });
    remove("brawl_removable");
    expect(localStorage.getItem("brawl_removable")).toBeNull();
  });
});

describe("wipeAllAppData", () => {
  it("removes every backup-tracked key and cache prefix but leaves foreign keys alone", () => {
    writeJson(USER_DATA_KEYS.myPlayer, { tag: "#A", name: "X" });
    writeJson(USER_DATA_KEYS.pinnedPlayers, [{ tag: "#A" }]);
    writeJson(PREFERENCE_KEYS.locale, "uk");
    writeJson(PREFERENCE_KEYS.haptic, "true");
    localStorage.setItem("brawl_player_cache_TEST", "{}");
    localStorage.setItem("third_party_setting", "keep me");

    const removed = wipeAllAppData();

    expect(localStorage.getItem(USER_DATA_KEYS.myPlayer)).toBeNull();
    expect(localStorage.getItem(USER_DATA_KEYS.pinnedPlayers)).toBeNull();
    expect(localStorage.getItem(PREFERENCE_KEYS.locale)).toBeNull();
    expect(localStorage.getItem("brawl_player_cache_TEST")).toBeNull();
    expect(localStorage.getItem("third_party_setting")).toBe("keep me");
    expect(removed.length).toBeGreaterThanOrEqual(5);
  });
});

describe("estimateBackupSize", () => {
  it("returns 0 when nothing is stored", () => {
    expect(estimateBackupSize()).toBe(0);
  });

  it("grows monotonically as more data is stored", () => {
    const before = estimateBackupSize();
    writeJson(USER_DATA_KEYS.myPlayer, "#TAG");
    writeJson(USER_DATA_KEYS.pinnedPlayers, [{ tag: "#A" }, { tag: "#B" }]);
    expect(estimateBackupSize()).toBeGreaterThan(before);
  });
});
