import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { normalizeTag } from "../utils/playerCache";
import { loadPlayerCache } from "../utils/playerCache";

/**
 * Returns a stable `prefetch(tag)` function that warms the player query
 * cache. Safe to call on hover/long-press — TanStack dedupes in-flight
 * requests automatically.
 */
export function usePrefetchPlayer() {
  const qc = useQueryClient();
  return useCallback(
    (rawTag: string, opts?: { demo?: boolean }) => {
      const tag = normalizeTag(rawTag);
      if (!tag) return;
      void qc.prefetchQuery({
        queryKey: queryKeys.player(tag, { demo: !!opts?.demo }),
        queryFn: ({ signal }) => api.getPlayer(tag, { demo: opts?.demo, signal }),
        staleTime: 60_000,
        initialData: () => loadPlayerCache(tag)?.data,
        initialDataUpdatedAt: () => loadPlayerCache(tag)?.timestamp,
      });
    },
    [qc]
  );
}
