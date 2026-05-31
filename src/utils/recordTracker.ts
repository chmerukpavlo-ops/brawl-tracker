/**
 * Per-tag dedup of "new personal record" toasts.
 *
 * The trophy-record toast used to fire on every successful `handleQuery`
 * when the response contained a higher *current* `trophies` value than
 * the previously-cached one. Three things were wrong:
 *
 *   1. Wrong field. The user's actual personal record is
 *      `highestTrophies` — `trophies` swings up and down as the player
 *      wins and loses matches.
 *   2. No dedup. Every refresh / SWR revalidation that returned the
 *      same payload re-triggered the toast.
 *   3. Cross-session leakage. `previousTrophies` was a single global
 *      number — switching between tags caused spurious "records"
 *      against unrelated baselines.
 *
 * This module owns the dedup state. It stores the last value we have
 * already notified about, keyed by normalised player tag, in
 * localStorage so the dedup survives reloads.
 *
 * Storage shape:
 *
 *   ```json
 *   {
 *     "PYLQ20": 65000,
 *     "2PP0LJL8": 12345
 *   }
 *   ```
 *
 * Tags are stripped of leading `#` and uppercased before use so
 * `"#pylq20"` and `"PYLQ20"` are treated as the same player.
 */

const LAST_RECORD_NOTIFIED_KEY = "brawl_last_record_notified";

function normalizeTag(tag: string): string {
  return String(tag ?? "").trim().toUpperCase().replace(/^#+/, "");
}

function readMap(): Record<string, number> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(LAST_RECORD_NOTIFIED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    // Defensive: anything that isn't a plain object is treated as a
    // corrupted payload and silently reset. We never throw — bad LS
    // shouldn't crash the app.
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        out[k] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, number>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LAST_RECORD_NOTIFIED_KEY, JSON.stringify(map));
  } catch {
    /* private mode / quota — silently degrade */
  }
}

/**
 * Returns the last `highestTrophies` value we already showed a record
 * toast for, on this tag. Returns 0 when nothing was ever notified
 * (so the caller's `data.highestTrophies > stored` comparison
 * trivially passes the first time).
 */
export function getLastNotifiedRecord(tag: string): number {
  const key = normalizeTag(tag);
  if (!key) return 0;
  const map = readMap();
  const v = map[key];
  return typeof v === "number" && v > 0 ? v : 0;
}

/**
 * Records that we've shown a "new record" toast for `tag` at the
 * given `highestTrophies` value. Use the *new* value; the next call
 * to `getLastNotifiedRecord` will return it and gate further toasts.
 */
export function setLastNotifiedRecord(tag: string, value: number): void {
  const key = normalizeTag(tag);
  if (!key) return;
  if (!Number.isFinite(value) || value < 0) return;
  const map = readMap();
  map[key] = value;
  writeMap(map);
}

/**
 * Forgets the last-notified record for a single tag (when omitted —
 * for every tag). Mostly useful for tests and the "Reset all data"
 * action in Settings.
 */
export function clearLastNotifiedRecord(tag?: string): void {
  if (typeof localStorage === "undefined") return;
  if (!tag) {
    try {
      localStorage.removeItem(LAST_RECORD_NOTIFIED_KEY);
    } catch {
      /* swallow */
    }
    return;
  }
  const key = normalizeTag(tag);
  if (!key) return;
  const map = readMap();
  if (!(key in map)) return;
  delete map[key];
  writeMap(map);
}
