import { useQuery } from "@tanstack/react-query";
import { brawlifyApi } from "../../lib/api";
import { ApiError } from "../../lib/queryClient";
import { queryKeys } from "../../lib/queryKeys";
import type {
  BrawlifyBrawler,
  BrawlifyEnvelope,
  BrawlifyEventsPayload,
  BrawlifyGameMode,
  BrawlifyList,
  BrawlifyMap,
} from "../../types/brawlify";

/**
 * Encyclopedia (Brawlify) query hooks.
 *
 * The Brawlify list endpoints are small (~100KB total for brawlers,
 * lighter for modes/maps) and effectively static between game patches,
 * so we cache aggressively. The proxy already caches for 24h on the
 * server; the React Query layer adds an in-memory layer + survives
 * `gcTime` so revisiting the encyclopedia tab is instant.
 *
 * Single-brawler/single-mode reads are derived from the list query
 * via `select`, so the network is hit at most once per session for
 * the whole encyclopedia browsing experience.
 */

const STATIC_STALE_MS = 24 * 60 * 60 * 1000;
const STATIC_GC_MS = 7 * 24 * 60 * 60 * 1000;
const EVENTS_STALE_MS = 5 * 60 * 1000;

export function useBrawlersQuery() {
  return useQuery<BrawlifyEnvelope<BrawlifyList<BrawlifyBrawler>>, ApiError>({
    queryKey: queryKeys.encyclopedia.brawlers(),
    queryFn: ({ signal }) => brawlifyApi.getBrawlers({ signal }),
    staleTime: STATIC_STALE_MS,
    gcTime: STATIC_GC_MS,
    refetchOnWindowFocus: false,
  });
}

/**
 * Find a single brawler by id from the cached list. Triggers the list
 * fetch on first call but reuses it for every subsequent lookup.
 */
export function useBrawlerQuery(id: number | null | undefined) {
  return useQuery<
    BrawlifyEnvelope<BrawlifyList<BrawlifyBrawler>>,
    ApiError,
    BrawlifyBrawler | undefined
  >({
    queryKey: queryKeys.encyclopedia.brawlers(),
    queryFn: ({ signal }) => brawlifyApi.getBrawlers({ signal }),
    staleTime: STATIC_STALE_MS,
    gcTime: STATIC_GC_MS,
    refetchOnWindowFocus: false,
    enabled: typeof id === "number" && Number.isFinite(id),
    select: (envelope) =>
      envelope.data.list.find((b) => b.id === id) ?? undefined,
  });
}

export function useGameModesQuery() {
  return useQuery<BrawlifyEnvelope<BrawlifyList<BrawlifyGameMode>>, ApiError>({
    queryKey: queryKeys.encyclopedia.gameModes(),
    queryFn: ({ signal }) => brawlifyApi.getGameModes({ signal }),
    staleTime: STATIC_STALE_MS,
    gcTime: STATIC_GC_MS,
    refetchOnWindowFocus: false,
  });
}

export function useMapsQuery() {
  return useQuery<BrawlifyEnvelope<BrawlifyList<BrawlifyMap>>, ApiError>({
    queryKey: queryKeys.encyclopedia.maps(),
    queryFn: ({ signal }) => brawlifyApi.getMaps({ signal }),
    staleTime: STATIC_STALE_MS,
    gcTime: STATIC_GC_MS,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetches the *detail* payload for a single map (includes win-rate
 * stats Brawlify computes per-brawler). Use only when opening a map
 * detail sheet — not while rendering the map grid.
 */
export function useMapQuery(id: number | null | undefined) {
  return useQuery<BrawlifyEnvelope<BrawlifyMap>, ApiError>({
    queryKey: queryKeys.encyclopedia.map(typeof id === "number" ? id : 0),
    queryFn: ({ signal }) => brawlifyApi.getMap(id as number, { signal }),
    staleTime: STATIC_STALE_MS,
    gcTime: STATIC_GC_MS,
    refetchOnWindowFocus: false,
    enabled: typeof id === "number" && Number.isFinite(id) && id > 0,
  });
}

/**
 * The active rotation refetches every 5 minutes — countdown timers in
 * the UI take care of the seconds in between.
 */
export function useEventsQuery() {
  return useQuery<BrawlifyEnvelope<BrawlifyEventsPayload>, ApiError>({
    queryKey: queryKeys.encyclopedia.events(),
    queryFn: ({ signal }) => brawlifyApi.getEvents({ signal }),
    staleTime: EVENTS_STALE_MS,
    gcTime: STATIC_GC_MS,
    refetchInterval: EVENTS_STALE_MS,
    refetchOnWindowFocus: true,
  });
}
