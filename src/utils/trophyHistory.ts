import type { PlayerStats } from "../types";
import { normalizeTag } from "./playerCache";

export const TROPHY_HISTORY_PREFIX = "brawl_trophy_history_";
export const MAX_SNAPSHOTS = 500;
export const DEDUP_WINDOW_MS = 60_000;

export interface TrophySnapshot {
  timestamp: number;
  trophies: number;
  highestTrophies: number;
  expLevel: number;
  v3Victories: number;
  soloVictories: number;
  duoVictories: number;
}

export interface SnapshotInput {
  trophies: number;
  highestTrophies: number;
  expLevel: number;
  v3Victories: number;
  soloVictories: number;
  duoVictories: number;
}

export interface RangeOptions {
  limit?: number;
  sinceMs?: number;
  untilMs?: number;
}

export interface DeltaInfo {
  delta: number;
  percentage: number;
  count: number;
  fromTimestamp: number;
  toTimestamp: number;
}

function historyKey(tag: string): string {
  return TROPHY_HISTORY_PREFIX + normalizeTag(tag);
}

function listHistoryKeys(): string[] {
  if (typeof localStorage === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(TROPHY_HISTORY_PREFIX)) keys.push(k);
  }
  return keys;
}

function readRaw(tag: string): TrophySnapshot[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(historyKey(tag));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is TrophySnapshot =>
        s !== null &&
        typeof s === "object" &&
        typeof s.timestamp === "number" &&
        typeof s.trophies === "number"
    );
  } catch {
    return [];
  }
}

function writeRaw(tag: string, snapshots: TrophySnapshot[]): void {
  if (typeof localStorage === "undefined") return;
  const key = historyKey(tag);
  const payload = JSON.stringify(snapshots);
  try {
    localStorage.setItem(key, payload);
  } catch {
    // Quota exceeded — drop the oldest history of the LRU player and retry once.
    const keys = listHistoryKeys().filter((k) => k !== key);
    if (keys.length === 0) {
      try {
        localStorage.setItem(key, JSON.stringify(snapshots.slice(-50)));
      } catch {
        /* ignore */
      }
      return;
    }
    const oldest = keys
      .map((k) => {
        const arr = readRaw(k.replace(TROPHY_HISTORY_PREFIX, ""));
        const ts = arr[arr.length - 1]?.timestamp ?? 0;
        return { key: k, ts };
      })
      .sort((a, b) => a.ts - b.ts)[0];
    try {
      localStorage.removeItem(oldest.key);
      localStorage.setItem(key, payload);
    } catch {
      /* ignore */
    }
  }
}

export function buildSnapshot(
  player: PlayerStats,
  timestamp: number = Date.now()
): TrophySnapshot {
  return {
    timestamp,
    trophies: player.trophies,
    highestTrophies: player.highestTrophies,
    expLevel: player.expLevel ?? 0,
    v3Victories: player["3vs3Victories"] ?? 0,
    soloVictories: player.soloVictories ?? 0,
    duoVictories: player.duoVictories ?? 0,
  };
}

export function addSnapshot(tag: string, snapshot: TrophySnapshot): boolean {
  const list = readRaw(tag);
  const last = list[list.length - 1];

  if (
    last &&
    snapshot.timestamp - last.timestamp < DEDUP_WINDOW_MS &&
    last.trophies === snapshot.trophies &&
    last.highestTrophies === snapshot.highestTrophies
  ) {
    return false;
  }

  const next = [...list, snapshot];
  const trimmed = next.length > MAX_SNAPSHOTS ? next.slice(-MAX_SNAPSHOTS) : next;
  writeRaw(tag, trimmed);
  return true;
}

export function getSnapshots(
  tag: string,
  options: RangeOptions = {}
): TrophySnapshot[] {
  const all = readRaw(tag);
  let filtered = all;
  if (options.sinceMs !== undefined) {
    const min = options.sinceMs;
    filtered = filtered.filter((s) => s.timestamp >= min);
  }
  if (options.untilMs !== undefined) {
    const max = options.untilMs;
    filtered = filtered.filter((s) => s.timestamp <= max);
  }
  if (options.limit !== undefined && filtered.length > options.limit) {
    filtered = filtered.slice(-options.limit);
  }
  return filtered;
}

export function clearTrophyHistory(tag?: string): void {
  if (tag) {
    try {
      localStorage.removeItem(historyKey(tag));
    } catch {
      /* ignore */
    }
    return;
  }
  for (const k of listHistoryKeys()) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

export function getDelta(tag: string, sinceMs: number): DeltaInfo | null {
  const snapshots = getSnapshots(tag, { sinceMs });
  if (snapshots.length < 2) return null;
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  const delta = last.trophies - first.trophies;
  const percentage = first.trophies > 0 ? (delta / first.trophies) * 100 : 0;
  return {
    delta,
    percentage,
    count: snapshots.length,
    fromTimestamp: first.timestamp,
    toTimestamp: last.timestamp,
  };
}

export function getAllPlayerTagsWithHistory(): string[] {
  return listHistoryKeys().map((k) => k.replace(TROPHY_HISTORY_PREFIX, ""));
}

export function countTotalSnapshots(): number {
  return listHistoryKeys().reduce((sum, k) => {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) return sum;
      const parsed = JSON.parse(raw);
      return sum + (Array.isArray(parsed) ? parsed.length : 0);
    } catch {
      return sum;
    }
  }, 0);
}

export function downsample<T>(items: T[], targetCount: number): T[] {
  if (items.length <= targetCount) return items;
  if (targetCount <= 1) return items.length > 0 ? [items[items.length - 1]] : [];

  const result: T[] = [];
  const step = (items.length - 1) / (targetCount - 1);
  for (let i = 0; i < targetCount; i++) {
    const idx = Math.round(i * step);
    result.push(items[idx]);
  }
  return result;
}

export type TrophyRange = "24h" | "7d" | "30d" | "all";

export const RANGE_LABEL: Record<TrophyRange, string> = {
  "24h": "За 24 години",
  "7d": "За 7 днів",
  "30d": "За 30 днів",
  all: "За весь час",
};

export const RANGE_SHORT: Record<TrophyRange, string> = {
  "24h": "24г",
  "7d": "7д",
  "30d": "30д",
  all: "Усе",
};

export function rangeSinceMs(range: TrophyRange, now: number = Date.now()): number | undefined {
  switch (range) {
    case "24h":
      return now - 24 * 60 * 60 * 1000;
    case "7d":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "all":
      return undefined;
  }
}
