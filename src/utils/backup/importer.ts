import {
  ALL_CATEGORIES,
  BACKUP_VERSION,
  isEncryptedEnvelope,
  type BackupCategory,
  type BackupData,
  type BackupPayload,
  type BackupSummary,
  type BackupValidationResult,
  type ImportSelection,
  type ImportStrategy,
} from "../../types/backup";
import { decryptPayload, sha256 } from "./crypto";
import { migrateBackup } from "./migrations";
import {
  PREFERENCE_KEYS,
  USER_DATA_KEYS,
  readJson,
  remove,
  writeJson,
  type PreferenceKey,
} from "./storage";
import { stableStringify } from "./exporter";

/* ──────────────────────── parsing ─────────────────────────────── */

/**
 * Reads a File, transparently handling both encrypted envelopes
 * (`brawl.backup.v1.enc`) and plain JSON payloads. Returns a typed
 * validation result so callers can render rich errors.
 */
export async function parseBackupFile(
  file: File,
  password?: string
): Promise<BackupValidationResult> {
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, reason: "file_too_large" };
  }

  let text: string;
  try {
    text = await file.text();
  } catch (e) {
    return { valid: false, reason: "read_failed", details: [String(e)] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { valid: false, reason: "invalid_json", details: [String(e)] };
  }

  // Encrypted envelope path.
  if (isEncryptedEnvelope(parsed)) {
    if (!password) {
      return { valid: false, reason: "password_required" };
    }
    try {
      const decrypted = await decryptPayload(parsed.payload, password);
      const inner = JSON.parse(decrypted);
      return validateBackup(inner);
    } catch {
      // AES-GCM throws on both tampering and wrong password — keep
      // them unified to avoid leaking which one happened.
      return { valid: false, reason: "wrong_password" };
    }
  }

  return validateBackup(parsed);
}

/**
 * Pure structural + checksum validation on an already-parsed object.
 * Runs the migration chain when the file is from an older version.
 */
export async function validateBackup(
  obj: unknown
): Promise<BackupValidationResult> {
  if (!obj || typeof obj !== "object") {
    return { valid: false, reason: "not_an_object" };
  }
  const p = obj as Partial<BackupPayload>;

  if (typeof p.version !== "number") {
    return { valid: false, reason: "missing_version" };
  }
  if (p.version > BACKUP_VERSION) {
    return {
      valid: false,
      reason: "future_version",
      details: [String(p.version)],
    };
  }
  if (!p.data || typeof p.data !== "object") {
    return { valid: false, reason: "missing_data" };
  }
  if (typeof p.exportedAt !== "number") {
    return { valid: false, reason: "missing_exported_at" };
  }
  if (typeof p.appVersion !== "string") {
    return { valid: false, reason: "missing_app_version" };
  }

  if (p.checksum) {
    const computed = await sha256(stableStringify(p.data));
    if (computed !== p.checksum) {
      return { valid: false, reason: "checksum_mismatch" };
    }
  }

  try {
    const { migrated } = migrateBackup(p as BackupPayload);
    return { valid: true, payload: migrated };
  } catch (e) {
    return {
      valid: false,
      reason: "migration_failed",
      details: [String(e instanceof Error ? e.message : e)],
    };
  }
}

/* ──────────────────────── summary ─────────────────────────────── */

/** Counts items per category so the import preview can be informative. */
export function summarize(payload: BackupPayload): BackupSummary {
  const counts: Partial<Record<BackupCategory, number>> = {};
  const present: BackupCategory[] = [];

  for (const cat of ALL_CATEGORIES) {
    const val = payload.data[cat as keyof BackupData];
    const count = countItems(val);
    if (count > 0) {
      counts[cat] = count;
      present.push(cat);
    }
  }

  return {
    exportedAt: payload.exportedAt,
    appVersion: payload.appVersion,
    version: payload.version,
    deviceInfo: payload.deviceInfo,
    counts,
    present,
  };
}

function countItems(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value === "object") {
    // For "preferences" we count populated keys; for opaque objects
    // (like dailyCheckin / onboarding) presence counts as 1.
    const entries = Object.values(value as Record<string, unknown>).filter(
      (v) => v !== undefined && v !== null
    );
    return entries.length > 0 ? 1 : 0;
  }
  return 1; // primitive payloads (e.g. myPlayer/locale string)
}

/* ──────────────────────── apply ───────────────────────────────── */

export interface ApplyBackupResult {
  applied: BackupCategory[];
  skipped: BackupCategory[];
  warnings: string[];
}

/**
 * Writes the backup's payload into localStorage. `strategy === "replace"`
 * blows away existing values; `merge` does best-effort dedupe for
 * arrays (by stable id field); `selective` honours `selection` and
 * defaults to merge semantics within selected categories.
 */
export function applyBackup(
  payload: BackupPayload,
  strategy: ImportStrategy,
  selection?: ImportSelection
): ApplyBackupResult {
  const applied: BackupCategory[] = [];
  const skipped: BackupCategory[] = [];
  const warnings: string[] = [];
  const mergeMode: "replace" | "merge" =
    strategy === "replace" ? "replace" : "merge";

  for (const cat of ALL_CATEGORIES) {
    if (strategy === "selective" && !selection?.[cat]) {
      skipped.push(cat);
      continue;
    }

    try {
      applyCategory(payload.data, cat, mergeMode);
      applied.push(cat);
    } catch (e) {
      warnings.push(`${cat}: ${e instanceof Error ? e.message : String(e)}`);
      skipped.push(cat);
    }
  }

  return { applied, skipped, warnings };
}

function applyCategory(
  data: BackupData,
  category: BackupCategory,
  mode: "replace" | "merge"
): void {
  switch (category) {
    case "myPlayer":
      writeIfPresent(USER_DATA_KEYS.myPlayer, data.myPlayer, mode);
      return;
    case "searchHistory":
      writeArrayMerged(
        USER_DATA_KEYS.searchHistory,
        data.searchHistory,
        mode,
        "tag"
      );
      return;
    case "pinnedPlayers":
      writeArrayMerged(
        USER_DATA_KEYS.pinnedPlayers,
        data.pinnedPlayers,
        mode,
        "tag"
      );
      return;
    case "pinnedGroups":
      writeArrayMerged(
        USER_DATA_KEYS.pinnedGroups,
        data.pinnedGroups,
        mode,
        "id"
      );
      return;
    case "dailyCheckin":
      writeIfPresent(USER_DATA_KEYS.dailyCheckin, data.dailyCheckin, mode);
      return;
    case "goals":
      writeArrayMerged(USER_DATA_KEYS.goals, data.goals, mode, "id");
      return;
    case "achievements":
      // Achievements is an object with `unlocked`, `progress`, `stats`,
      // `aux` — merging meaningfully here requires hook-specific logic,
      // so we fall back to "replace if incoming, leave alone if not".
      writeIfPresent(USER_DATA_KEYS.achievements, data.achievements, mode);
      return;
    case "aiHistory":
      writeArrayMerged(USER_DATA_KEYS.aiHistory, data.aiHistory, mode, "id");
      return;
    case "onboarding":
      writeIfPresent(USER_DATA_KEYS.onboarding, data.onboarding, mode);
      return;
    case "preferences":
      applyPreferences(data.preferences, mode);
      return;
  }
}

function writeIfPresent(
  key: string,
  value: unknown,
  mode: "replace" | "merge"
): void {
  if (value === undefined || value === null) return;
  if (mode === "merge") {
    const existing = readJson(key);
    if (existing !== undefined) {
      // Honour the user's local state when merging primitives/objects.
      return;
    }
  }
  writeJson(key, value);
}

function writeArrayMerged(
  key: string,
  incoming: unknown,
  mode: "replace" | "merge",
  idField: string
): void {
  if (!Array.isArray(incoming)) return;
  if (mode === "replace") {
    writeJson(key, incoming);
    return;
  }

  const current = readJson<unknown[]>(key);
  if (!Array.isArray(current) || current.length === 0) {
    writeJson(key, incoming);
    return;
  }

  // Merge by stable id — local entries win on conflict (preserves
  // user's recent edits to e.g. pinned custom names).
  const seen = new Map<unknown, unknown>();
  for (const item of incoming) {
    const id = pickId(item, idField);
    if (id !== undefined) seen.set(id, item);
  }
  for (const item of current) {
    const id = pickId(item, idField);
    if (id !== undefined) seen.set(id, item);
  }
  // If neither side carries the id field, just append (deduped via JSON).
  if (seen.size === 0) {
    const merged = dedupeByJson([...current, ...incoming]);
    writeJson(key, merged);
    return;
  }

  writeJson(key, [...seen.values()]);
}

function pickId(item: unknown, field: string): unknown {
  if (!item || typeof item !== "object") return undefined;
  const v = (item as Record<string, unknown>)[field];
  if (typeof v === "string") return v.toUpperCase();
  return v;
}

function dedupeByJson(items: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const item of items) {
    const k = JSON.stringify(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

function applyPreferences(
  prefs: BackupData["preferences"],
  mode: "replace" | "merge"
): void {
  if (!prefs) return;
  for (const key of Object.keys(PREFERENCE_KEYS) as PreferenceKey[]) {
    const incoming = prefs[key];
    if (incoming === undefined) continue;
    const storageKey = PREFERENCE_KEYS[key];
    if (mode === "merge" && readJson(storageKey) !== undefined) continue;
    writeJson(storageKey, incoming);
  }
}

/* ─────────────────────── reset all ────────────────────────────── */

/** Convenience wrapper around `wipeAllAppData` for the importer to call. */
export function clearCategory(category: BackupCategory): void {
  if (category === "preferences") {
    for (const key of Object.values(PREFERENCE_KEYS)) remove(key);
    return;
  }
  remove(USER_DATA_KEYS[category]);
}
