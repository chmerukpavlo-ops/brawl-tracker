import type { ClubInfo, PlayerStats } from "../types";
import type { BattleLogResponse } from "../types/battle";
import type {
  BrawlifyBrawler,
  BrawlifyEnvelope,
  BrawlifyEventsPayload,
  BrawlifyGameMode,
  BrawlifyList,
  BrawlifyMap,
} from "../types/brawlify";
import { ApiError } from "./queryClient";
import { normalizeTag } from "../utils/playerCache";

/**
 * Tiny `fetch` wrapper that normalizes errors into `ApiError` instances
 * so the query layer can make retry/no-retry decisions on status codes.
 */
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let body: unknown = undefined;
    let message = `HTTP ${response.status}`;
    let suggestion: string | undefined;
    try {
      body = await response.json();
      if (body && typeof body === "object") {
        const b = body as { message?: unknown; suggestion?: unknown };
        if (typeof b.message === "string") message = b.message;
        if (typeof b.suggestion === "string") suggestion = b.suggestion;
      }
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new ApiError(message, response.status, { suggestion, body });
  }
  // Some endpoints (e.g. 204) return no body. Most return JSON.
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface LeaderboardResponse<T> {
  items: T[];
  isDemo?: boolean;
  isDemoFallback?: boolean;
  stale?: boolean;
  warning?: string;
  message?: string;
}

export interface HealthResponse {
  apiTokenConfigured: boolean;
  uptime?: number;
  /** Anything else the backend chooses to return — kept open-ended. */
  [key: string]: unknown;
}

export interface AiCoachRequest {
  playerData: PlayerStats;
  presetId?: string | null;
  brawlerId?: number | null;
  locale?: "uk" | "en";
}

export interface AiCoachResponse {
  advice: string;
  presetId?: string | null;
  brawlerId?: number | null;
}

function tagPath(tag: string): string {
  return `%23${normalizeTag(tag)}`;
}

export const api = {
  getPlayer: (tag: string, opts?: { demo?: boolean; signal?: AbortSignal }) =>
    apiFetch<PlayerStats>(
      `/api/v1/player/${tagPath(tag)}${opts?.demo ? "?demo=true" : ""}`,
      { signal: opts?.signal }
    ),

  getClub: (tag: string, opts?: { demo?: boolean; signal?: AbortSignal }) =>
    apiFetch<ClubInfo>(
      `/api/v1/club/${tagPath(tag)}${opts?.demo ? "?demo=true" : ""}`,
      { signal: opts?.signal }
    ),

  getBattleLog: (
    tag: string,
    opts?: { demo?: boolean; signal?: AbortSignal }
  ) =>
    apiFetch<BattleLogResponse>(
      `/api/v1/player/${tagPath(tag)}/battlelog${opts?.demo ? "?demo=true" : ""}`,
      { signal: opts?.signal }
    ),

  getLeaderboard: <T>(
    kind: "players" | "clubs",
    country: string,
    opts?: { forceFresh?: boolean; signal?: AbortSignal }
  ) =>
    apiFetch<LeaderboardResponse<T>>(
      `/api/v1/leaderboards/${kind}/${country.toUpperCase()}${
        opts?.forceFresh ? "?fresh=true" : ""
      }`,
      { signal: opts?.signal }
    ),

  getHealth: (opts?: { signal?: AbortSignal }) =>
    apiFetch<HealthResponse>("/api/health", { signal: opts?.signal }),

  /**
   * Non-streaming AI coach. The streaming variant is handled separately
   * because chunked SSE doesn't fit the request/response shape of useQuery.
   */
  postAiCoach: (body: AiCoachRequest, opts?: { signal?: AbortSignal }) =>
    apiFetch<AiCoachResponse>("/api/gemini/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: opts?.signal,
    }),
};

export type Api = typeof api;

/**
 * Brawlify proxy client. The server caches each endpoint
 * (24h for static, 5min for events) so the client can call without
 * worrying about upstream rate limits.
 *
 * Each call returns a `BrawlifyEnvelope<T>`, which is the shape our
 * proxy wraps the upstream response in.
 */
export const brawlifyApi = {
  getBrawlers: (opts?: { signal?: AbortSignal }) =>
    apiFetch<BrawlifyEnvelope<BrawlifyList<BrawlifyBrawler>>>(
      "/api/v1/brawlify/brawlers",
      { signal: opts?.signal }
    ),

  getGameModes: (opts?: { signal?: AbortSignal }) =>
    apiFetch<BrawlifyEnvelope<BrawlifyList<BrawlifyGameMode>>>(
      "/api/v1/brawlify/gamemodes",
      { signal: opts?.signal }
    ),

  getMaps: (opts?: { signal?: AbortSignal }) =>
    apiFetch<BrawlifyEnvelope<BrawlifyList<BrawlifyMap>>>(
      "/api/v1/brawlify/maps",
      { signal: opts?.signal }
    ),

  getMap: (id: number, opts?: { signal?: AbortSignal }) =>
    apiFetch<BrawlifyEnvelope<BrawlifyMap>>(
      `/api/v1/brawlify/maps/${id}`,
      { signal: opts?.signal }
    ),

  getEvents: (opts?: { signal?: AbortSignal }) =>
    apiFetch<BrawlifyEnvelope<BrawlifyEventsPayload>>(
      "/api/v1/brawlify/events",
      { signal: opts?.signal }
    ),
};

export type BrawlifyApi = typeof brawlifyApi;
