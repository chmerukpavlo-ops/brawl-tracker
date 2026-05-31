import { describe, it, expect } from "vitest";
import { migrateBackup } from "./migrations";
import { BACKUP_VERSION, type BackupPayload } from "../../types/backup";

function payload(version: number, data: object = {}): BackupPayload {
  return { version, exportedAt: 1, appVersion: "1", data };
}

describe("migrateBackup", () => {
  it("is a no-op for the current version", () => {
    const p = payload(BACKUP_VERSION, { myPlayer: "#A" });
    const out = migrateBackup(p);
    expect(out.migrated).toBe(p);
    expect(out.appliedSteps).toEqual([]);
  });

  it("throws for backups newer than the app supports", () => {
    expect(() => migrateBackup(payload(BACKUP_VERSION + 1))).toThrow(
      /newer .* than this app supports/i
    );
  });

  it("throws when an older version lacks a registered migration", () => {
    // v1 is the initial schema → there's no step into v1 from v0.
    expect(() => migrateBackup(payload(0))).toThrow(/No migration registered/);
  });
});
