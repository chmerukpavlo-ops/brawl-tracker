import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ClubRanking, PlayerRanking } from "../types";
import { DEFAULT_COUNTRY, normalizeCountryCode } from "../data/countries";
import { trackAchievementEvent } from "./useAchievements";
import {
  useLeaderboardQuery,
  type LeaderboardSnapshot,
} from "./queries/useLeaderboardQuery";
import { queryKeys } from "../lib/queryKeys";

type LeaderboardKind = "players" | "clubs";

const COUNTRY_PREF_KEY: Record<LeaderboardKind, string> = {
  players: "brawl_leaderboard_country",
  clubs: "brawl_club_leaderboard_country",
};

function readCountryPref(kind: LeaderboardKind): string {
  if (typeof localStorage === "undefined") return DEFAULT_COUNTRY;
  try {
    return normalizeCountryCode(localStorage.getItem(COUNTRY_PREF_KEY[kind]));
  } catch {
    return DEFAULT_COUNTRY;
  }
}

function writeCountryPref(kind: LeaderboardKind, code: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(COUNTRY_PREF_KEY[kind], code);
  } catch {
    /* ignore */
  }
}

export interface UseLeaderboardApi<T> {
  country: string;
  items: T[];
  isLoading: boolean;
  /** Тиха підзагрузка (SWR) — показуємо існуючий список, оновлюємо у фоні. */
  isRefreshing: boolean;
  error: string | null;
  fetchedAt: number | null;
  isDemo: boolean;
  isStale: boolean;
  setCountry: (code: string) => void;
  refresh: () => Promise<void>;
  getRankByTag: (tag: string) => number | null;
}

function useLeaderboardImpl<T extends PlayerRanking | ClubRanking>(
  kind: LeaderboardKind,
  initialCountry?: string
): UseLeaderboardApi<T> {
  const qc = useQueryClient();
  const [country, setCountryState] = useState<string>(() =>
    normalizeCountryCode(initialCountry ?? readCountryPref(kind))
  );

  const query = useLeaderboardQuery<T>(kind, country);

  const snapshot: LeaderboardSnapshot<T> | undefined = query.data;

  const setCountry = useCallback(
    (nextRaw: string) => {
      const next = normalizeCountryCode(nextRaw);
      setCountryState((prev) => {
        if (prev === next) return prev;
        writeCountryPref(kind, next);
        trackAchievementEvent("leaderboard_country_change", { country: next });
        return next;
      });
    },
    [kind]
  );

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({
      queryKey: queryKeys.leaderboard(kind, country),
    });
    await query.refetch();
  }, [qc, kind, country, query]);

  const tagIndex = useMemo(() => {
    const m = new Map<string, number>();
    snapshot?.items.forEach((it) => {
      const norm = it.tag.replace(/^#+/, "").toUpperCase();
      m.set(norm, it.rank);
    });
    return m;
  }, [snapshot?.items]);

  const getRankByTag = useCallback(
    (tag: string) => {
      if (!tag) return null;
      const norm = tag.replace(/^#+/, "").toUpperCase();
      return tagIndex.get(norm) ?? null;
    },
    [tagIndex]
  );

  // The first paint should not show a spinner when we already have
  // hydrated data from localStorage — emulate the old hook's split
  // between "first-load" and "background refresh".
  const hasData = !!snapshot && snapshot.items.length > 0;
  const isLoading = query.isPending && !hasData;
  const isRefreshing = query.isFetching && hasData;

  // Surface request errors (network/HTTP), but don't override the
  // demo-fallback `warning` already baked into the snapshot.
  const error =
    snapshot?.warning ?? (query.error ? query.error.message : null);

  return {
    country,
    items: snapshot?.items ?? [],
    isLoading,
    isRefreshing,
    error,
    fetchedAt: snapshot?.fetchedAt ?? null,
    isDemo: snapshot?.isDemo ?? false,
    isStale: snapshot?.isStale ?? false,
    setCountry,
    refresh,
    getRankByTag,
  };
}

export function useLeaderboard(
  initialCountry?: string
): UseLeaderboardApi<PlayerRanking> & { getPlayerRank: (tag: string) => number | null } {
  const api = useLeaderboardImpl<PlayerRanking>("players", initialCountry);
  return { ...api, getPlayerRank: api.getRankByTag };
}

export function useClubLeaderboard(
  initialCountry?: string
): UseLeaderboardApi<ClubRanking> & { getClubRank: (tag: string) => number | null } {
  const api = useLeaderboardImpl<ClubRanking>("clubs", initialCountry);
  return { ...api, getClubRank: api.getRankByTag };
}
