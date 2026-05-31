/**
 * Battle log types modelled after the Brawl Stars public API:
 * https://developer.brawlstars.com/#/documentation
 *
 * The shape returned by `/v1/players/{tag}/battlelog` is intentionally
 * heterogeneous depending on the mode — 3v3 modes carry `teams` and a
 * `result` while showdown variants carry `players` and a `rank`. We
 * model that with discriminated optional fields plus convenience
 * helpers in `utils/battleHelpers.ts`.
 */

export type BattleResult = "victory" | "defeat" | "draw";

/**
 * Game mode identifiers exactly as the official API emits them
 * (camelCase). Kept open via a string union so unknown future modes
 * still type-check; helpers fall back to "other" rendering.
 */
export type BattleMode =
  | "soloShowdown"
  | "duoShowdown"
  | "trioShowdown"
  | "gemGrab"
  | "brawlBall"
  | "brawlBall5v5"
  | "heist"
  | "bounty"
  | "hotZone"
  | "knockout"
  | "knockout5v5"
  | "siege"
  | "basketBrawl"
  | "volleyBrawl"
  | "duels"
  | "wipeout"
  | "wipeout5v5"
  | "loneStar"
  | "bigGame"
  | "bossFight"
  | "roboRumble"
  | "trophyEscape"
  | "presentPlunder"
  | "snowtelThieves"
  | "payload"
  | "lastStand"
  | "unknown"
  // Keep open-ended so unknown new modes still parse.
  | (string & {});

/** Match type / queue. */
export type BattleType =
  | "ranked"
  | "soloRanked"
  | "friendly"
  | "challenge"
  | "championshipChallenge"
  | "teamRanked"
  | "club"
  | (string & {});

export interface BattleBrawler {
  id: number;
  name: string;
  power: number;
  trophies: number;
}

export interface BattlePlayer {
  tag: string;
  name: string;
  brawler: BattleBrawler;
}

export type BattleTeam = BattlePlayer[];

/** Raw `battle` object exactly as the API returns it. */
export interface BattleCore {
  mode: BattleMode;
  type: BattleType;
  /** 3v3 outcome — "victory" / "defeat" / "draw". */
  result?: BattleResult;
  /** Showdown final position (1 = top). */
  rank?: number;
  /** Seconds. */
  duration?: number;
  trophyChange?: number;
  starPlayer?: BattlePlayer | null;
  /** Teams array for 3v3 / duo / trio modes. */
  teams?: BattleTeam[];
  /** Flat list of players for showdown / duels modes. */
  players?: BattlePlayer[];
}

export interface BattleEvent {
  /** Numeric event id used to construct Brawlify map image URLs. */
  id: number;
  mode: BattleMode;
  /** Localized map name (English in API responses). */
  map: string | null;
}

export interface BattleLogEntry {
  /**
   * Compact ISO timestamp from API ("20260530T020547.000Z"). Use
   * `parseBattleTime` from `battleHelpers` to obtain a JS `Date`.
   */
  battleTime: string;
  event: BattleEvent;
  battle: BattleCore;
}

/** Response shape proxied by `/api/v1/player/:tag/battlelog`. */
export interface BattleLogResponse {
  items: BattleLogEntry[];
  /** True when items are from the demo generator (no API token). */
  isDemo?: boolean;
  /** Set when proxy returned cached data (rare for battle log). */
  fromCache?: boolean;
}

/** Aggregated stats produced by `computeBattleStats` for the header. */
export interface BattleAggregateStats {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  /** showdown 1-3 are counted as wins, 4+ as losses for win-rate. */
  winRate: number;
  trophyDelta: number;
  bestWinStreak: number;
  currentStreak: { kind: BattleResult | null; length: number };
  /** Distinct mode IDs encountered. */
  modesPlayed: number;
  /** Distinct brawler IDs the user used. */
  brawlersUsed: number;
}

/** Filter state for the battle log screen. */
export interface BattleFilterState {
  mode: BattleMode | null;
  result: BattleResult | null;
  brawlerId: number | null;
}

export const EMPTY_FILTERS: BattleFilterState = {
  mode: null,
  result: null,
  brawlerId: null,
};
