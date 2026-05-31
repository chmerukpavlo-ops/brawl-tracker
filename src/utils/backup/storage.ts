import type { BackupCategory } from "../../types/backup";

/**
 * Canonical list of every localStorage key that participates in
 * backups. Values are the *actual* keys used by the owning hooks
 * across the codebase — keep this file in sync if a hook changes its
 * storage key.
 *
 * Keys are split into three buckets:
 *   - `USER_DATA_KEYS`: round-tripped through backups (per category).
 *   - `PREFERENCE_KEYS`: round-tripped under the "preferences" category.
 *   - `CACHE_PREFIXES`: NOT backed up — caches that should be wiped by
 *      "reset all", but are recoverable from the API.
 */

/** Per-category single-key mapping. */
export const USER_DATA_KEYS = {
  myPlayer: "brawl_my_player",
  searchHistory: "brawl_search_history",
  pinnedPlayers: "brawl_favorites",
  pinnedGroups: "brawl_pinned_groups",
  dailyCheckin: "brawl_streak",
  goals: "brawl_goals",
  achievements: "brawl_achievements",
  aiHistory: "brawl_ai_history",
  onboarding: "brawl_onboarding_v1",
} as const satisfies Record<Exclude<BackupCategory, "preferences">, string>;

/** Sub-keys aggregated into the `preferences` category. */
export const PREFERENCE_KEYS = {
  locale: "brawl_locale",
  haptic: "haptic_enabled",
  voicePrefs: "brawl_voice_prefs",
  notifications: "brawl_notification_settings",
  notificationsState: "brawl_notifications_state",
  goalsAutoEnabled: "brawl_goals_auto_enabled",
  goalsOverlayEnabled: "brawl_goals_overlay_enabled",
  aiHistoryAutosave: "brawl_ai_history_autosave",
  achievementsNotifications: "brawl_achievements_notifications",
  achievementsDiamond: "brawl_achievements_diamond_celebration",
} as const;

export type PreferenceKey = keyof typeof PREFERENCE_KEYS;

/**
 * Cache prefixes — wiped on "reset all" but skipped by export/import
 * because they're cheap to re-derive from the API.
 */
export const CACHE_PREFIXES: readonly string[] = [
  "brawl_player_cache_",
  "brawl_club_cache_",
  "brawl_leaderboard_cache_",
  "brawl_battlelog_cache_",
];

/** Extra keys to wipe on reset (transient UI state, prompt cooldowns). */
export const RESET_EXTRA_KEYS: readonly string[] = [
  "brawl_pwa_install_dismissed",
  "brawl_pwa_update_dismissed",
  "brawl_pwa_installed_at",
  "brawl_pwa_session_count",
  "brawl_notification_prompted_at",
  "brawl_notification_dismissed",
  "previous_trophies",
  "my_player_tag", // legacy
];

/* ───────────────────────── primitives ─────────────────────────── */

/**
 * Safe `localStorage.getItem` + `JSON.parse`. Returns `undefined` for
 * missing keys, `null` only when the stored value is literally `null`.
 * Always swallows errors (corrupt entries, quota, private mode) so
 * callers can default cleanly.
 */
export function readRaw(key: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readJson<T = unknown>(key: string): T | undefined {
  const raw = readRaw(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Some hooks store plain strings/booleans (e.g. haptic_enabled);
    // fall back to raw to preserve them.
    return raw as unknown as T;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Removes every key the app owns: user data, preferences, caches,
 * legacy keys. Third-party keys are left alone. Returns the list of
 * removed keys so the UI can show a count.
 */
export function wipeAllAppData(): string[] {
  if (typeof localStorage === "undefined") return [];
  const removed: string[] = [];
  // Snapshot keys first because removing mutates the iteration order.
  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) allKeys.push(k);
  }

  const exactRemovals = new Set<string>([
    ...Object.values(USER_DATA_KEYS),
    ...Object.values(PREFERENCE_KEYS),
    ...RESET_EXTRA_KEYS,
  ]);

  for (const key of allKeys) {
    const matchesPrefix = CACHE_PREFIXES.some((p) => key.startsWith(p));
    if (exactRemovals.has(key) || matchesPrefix) {
      remove(key);
      removed.push(key);
    }
  }
  return removed;
}

/** Approximate size in bytes of all backup-eligible storage. */
export function estimateBackupSize(): number {
  let bytes = 0;
  const keys = [
    ...Object.values(USER_DATA_KEYS),
    ...Object.values(PREFERENCE_KEYS),
  ];
  for (const k of keys) {
    const v = readRaw(k);
    if (v) bytes += k.length + v.length;
  }
  return bytes;
}
