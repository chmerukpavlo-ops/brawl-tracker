import { describe, it, expect } from "vitest";
import { createBackup, stableStringify, defaultBackupFilename } from "./exporter";
import { sha256 } from "./crypto";
import { USER_DATA_KEYS, PREFERENCE_KEYS, writeJson } from "./storage";
import { BACKUP_VERSION } from "../../types/backup";

describe("stableStringify", () => {
  it("emits keys in sorted order regardless of insertion order", () => {
    const a = stableStringify({ b: 1, a: 2, c: 3 });
    const b = stableStringify({ c: 3, a: 2, b: 1 });
    expect(a).toBe(b);
    expect(a.indexOf('"a"')).toBeLessThan(a.indexOf('"b"'));
  });

  it("preserves array order (arrays are semantically ordered)", () => {
    const json = stableStringify({ list: [3, 1, 2] });
    expect(json).toContain("[3,1,2]");
  });

  it("handles nested structures", () => {
    const a = stableStringify({ outer: { z: 1, a: 2 } });
    const b = stableStringify({ outer: { a: 2, z: 1 } });
    expect(a).toBe(b);
  });
});

describe("createBackup", () => {
  it("snapshots every populated key from the registry", async () => {
    writeJson(USER_DATA_KEYS.myPlayer, "#ABC");
    writeJson(USER_DATA_KEYS.pinnedPlayers, [{ tag: "#A", originalName: "Alice" }]);
    writeJson(USER_DATA_KEYS.goals, [{ id: "g1", targetTrophies: 2000 }]);
    writeJson(PREFERENCE_KEYS.locale, "uk");
    writeJson(PREFERENCE_KEYS.haptic, "true");

    const backup = await createBackup();

    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.exportedAt).toBeGreaterThan(0);
    expect(backup.data.myPlayer).toBe("#ABC");
    expect(backup.data.pinnedPlayers).toEqual([
      { tag: "#A", originalName: "Alice" },
    ]);
    expect(backup.data.goals).toHaveLength(1);
    expect(backup.data.preferences?.locale).toBe("uk");
    expect(backup.data.preferences?.haptic).toBe(true);
    expect(backup.deviceInfo).toBeDefined();
  });

  it("computes a SHA-256 checksum over a deterministic data string", async () => {
    writeJson(USER_DATA_KEYS.myPlayer, "#XYZ");
    const backup = await createBackup();
    const recomputed = await sha256(stableStringify(backup.data));
    expect(backup.checksum).toBe(recomputed);
  });

  it("returns the same checksum for two backups taken from the same data", async () => {
    writeJson(USER_DATA_KEYS.myPlayer, "#STABLE");
    const a = await createBackup();
    const b = await createBackup();
    expect(a.checksum).toBe(b.checksum);
  });
});

describe("defaultBackupFilename", () => {
  it("uses .json extension by default and includes ISO date", () => {
    const name = defaultBackupFilename();
    expect(name).toMatch(/^brawl-tracker-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("switches to .enc.json when encrypted", () => {
    expect(defaultBackupFilename(true)).toMatch(/\.enc\.json$/);
  });
});
