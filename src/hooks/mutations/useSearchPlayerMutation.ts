import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PlayerStats } from "../../types";
import { api } from "../../lib/api";
import { ApiError } from "../../lib/queryClient";
import { queryKeys } from "../../lib/queryKeys";
import { normalizeTag, savePlayerCache } from "../../utils/playerCache";

export interface SearchPlayerInput {
  tag: string;
  demo?: boolean;
}

/**
 * Imperative player fetch wrapped in a mutation. On success we both:
 *
 *  - prime the player-query cache (so `usePlayerQuery(tag)` resolves
 *    instantly next time), and
 *  - persist to the localStorage `playerCache` so a cold start still
 *    paints from cache.
 *
 * Callers (PlayerContext) layer additional side-effects on top — record
 * toasts, achievement events, history saves, etc. The mutation only owns
 * the I/O.
 */
export function useSearchPlayerMutation() {
  const qc = useQueryClient();

  return useMutation<PlayerStats, ApiError, SearchPlayerInput>({
    mutationFn: ({ tag, demo = false }) =>
      api.getPlayer(normalizeTag(tag), { demo }),
    onSuccess: (data, vars) => {
      const norm = normalizeTag(vars.tag);
      savePlayerCache(norm, data, Date.now());
      qc.setQueryData(queryKeys.player(norm, { demo: !!vars.demo }), data);
      // Also seed the non-demo key when we just fetched real data — this
      // makes subsequent `usePlayerQuery(tag)` calls (no demo flag) hit
      // immediately without a refetch.
      if (!vars.demo) {
        qc.setQueryData(queryKeys.player(norm, { demo: false }), data);
      }
    },
  });
}
