/**
 * Brawlify API data shapes.
 *
 * Source: https://api.brawlify.com/v1/{brawlers|gamemodes|maps|events}
 *
 * The Brawlify API is a community-maintained mirror of static
 * Brawl Stars metadata (brawlers, modes, maps, current event
 * rotation). It exposes more fields than we use, but we typed only
 * what the encyclopedia surfaces; everything else we keep loose
 * with `unknown` to avoid coupling to a third-party schema we don't
 * control.
 */

export interface BrawlifyClass {
  id: number;
  name: string;
}

export interface BrawlifyRarity {
  id: number;
  name: string;
  color: string;
}

export interface BrawlifyStarPower {
  id: number;
  name: string;
  path: string;
  version: number;
  description: string;
  descriptionHtml: string;
  imageUrl: string;
  released: boolean;
}

export interface BrawlifyGadget {
  id: number;
  name: string;
  path: string;
  version: number;
  description: string;
  descriptionHtml: string;
  imageUrl: string;
  released: boolean;
}

export interface BrawlifyVideo {
  id?: number;
  title?: string;
  url?: string;
  thumb?: string;
}

export interface BrawlifyBrawler {
  id: number;
  avatarId: number;
  name: string;
  hash: string;
  path: string;
  fankit: string;
  released: boolean;
  version: number;
  link: string;
  imageUrl: string;
  imageUrl2: string;
  imageUrl3: string;
  class: BrawlifyClass;
  rarity: BrawlifyRarity;
  unlock?: number;
  description: string;
  starPowers: BrawlifyStarPower[];
  gadgets: BrawlifyGadget[];
  videos?: BrawlifyVideo[];
}

export interface BrawlifyEnvironment {
  id: number;
  name: string;
  hash: string;
  path: string;
  version: number;
  imageUrl: string;
}

export interface BrawlifyGameMode {
  id: number;
  scId: number;
  name: string;
  hash: string;
  version: number;
  color: string;
  bgColor: string;
  link: string;
  imageUrl: string;
  imageUrl2?: string;
  lastActive?: number;
  disabled: boolean;
  title: string;
  tutorial: string;
  description: string;
  shortDescription: string;
  sort1: number;
  sort2: number;
  TID: string;
}

export interface BrawlifyMapStat {
  /** Brawler id from Brawl Stars (matches BrawlerInfo.id). */
  brawler: number;
  winRate: number;
  useRate: number;
  wins?: number;
  losses?: number;
  draws?: number;
  total?: number;
  totalGames?: number;
  starRate?: number;
}

export interface BrawlifyMap {
  id: number;
  new: boolean;
  disabled: boolean;
  name: string;
  hash: string;
  version: number;
  link: string;
  imageUrl: string;
  credit?: string;
  environment: BrawlifyEnvironment;
  gameMode: BrawlifyGameMode;
  lastActive?: number;
  dataUpdated?: number;
  stats?: BrawlifyMapStat[];
  teamStats?: BrawlifyMapStat[];
}

export interface BrawlifyEventSlot {
  id: number;
  name: string;
  hash: string;
  emoji?: string;
  listAlone?: boolean;
  hideable?: boolean;
  hideForSlot?: number;
}

export interface BrawlifyEventModifier {
  id: number;
  name: string;
  hash?: string;
  scId?: number;
  version?: number;
  duration?: number;
  description?: string;
}

export interface BrawlifyEvent {
  slot: BrawlifyEventSlot;
  predicted: boolean;
  /** ISO-8601 strings; safe to feed into `new Date()`. */
  startTime: string;
  endTime: string;
  reward: number;
  map: BrawlifyMap;
  modifier?: BrawlifyEventModifier;
}

/** Wrapper the proxy returns for every Brawlify endpoint. */
export interface BrawlifyEnvelope<T> {
  data: T;
  fromCache: boolean;
  stale?: boolean;
  cachedAtMs?: number;
}

/** Upstream list shape Brawlify uses for collection endpoints. */
export interface BrawlifyList<T> {
  list: T[];
}

export interface BrawlifyEventsPayload {
  active: BrawlifyEvent[];
  upcoming: BrawlifyEvent[];
}

/** Stable identifiers for cross-entity search results. */
export type EncyclopediaEntityType = "brawler" | "gameMode" | "map";

/** Friendly tagged union used by the cross-type search index. */
export type EncyclopediaSearchHit =
  | { type: "brawler"; id: number; name: string; brawler: BrawlifyBrawler; score: number }
  | { type: "gameMode"; id: number; name: string; mode: BrawlifyGameMode; score: number }
  | { type: "map"; id: number; name: string; map: BrawlifyMap; score: number };
