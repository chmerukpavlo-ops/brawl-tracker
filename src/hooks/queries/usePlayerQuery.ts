import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useMyPlayer } from "../useMyPlayer";
import type { PlayerStats } from "../../types";
import { api } from "../../lib/api";
import { ApiError } from "../../lib/queryClient";
import { queryKeys } from "../../lib/queryKeys";
import {
  isStale,
  loadPlayerCache,
  normalizeTag,
  savePlayerCache,
} from "../../utils/playerCache";

const PLAYER_STALE_MS = 60_000;

type PlayerQueryOptions = {
  demo?: boolean;
  enabled?: boolean;
} & Pick<
  UseQueryOptions<PlayerStats, ApiError>,
  "refetchOnWindowFocus" | "refetchInterval" | "staleTime"
>;

/**
 * Fetch a single player by tag. Hydrates from the existing localStorage
 * `playerCache` so a cold start can paint instantly (offline-first) while
 * a background refetch validates freshness.
 */
export function usePlayerQuery(
  tag: string | null | undefined,
  options: PlayerQueryOptions = {}
) {
  const { demo = false, enabled = true, ...rest } = options;
  const normTag = tag ? normalizeTag(tag) : "";
  const isEnabled = !!normTag && enabled;

  return useQuery<PlayerStats, ApiError>({
    queryKey: queryKeys.player(normTag, { demo }),
    queryFn: async ({ signal }) => {
      const data = await api.getPlayer(normTag, { demo, signal });
      savePlayerCache(normTag, data, Date.now());
      return data;
    },
    enabled: isEnabled,
    staleTime: PLAYER_STALE_MS,
    // Seed cache from localStorage so the UI paints instantly even on
    // cold start / offline. TanStack will still kick off a network
    // refetch if the cached entry is older than `staleTime`.
    initialData: () => {
      if (!normTag) return undefined;
      const cached = loadPlayerCache(normTag);
      return cached?.data;
    },
    initialDataUpdatedAt: () => {
      if (!normTag) return undefined;
      return loadPlayerCache(normTag)?.timestamp;
    },
    ...rest,
  });
}

/**
 * Convenience hook for the user's primary profile (`myPlayer.tag`).
 * Returns `enabled: false` query if no main player is set yet.
 */
export function useCurrentPlayerQuery(
  options?: Omit<PlayerQueryOptions, "enabled">
) {
  const { myPlayer } = useMyPlayer();
  return usePlayerQuery(myPlayer.tag, { ...options, enabled: !!myPlayer.tag });
}

export { isStale as isPlayerCacheStale };
