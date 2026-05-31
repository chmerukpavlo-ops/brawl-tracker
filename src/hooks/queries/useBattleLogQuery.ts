import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import type { BattleLogEntry, BattleLogResponse } from "../../types/battle";
import { generateDemoBattleLog } from "../../data/demoBattleLog";
import { normalizeTag } from "../../utils/playerCache";

const STORAGE_PREFIX = "brawl_battlelog_cache_";
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes — battle log doesn't change often

interface Cached {
  data: BattleLogResponse;
  timestamp: number;
}

function storageKey(tag: string): string {
  return STORAGE_PREFIX + normalizeTag(tag);
}

function loadCache(tag: string): Cached | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(tag));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed || !parsed.data || typeof parsed.timestamp !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(tag: string, data: BattleLogResponse): void {
  if (typeof localStorage === "undefined") return;
  try {
    const entry: Cached = { data, timestamp: Date.now() };
    localStorage.setItem(storageKey(tag), JSON.stringify(entry));
  } catch {
    /* quota — ignore */
  }
}

interface UseBattleLogQueryOptions {
  tag: string | null | undefined;
  demo?: boolean;
  /** Disable refetch (e.g. during onboarding). */
  enabled?: boolean;
}

/**
 * Fetches the battle log for a player tag with localStorage hydration
 * (instant UI from cache) and graceful fallback to deterministic demo
 * data when the API errors out — keeps the screen useful even offline.
 */
export function useBattleLogQuery({
  tag,
  demo,
  enabled = true,
}: UseBattleLogQueryOptions) {
  const safeTag = tag ?? "";
  const cached = safeTag ? loadCache(safeTag) : null;

  return useQuery<BattleLogResponse>({
    queryKey: queryKeys.battleLog(safeTag, { demo }),
    enabled: enabled && !!safeTag,
    queryFn: async ({ signal }) => {
      try {
        const response = await api.getBattleLog(safeTag, { demo, signal });
        saveCache(safeTag, response);
        return response;
      } catch (err) {
        // Stale cache → return it instead of throwing so the UI still
        // has data to render even when the API hiccups.
        const stale = loadCache(safeTag);
        if (stale) return stale.data;

        // Last-resort fallback: synthesize a demo log.
        const fallback: BattleLogResponse = {
          items: generateDemoBattleLog({ tag: safeTag, name: "Player" }),
          isDemo: true,
        };
        // Re-throw only when the caller specifically wants real data,
        // because in that case showing demo would be misleading.
        if (!demo) throw err;
        return fallback;
      }
    },
    initialData: cached?.data,
    initialDataUpdatedAt: cached?.timestamp,
    staleTime: MAX_AGE_MS,
    gcTime: 30 * 60 * 1000,
  });
}

/** Lightweight helper — pulls cached items without subscribing. */
export function getCachedBattleLog(tag: string): BattleLogEntry[] {
  return loadCache(tag)?.data.items ?? [];
}
