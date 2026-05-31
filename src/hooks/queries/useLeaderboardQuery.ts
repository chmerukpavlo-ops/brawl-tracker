import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  type ClubRanking,
  type PlayerRanking,
  DEMO_CLUB_RANKINGS,
  DEMO_LEADERBOARD,
} from "../../types";
import { api, type LeaderboardResponse } from "../../lib/api";
import { ApiError } from "../../lib/queryClient";
import { queryKeys } from "../../lib/queryKeys";
import { normalizeCountryCode } from "../../data/countries";

const LEADERBOARD_STALE_MS = 5 * 60_000;
const LEADERBOARD_CACHE_PREFIX = {
  players: "brawl_leaderboard_cache_",
  clubs: "brawl_club_leaderboard_cache_",
} as const;

type LeaderboardKind = "players" | "clubs";

interface CachedPayload<T> {
  items: T[];
  fetchedAt: number;
  isDemo?: boolean;
}

function readLbCache<T>(kind: LeaderboardKind, country: string): CachedPayload<T> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${LEADERBOARD_CACHE_PREFIX[kind]}${country}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedPayload<T>> | null;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    if (typeof parsed.fetchedAt !== "number") return null;
    return {
      items: parsed.items as T[],
      fetchedAt: parsed.fetchedAt,
      isDemo: !!parsed.isDemo,
    };
  } catch {
    return null;
  }
}

function writeLbCache<T>(
  kind: LeaderboardKind,
  country: string,
  payload: CachedPayload<T>
): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      `${LEADERBOARD_CACHE_PREFIX[kind]}${country}`,
      JSON.stringify(payload)
    );
  } catch {
    /* ignore quota */
  }
}

function normalizePlayerRanking(input: unknown, fallbackRank: number): PlayerRanking | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Partial<PlayerRanking>;
  if (typeof r.tag !== "string" || typeof r.name !== "string") return null;
  return {
    tag: r.tag,
    name: r.name,
    nameColor: typeof r.nameColor === "string" ? r.nameColor : undefined,
    icon:
      r.icon && typeof (r.icon as { id?: unknown }).id === "number"
        ? { id: (r.icon as { id: number }).id }
        : undefined,
    trophies: typeof r.trophies === "number" ? r.trophies : 0,
    rank: typeof r.rank === "number" ? r.rank : fallbackRank,
    club:
      r.club && typeof (r.club as { name?: unknown }).name === "string"
        ? { name: (r.club as { name: string }).name }
        : undefined,
  };
}

function normalizeClubRanking(input: unknown, fallbackRank: number): ClubRanking | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Partial<ClubRanking>;
  if (typeof r.tag !== "string" || typeof r.name !== "string") return null;
  return {
    tag: r.tag,
    name: r.name,
    badgeId: typeof r.badgeId === "number" ? r.badgeId : 0,
    trophies: typeof r.trophies === "number" ? r.trophies : 0,
    memberCount: typeof r.memberCount === "number" ? r.memberCount : 0,
    rank: typeof r.rank === "number" ? r.rank : fallbackRank,
  };
}

function normalizeList<T extends { rank: number; trophies: number }>(
  items: unknown[],
  picker: (raw: unknown, fallback: number) => T | null
): T[] {
  const out: T[] = [];
  items.forEach((item, idx) => {
    const ranking = picker(item, idx + 1);
    if (ranking) out.push(ranking);
  });
  return out
    .sort((a, b) => a.rank - b.rank || b.trophies - a.trophies)
    .map((r, idx) => ({ ...r, rank: r.rank || idx + 1 }));
}

const PICKERS = {
  players: normalizePlayerRanking,
  clubs: normalizeClubRanking,
} as const;

const DEMO_FALLBACK = {
  players: DEMO_LEADERBOARD,
  clubs: DEMO_CLUB_RANKINGS,
} as const;

export interface LeaderboardSnapshot<T> {
  items: T[];
  fetchedAt: number;
  isDemo: boolean;
  isStale: boolean;
  warning?: string;
}

type LeaderboardQueryOptions<T> = Pick<
  UseQueryOptions<LeaderboardSnapshot<T>, ApiError>,
  "enabled" | "refetchInterval" | "refetchOnWindowFocus"
> & {
  forceFresh?: boolean;
};

/**
 * Fetch a leaderboard slice (players or clubs) for `country`. Normalizes
 * the raw API response into a stable `LeaderboardSnapshot<T>` shape so the
 * UI can treat both demo fallbacks and real data identically.
 *
 * Like the player/club queries this hydrates from localStorage so the
 * first paint is instant even offline.
 */
export function useLeaderboardQuery<T extends PlayerRanking | ClubRanking>(
  kind: LeaderboardKind,
  rawCountry: string,
  options: LeaderboardQueryOptions<T> = {}
) {
  const { forceFresh, ...rest } = options;
  const country = normalizeCountryCode(rawCountry);
  const picker = PICKERS[kind] as (raw: unknown, fallback: number) => T | null;
  const demoFallback = DEMO_FALLBACK[kind] as unknown as T[];

  return useQuery<LeaderboardSnapshot<T>, ApiError>({
    queryKey: queryKeys.leaderboard(kind, country),
    queryFn: async ({ signal }) => {
      let payload: LeaderboardResponse<unknown>;
      try {
        payload = await api.getLeaderboard<unknown>(kind, country, {
          forceFresh,
          signal,
        });
      } catch (err) {
        // For a network/HTTP failure we still try to fall back to demo
        // data so the user never sees a blank screen.
        if (err instanceof ApiError && Array.isArray((err.body as LeaderboardResponse<unknown>)?.items)) {
          payload = err.body as LeaderboardResponse<unknown>;
        } else {
          const cached = readLbCache<T>(kind, country);
          if (cached) {
            return {
              items: cached.items,
              fetchedAt: cached.fetchedAt,
              isDemo: !!cached.isDemo,
              isStale: true,
            };
          }
          return {
            items: demoFallback,
            fetchedAt: Date.now(),
            isDemo: true,
            isStale: true,
            warning: err instanceof Error ? err.message : undefined,
          };
        }
      }
      const normalized = normalizeList<T>(payload.items ?? [], picker);
      const fetchedAt = Date.now();
      const isDemo = !!payload.isDemo || !!payload.isDemoFallback;
      writeLbCache<T>(kind, country, { items: normalized, fetchedAt, isDemo });
      return {
        items: normalized.length ? normalized : demoFallback,
        fetchedAt,
        isDemo: normalized.length ? isDemo : true,
        isStale: !!payload.stale,
        warning: payload.warning,
      };
    },
    staleTime: LEADERBOARD_STALE_MS,
    initialData: () => {
      const cached = readLbCache<T>(kind, country);
      if (!cached) return undefined;
      return {
        items: cached.items,
        fetchedAt: cached.fetchedAt,
        isDemo: !!cached.isDemo,
        isStale: false,
      } satisfies LeaderboardSnapshot<T>;
    },
    initialDataUpdatedAt: () => readLbCache<T>(kind, country)?.fetchedAt,
    ...rest,
  });
}
