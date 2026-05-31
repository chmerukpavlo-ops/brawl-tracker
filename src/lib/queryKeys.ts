import { normalizeTag as normalizePlayerTag } from "../utils/playerCache";

/** Normalize once at the boundary so cache keys are always deterministic. */
const norm = (tag: string): string => normalizePlayerTag(tag);

/**
 * Centralized query-key factory. Use these helpers instead of inline arrays
 * so that invalidation/prefetching can target precisely the right slice of
 * cache without typo-prone string literals.
 *
 * ```
 * qc.invalidateQueries({ queryKey: queryKeys.players() });   // all players
 * qc.invalidateQueries({ queryKey: queryKeys.player(tag) }); // one player
 * ```
 */
export const queryKeys = {
  all: ["brawl"] as const,

  // Player slice.
  players: () => [...queryKeys.all, "player"] as const,
  player: (tag: string, opts?: { demo?: boolean }) =>
    [...queryKeys.players(), norm(tag), { demo: !!opts?.demo }] as const,

  // Club slice.
  clubs: () => [...queryKeys.all, "club"] as const,
  club: (tag: string, opts?: { demo?: boolean }) =>
    [...queryKeys.clubs(), norm(tag), { demo: !!opts?.demo }] as const,

  // Battle log slice.
  battleLogs: () => [...queryKeys.all, "battleLog"] as const,
  battleLog: (tag: string, opts?: { demo?: boolean }) =>
    [...queryKeys.battleLogs(), norm(tag), { demo: !!opts?.demo }] as const,

  // Leaderboard slice (per kind + country).
  leaderboards: () => [...queryKeys.all, "leaderboard"] as const,
  leaderboard: (kind: "players" | "clubs", country: string) =>
    [...queryKeys.leaderboards(), kind, country.toUpperCase()] as const,

  // AI coach — cached *after* a streaming completion so other components
  // can reuse the same advice without re-asking Gemini.
  aiCoach: (tag: string, presetId?: string | null) =>
    [...queryKeys.all, "ai", "coach", norm(tag), presetId ?? "generic"] as const,

  // Backend health/uptime.
  health: () => [...queryKeys.all, "health"] as const,

  // Encyclopedia (Brawlify-backed) — see src/lib/api.ts brawlifyApi.
  // Static slices use long staleTimes; events refetch every 5 min.
  encyclopedia: {
    root: () => [...queryKeys.all, "encyclopedia"] as const,
    brawlers: () => [...queryKeys.all, "encyclopedia", "brawlers"] as const,
    gameModes: () => [...queryKeys.all, "encyclopedia", "gameModes"] as const,
    maps: () => [...queryKeys.all, "encyclopedia", "maps"] as const,
    map: (id: number) =>
      [...queryKeys.all, "encyclopedia", "map", id] as const,
    events: () => [...queryKeys.all, "encyclopedia", "events"] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
