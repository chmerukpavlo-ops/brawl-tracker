import { describe, it, expect } from "vitest";
import { parseBackupFile, validateBackup, applyBackup, summarize } from "./importer";
import { createBackup, stableStringify } from "./exporter";
import { sha256, encryptPayload } from "./crypto";
import { USER_DATA_KEYS, writeJson, readJson, PREFERENCE_KEYS } from "./storage";
import { BACKUP_VERSION, type BackupPayload } from "../../types/backup";

function fileFromJson(value: unknown, name = "backup.json"): File {
  return new File([JSON.stringify(value)], name, { type: "application/json" });
}

async function validBackup(): Promise<BackupPayload> {
  writeJson(USER_DATA_KEYS.myPlayer, "#OWNER");
  writeJson(USER_DATA_KEYS.pinnedPlayers, [{ tag: "#A" }]);
  return createBackup();
}

describe("validateBackup", () => {
  it("accepts a freshly-created backup", async () => {
    const payload = await validBackup();
    const result = await validateBackup(payload);
    expect(result.valid).toBe(true);
  });

  it("rejects non-objects", async () => {
    expect((await validateBackup(null)).valid).toBe(false);
    expect((await validateBackup("string")).valid).toBe(false);
  });

  it("rejects a missing version", async () => {
    const r = await validateBackup({ data: {} });
    expect(r).toMatchObject({ valid: false, reason: "missing_version" });
  });

  it("rejects a future version", async () => {
    const r = await validateBackup({
      version: BACKUP_VERSION + 1,
      exportedAt: 1,
      appVersion: "1",
      data: {},
    });
    expect(r).toMatchObject({ valid: false, reason: "future_version" });
  });

  it("rejects a tampered checksum", async () => {
    const payload = await validBackup();
    const tampered = { ...payload, data: { ...payload.data, myPlayer: "#HACKED" } };
    const r = await validateBackup(tampered);
    expect(r).toMatchObject({ valid: false, reason: "checksum_mismatch" });
  });

  it("accepts a backup with no checksum (older exports)", async () => {
    const r = await validateBackup({
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      appVersion: "1.0.0",
      data: { myPlayer: "#A" },
    });
    expect(r.valid).toBe(true);
  });
});

describe("parseBackupFile", () => {
  it("returns valid=true for a well-formed file", async () => {
    const payload = await validBackup();
    const r = await parseBackupFile(fileFromJson(payload));
    expect(r.valid).toBe(true);
  });

  it("rejects invalid JSON", async () => {
    const file = new File(["{not json"], "x.json", { type: "application/json" });
    const r = await parseBackupFile(file);
    expect(r).toMatchObject({ valid: false, reason: "invalid_json" });
  });

  it("flags an encrypted file when no password is supplied", async () => {
    const payload = await validBackup();
    const encrypted = await encryptPayload(JSON.stringify(payload), "pw");
    const envelope = { format: "brawl.backup.v1.enc", payload: encrypted };
    const r = await parseBackupFile(fileFromJson(envelope));
    expect(r).toMatchObject({ valid: false, reason: "password_required" });
  });

  it("decrypts an envelope with the correct password", async () => {
    const payload = await validBackup();
    const encrypted = await encryptPayload(JSON.stringify(payload), "pw");
    const envelope = { format: "brawl.backup.v1.enc", payload: encrypted };
    const r = await parseBackupFile(fileFromJson(envelope), "pw");
    expect(r.valid).toBe(true);
  });

  it("rejects an envelope with the wrong password", async () => {
    const payload = await validBackup();
    const encrypted = await encryptPayload(JSON.stringify(payload), "pw");
    const envelope = { format: "brawl.backup.v1.enc", payload: encrypted };
    const r = await parseBackupFile(fileFromJson(envelope), "nope");
    expect(r).toMatchObject({ valid: false, reason: "wrong_password" });
  });
});

describe("summarize", () => {
  it("counts arrays and marks them present", async () => {
    const payload: BackupPayload = {
      version: BACKUP_VERSION,
      exportedAt: 1,
      appVersion: "1",
      data: {
        myPlayer: "#A",
        pinnedPlayers: [{ tag: "#A" }, { tag: "#B" }],
        goals: [{ id: "g1" }],
      },
    };
    payload.checksum = await sha256(stableStringify(payload.data));
    const summary = summarize(payload);
    expect(summary.counts.myPlayer).toBe(1);
    expect(summary.counts.pinnedPlayers).toBe(2);
    expect(summary.counts.goals).toBe(1);
    expect(summary.present).toContain("pinnedPlayers");
    expect(summary.present).not.toContain("aiHistory");
  });
});

describe("applyBackup — replace strategy", () => {
  it("overwrites existing pinned players entirely", () => {
    writeJson(USER_DATA_KEYS.pinnedPlayers, [{ tag: "#OLD" }]);
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: 1,
      appVersion: "1",
      data: { pinnedPlayers: [{ tag: "#NEW" }] },
    } as BackupPayload;
    applyBackup(payload, "replace");
    expect(readJson(USER_DATA_KEYS.pinnedPlayers)).toEqual([{ tag: "#NEW" }]);
  });
});

describe("applyBackup — merge strategy", () => {
  it("unions arrays by id, preserving the local edits", () => {
    writeJson(USER_DATA_KEYS.pinnedPlayers, [
      { tag: "#A", originalName: "Alice (local edit)" },
    ]);
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: 1,
      appVersion: "1",
      data: {
        pinnedPlayers: [
          { tag: "#A", originalName: "Alice (incoming)" },
          { tag: "#B", originalName: "Bob" },
        ],
      },
    } as BackupPayload;
    applyBackup(payload, "merge");
    const stored = readJson<{ tag: string; originalName: string }[]>(
      USER_DATA_KEYS.pinnedPlayers
    );
    expect(stored).toHaveLength(2);
    const a = stored?.find((p) => p.tag === "#A");
    // Local entry wins on conflict in merge mode.
    expect(a?.originalName).toBe("Alice (local edit)");
  });

  it("preserves existing primitive values when merging", () => {
    writeJson(PREFERENCE_KEYS.locale, "uk");
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: 1,
      appVersion: "1",
      data: { preferences: { locale: "en" } },
    } as BackupPayload;
    applyBackup(payload, "merge");
    expect(readJson(PREFERENCE_KEYS.locale)).toBe("uk");
  });

  it("writes missing keys even in merge mode", () => {
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: 1,
      appVersion: "1",
      data: { myPlayer: "#FRESH" },
    } as BackupPayload;
    applyBackup(payload, "merge");
    expect(readJson(USER_DATA_KEYS.myPlayer)).toBe("#FRESH");
  });
});

describe("applyBackup — selective strategy", () => {
  it("only writes categories chosen in `selection`", () => {
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: 1,
      appVersion: "1",
      data: {
        myPlayer: "#SHOULD_WRITE",
        pinnedPlayers: [{ tag: "#NOPE" }],
      },
    } as BackupPayload;
    applyBackup(payload, "selective", { myPlayer: true });
    expect(readJson(USER_DATA_KEYS.myPlayer)).toBe("#SHOULD_WRITE");
    expect(readJson(USER_DATA_KEYS.pinnedPlayers)).toBeUndefined();
  });
});
