import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ClubInfo } from "../types";
import { trackAchievementEvent } from "./useAchievements";
import { haptic } from "./useHaptic";
import { normalizeClubTag } from "../utils/clubMetrics";
import { api } from "../lib/api";
import { ApiError } from "../lib/queryClient";
import { queryKeys } from "../lib/queryKeys";

const TAG_RE = /^[A-Z0-9]{3,15}$/;
const CACHE_PREFIX = "brawl_club_cache_";
const CLUB_STALE_MS = 5 * 60 * 1000;

interface CachedClub {
  data: ClubInfo;
  timestamp: number;
}

function loadCache(tag: string): CachedClub | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + tag);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedClub | null;
    if (!parsed?.data || typeof parsed.timestamp !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(tag: string, data: ClubInfo): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_PREFIX + tag,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    /* ignore quota */
  }
}

export interface UseClubApi {
  clubInfo: ClubInfo | null;
  isClubLoading: boolean;
  clubError: string | null;
  fetchClub: (tag: string, opts?: { silent?: boolean; forceFresh?: boolean }) => Promise<boolean>;
  clearClub: () => void;
}

interface UseClubOptions {
  isDemoMode: boolean;
}

/**
 * Thin imperative wrapper over the TanStack club-query cache.
 *
 * Existing PlayerContext consumers expect the legacy interface
 * (`clubInfo`, `isClubLoading`, `clubError`, `fetchClub(tag)`,
 * `clearClub()`), so we surface that — but the actual data flow goes
 * through `queryClient` so multiple components requesting the same club
 * dedupe automatically and Devtools sees the activity.
 */
export function useClub({ isDemoMode }: UseClubOptions): UseClubApi {
  const qc = useQueryClient();
  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);
  const [isClubLoading, setIsClubLoading] = useState(false);
  const [clubError, setClubError] = useState<string | null>(null);
  const inFlightRef = useRef<string | null>(null);

  const clearClub = useCallback(() => {
    setClubInfo(null);
    setClubError(null);
  }, []);

  const fetchClub = useCallback<UseClubApi["fetchClub"]>(
    async (rawTag, opts) => {
      const cleanTag = normalizeClubTag(rawTag);
      if (!cleanTag || !TAG_RE.test(cleanTag)) {
        setClubError("Невірний тег клубу");
        return false;
      }
      if (inFlightRef.current === cleanTag) return false;
      inFlightRef.current = cleanTag;
      setClubError(null);

      const cached = opts?.forceFresh ? null : loadCache(cleanTag);
      const isCacheFresh = cached && Date.now() - cached.timestamp < CLUB_STALE_MS;

      if (cached) {
        setClubInfo(cached.data);
        // Mirror into query cache so other components reading via
        // `useClubQuery` see the same data without an extra fetch.
        qc.setQueryData(
          queryKeys.club(cleanTag, { demo: isDemoMode }),
          cached.data
        );
        if (isCacheFresh) {
          inFlightRef.current = null;
          trackAchievementEvent("club_view", {
            memberCount: cached.data.members?.length ?? 0,
          });
          if (!opts?.silent) haptic.light();
          return true;
        }
      }

      setIsClubLoading(true);
      try {
        const data = await qc.fetchQuery({
          queryKey: queryKeys.club(cleanTag, { demo: isDemoMode }),
          queryFn: ({ signal }) =>
            api.getClub(cleanTag, { demo: isDemoMode, signal }),
          staleTime: CLUB_STALE_MS,
        });
        saveCache(cleanTag, data);
        setClubInfo(data);
        trackAchievementEvent("club_view", {
          memberCount: data.members?.length ?? 0,
        });
        if (!opts?.silent) haptic.medium();
        return true;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.status === 404
              ? "Клуб не знайдено"
              : err.message
            : err instanceof Error
            ? err.message
            : "Помилка";
        setClubError(message);
        if (!opts?.silent) haptic.error();
        return !!cached;
      } finally {
        inFlightRef.current = null;
        setIsClubLoading(false);
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

  return { clubInfo, isClubLoading, clubError, fetchClub, clearClub };
}
