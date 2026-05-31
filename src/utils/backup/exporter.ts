import {
  BACKUP_VERSION,
  type BackupData,
  type BackupPayload,
} from "../../types/backup";
import { PREFERENCE_KEYS, USER_DATA_KEYS, readJson } from "./storage";
import { sha256 } from "./crypto";

/**
 * Snapshots the user's local data into a versioned, integrity-checked
 * payload. `checksum` covers a stable JSON of `data` only (NOT the
 * envelope) so re-exports with identical data produce identical hashes.
 */
export async function createBackup(): Promise<BackupPayload> {
  const data: BackupData = {
    myPlayer: readJson(USER_DATA_KEYS.myPlayer),
    searchHistory: readJson(USER_DATA_KEYS.searchHistory),
    pinnedPlayers: readJson(USER_DATA_KEYS.pinnedPlayers),
    pinnedGroups: readJson(USER_DATA_KEYS.pinnedGroups),
    dailyCheckin: readJson(USER_DATA_KEYS.dailyCheckin),
    goals: readJson(USER_DATA_KEYS.goals),
    achievements: readJson(USER_DATA_KEYS.achievements),
    aiHistory: readJson(USER_DATA_KEYS.aiHistory),
    onboarding: readJson(USER_DATA_KEYS.onboarding),
    preferences: {
      locale: readJson(PREFERENCE_KEYS.locale),
      haptic: readJson(PREFERENCE_KEYS.haptic),
      voicePrefs: readJson(PREFERENCE_KEYS.voicePrefs),
      notifications: readJson(PREFERENCE_KEYS.notifications),
      notificationsState: readJson(PREFERENCE_KEYS.notificationsState),
      goalsAutoEnabled: readJson(PREFERENCE_KEYS.goalsAutoEnabled),
      goalsOverlayEnabled: readJson(PREFERENCE_KEYS.goalsOverlayEnabled),
      aiHistoryAutosave: readJson(PREFERENCE_KEYS.aiHistoryAutosave),
      achievementsNotifications: readJson(
        PREFERENCE_KEYS.achievementsNotifications
      ),
      achievementsDiamond: readJson(PREFERENCE_KEYS.achievementsDiamond),
    },
  };

  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    appVersion:
      (typeof import.meta !== "undefined" &&
        (import.meta as { env?: { VITE_APP_VERSION?: string } }).env
          ?.VITE_APP_VERSION) ||
      "",
    deviceInfo: collectDeviceInfo(),
    data,
  };

  payload.checksum = await sha256(stableStringify(data));
  return payload;
}

function collectDeviceInfo() {
  if (typeof navigator === "undefined") return undefined;
  return {
    userAgent: navigator.userAgent || "",
    platform:
      (navigator as Navigator & { userAgentData?: { platform?: string } })
        .userAgentData?.platform ||
      navigator.platform ||
      "",
  };
}

/**
 * Deterministic JSON.stringify — sorts object keys so the checksum is
 * stable across runs regardless of insertion order. Arrays preserve
 * order (they're semantically ordered).
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        sorted[k] = (v as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return v;
  });
}

/**
 * Triggers a browser download for a Blob. Uses an out-of-tree `<a>`
 * with `URL.createObjectURL`, then revokes immediately to avoid memory
 * leaks. Returns false if document is unavailable (SSR / extension).
 */
export function downloadBlob(blob: Blob, filename: string): boolean {
  if (typeof document === "undefined") return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  // Append for Firefox; click; remove.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revocation slightly so Safari can pick up the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return true;
}

/** "brawl-tracker-backup-2026-05-30.json" */
export function defaultBackupFilename(encrypted = false): string {
  const date = new Date().toISOString().split("T")[0];
  return encrypted
    ? `brawl-tracker-backup-${date}.enc.json`
    : `brawl-tracker-backup-${date}.json`;
}
