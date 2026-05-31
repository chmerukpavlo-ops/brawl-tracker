/**
 * On-disk schema for the local-data backup feature. Versioned so the
 * importer can migrate older files forward as the app evolves.
 *
 * IMPORTANT: bump `BACKUP_VERSION` and add a migration in
 * `utils/backup/migrations.ts` whenever the `data` shape changes in a
 * breaking way. Backwards-compatible additions don't require a bump.
 */

export const BACKUP_VERSION = 1;

/** Logical sections a user can choose to import. */
export type BackupCategory =
  | "myPlayer"
  | "searchHistory"
  | "pinnedPlayers"
  | "pinnedGroups"
  | "dailyCheckin"
  | "goals"
  | "achievements"
  | "aiHistory"
  | "preferences"
  | "onboarding";

export const ALL_CATEGORIES: readonly BackupCategory[] = [
  "myPlayer",
  "searchHistory",
  "pinnedPlayers",
  "pinnedGroups",
  "dailyCheckin",
  "goals",
  "achievements",
  "aiHistory",
  "preferences",
  "onboarding",
] as const;

/**
 * Shape of the user data we round-trip. We intentionally keep field
 * values opaque (`unknown`) — each field stores the JSON that the
 * owning hook is already responsible for. Storing rich types here
 * would couple the backup format to internal types and force a bump
 * any time a hook's shape changed.
 */
export interface BackupData {
  myPlayer?: unknown;
  searchHistory?: unknown;
  pinnedPlayers?: unknown;
  pinnedGroups?: unknown;
  dailyCheckin?: unknown;
  goals?: unknown;
  achievements?: unknown;
  aiHistory?: unknown;
  preferences?: {
    locale?: unknown;
    haptic?: unknown;
    voicePrefs?: unknown;
    notifications?: unknown;
    notificationsState?: unknown;
    goalsAutoEnabled?: unknown;
    goalsOverlayEnabled?: unknown;
    aiHistoryAutosave?: unknown;
    achievementsNotifications?: unknown;
    achievementsDiamond?: unknown;
  };
  onboarding?: unknown;
}

export interface BackupDeviceInfo {
  userAgent: string;
  platform: string;
}

export interface BackupPayload {
  version: number;
  exportedAt: number;
  /** Semver of the app at export time (best-effort, may be empty). */
  appVersion: string;
  deviceInfo?: BackupDeviceInfo;
  data: BackupData;
  /** SHA-256 of `JSON.stringify(data)` — verified on import. */
  checksum?: string;
}

export type BackupValidationResult =
  | { valid: true; payload: BackupPayload }
  | { valid: false; reason: string; details?: string[] };

/** How an import should merge into existing local data. */
export type ImportStrategy = "replace" | "merge" | "selective";

/** When `strategy === "selective"`, this dictates which slices apply. */
export type ImportSelection = Partial<Record<BackupCategory, boolean>>;

/** Encrypted wrapper around a serialized BackupPayload (PBKDF2 + AES-GCM). */
export interface EncryptedBackupEnvelope {
  /** Discriminator so importer can tell encrypted from plain files. */
  format: "brawl.backup.v1.enc";
  /** Base64-encoded `salt(16) || iv(12) || ciphertext`. */
  payload: string;
}

export function isEncryptedEnvelope(
  obj: unknown
): obj is EncryptedBackupEnvelope {
  return (
    !!obj &&
    typeof obj === "object" &&
    (obj as { format?: unknown }).format === "brawl.backup.v1.enc" &&
    typeof (obj as { payload?: unknown }).payload === "string"
  );
}

/** Summary computed from a BackupPayload — used by the import preview UI. */
export interface BackupSummary {
  exportedAt: number;
  appVersion: string;
  version: number;
  deviceInfo?: BackupDeviceInfo;
  counts: Partial<Record<BackupCategory, number>>;
  /** Categories that contain any data at all. */
  present: BackupCategory[];
}
