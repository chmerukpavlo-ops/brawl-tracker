import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { PlayerStats } from "../types";
import {
  isStale,
  loadPlayerCache,
  normalizeTag,
  savePlayerCache,
} from "../utils/playerCache";
import { addSnapshot, buildSnapshot } from "../utils/trophyHistory";
import { trackAchievementEvent } from "./useAchievements";
import { haptic } from "./useHaptic";
import { api } from "../lib/api";
import { ApiError } from "../lib/queryClient";
import { queryKeys } from "../lib/queryKeys";

const CACHE_FRESH_MS = 60_000;
const TAG_RE = /^[A-Z0-9]{3,15}$/;

export interface UseCompareApi {
  comparePlayer: PlayerStats | null;
  isComparing: boolean;
  compareError: string | null;
  compareWith: (tag: string, opts?: { silent?: boolean }) => Promise<boolean>;
  clearCompare: () => void;
  setComparePlayer: (player: PlayerStats | null) => void;
}

interface UseCompareOptions {
  isDemoMode: boolean;
}

/**
 * Compare-slot wrapper that funnels its fetches through the shared
 * TanStack query cache. Public surface is identical to the original
 * `useCompare` hook so existing consumers (PlayerContext, CompareView)
 * keep working.
 */
export function useCompare({ isDemoMode }: UseCompareOptions): UseCompareApi {
  const qc = useQueryClient();
  const [comparePlayer, setComparePlayerState] = useState<PlayerStats | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const inFlightRef = useRef<string | null>(null);

  const clearCompare = useCallback(() => {
    setComparePlayerState(null);
    setCompareError(null);
  }, []);

  const setComparePlayer = useCallback((player: PlayerStats | null) => {
    setComparePlayerState(player);
    setCompareError(null);
  }, []);

  const compareWith = useCallback<UseCompareApi["compareWith"]>(
    async (rawTag, opts) => {
      const cleanTag = normalizeTag(rawTag);
      if (!cleanTag || !TAG_RE.test(cleanTag)) {
        setCompareError("Невірний тег");
        return false;
      }
      if (inFlightRef.current === cleanTag) return false;
      inFlightRef.current = cleanTag;
      setCompareError(null);

      const cached = loadPlayerCache(cleanTag);
      if (cached) {
        setComparePlayerState(cached.data);
        qc.setQueryData(
          queryKeys.player(cleanTag, { demo: isDemoMode }),
          cached.data
        );
        if (!isStale(cached.ageMs, CACHE_FRESH_MS)) {
          inFlightRef.current = null;
          if (!opts?.silent) haptic.success();
          trackAchievementEvent("compare");
          return true;
        }
      }

      setIsComparing(true);
      try {
        const data = await qc.fetchQuery({
          queryKey: queryKeys.player(cleanTag, { demo: isDemoMode }),
          queryFn: ({ signal }) =>
            api.getPlayer(cleanTag, { demo: isDemoMode, signal }),
          staleTime: CACHE_FRESH_MS,
        });
        const now = Date.now();
        savePlayerCache(cleanTag, data, now);
        addSnapshot(`#${cleanTag}`, buildSnapshot(data, now));
        setComparePlayerState(data);
        if (!opts?.silent) haptic.success();
        trackAchievementEvent("compare");
        return true;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.status === 404
              ? "Гравця не знайдено"
              : err.message
            : err instanceof Error
            ? err.message
            : "Помилка";
        setCompareError(message);
        if (!opts?.silent) haptic.error();
        return !!cached;
      } finally {
        inFlightRef.current = null;
        setIsComparing(false);
      }
    },
    [isDemoMode, qc]
  );

  useEffect(
    () => () => {
      inFlightRef.current = null;
    },
    []
  );

  return {
    comparePlayer,
    isComparing,
    compareError,
    compareWith,
    clearCompare,
    setComparePlayer,
  };
}
