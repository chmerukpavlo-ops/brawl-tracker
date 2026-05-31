import type { PlayerStats } from "../types";
import type { CachedPlayer } from "../navigation/types";

export const PLAYER_CACHE_PREFIX = "brawl_player_cache_";
export const DEFAULT_MAX_AGE_MS = 60_000;
export const DEFAULT_MAX_ENTRIES = 10;

export function normalizeTag(tag: string): string {
  return tag.trim().toUpperCase().replace(/^#+/, "");
}

function cacheKey(tag: string): string {
  return PLAYER_CACHE_PREFIX + normalizeTag(tag);
}

function listCacheKeys(): string[] {
  if (typeof localStorage === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PLAYER_CACHE_PREFIX)) keys.push(k);
  }
  return keys;
}

interface StoredEntry {
  data: PlayerStats;
  timestamp: number;
}

function readEntry(key: string): StoredEntry | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredEntry;
    if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.timestamp !== "number") {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    return null;
  }
}

export function enforceMaxCacheSize(maxEntries: number = DEFAULT_MAX_ENTRIES): void {
  const keys = listCacheKeys();
  if (keys.length <= maxEntries) return;

  const entries = keys
    .map((k) => {
      const e = readEntry(k);
      return e ? { key: k, timestamp: e.timestamp } : null;
    })
    .filter((x): x is { key: string; timestamp: number } => x !== null)
    .sort((a, b) => a.timestamp - b.timestamp);

  const toRemove = entries.length - maxEntries;
  for (let i = 0; i < toRemove; i++) {
    try { localStorage.removeItem(entries[i].key); } catch { /* ignore */ }
  }
}

export function savePlayerCache(
  tag: string,
  data: PlayerStats,
  timestamp: number = Date.now()
): void {
  const key = cacheKey(tag);
  const payload = JSON.stringify({ data, timestamp });

  const tryWrite = (): boolean => {
    try {
      localStorage.setItem(key, payload);
      return true;
    } catch {
      return false;
    }
  };

  if (!tryWrite()) {
    enforceMaxCacheSize(Math.max(1, DEFAULT_MAX_ENTRIES - 2));
    if (!tryWrite()) {
      console.warn("[playerCache] failed to write cache entry");
      return;
    }
  }
  enforceMaxCacheSize();
}

export function loadPlayerCache(
  tag: string
): (CachedPlayer & { ageMs: number }) | null {
  const key = cacheKey(tag);
  const entry = readEntry(key);
  if (!entry) return null;
  return {
    data: entry.data,
    timestamp: entry.timestamp,
    ageMs: Date.now() - entry.timestamp,
  };
}

export function clearPlayerCache(tag?: string): void {
  if (tag) {
    try { localStorage.removeItem(cacheKey(tag)); } catch { /* ignore */ }
    return;
  }
  for (const k of listCacheKeys()) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
}

export function isStale(ageMs: number, maxAgeMs: number = DEFAULT_MAX_AGE_MS): boolean {
  return ageMs >= maxAgeMs;
}

export function countCachedPlayers(): number {
  return listCacheKeys().length;
}
