import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { ClubInfo } from "../../types";
import { api } from "../../lib/api";
import { ApiError } from "../../lib/queryClient";
import { queryKeys } from "../../lib/queryKeys";
import { normalizeClubTag } from "../../utils/clubMetrics";

const CLUB_STALE_MS = 5 * 60_000;
const CLUB_CACHE_PREFIX = "brawl_club_cache_";

interface CachedClub {
  data: ClubInfo;
  timestamp: number;
}

function loadCachedClub(tag: string): CachedClub | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CLUB_CACHE_PREFIX + tag);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedClub | null;
    if (!parsed?.data || typeof parsed.timestamp !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedClub(tag: string, data: ClubInfo): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      CLUB_CACHE_PREFIX + tag,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    /* quota ignored */
  }
}

type ClubQueryOptions = {
  demo?: boolean;
  enabled?: boolean;
} & Pick<
  UseQueryOptions<ClubInfo, ApiError>,
  "refetchOnWindowFocus" | "staleTime"
>;

export function useClubQuery(
  tag: string | null | undefined,
  options: ClubQueryOptions = {}
) {
  const { demo = false, enabled = true, ...rest } = options;
  const normTag = tag ? normalizeClubTag(tag) : "";
  const isEnabled = !!normTag && enabled;

  return useQuery<ClubInfo, ApiError>({
    queryKey: queryKeys.club(normTag, { demo }),
    queryFn: async ({ signal }) => {
      const data = await api.getClub(normTag, { demo, signal });
      saveCachedClub(normTag, data);
      return data;
    },
    enabled: isEnabled,
    staleTime: CLUB_STALE_MS,
    initialData: () => loadCachedClub(normTag)?.data,
    initialDataUpdatedAt: () => loadCachedClub(normTag)?.timestamp,
    ...rest,
  });
}
