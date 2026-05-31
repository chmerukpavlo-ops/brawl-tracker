/**
 * Cross-entity search index for the Encyclopedia.
 *
 * Brawlify lists are small (~80 brawlers, ~30 modes, ~150 maps), so we
 * skip a heavy fuzzy library and use a deterministic substring scorer:
 *   - exact prefix match  → 3
 *   - word-start match    → 2
 *   - substring match     → 1
 *   - no match            → 0
 *
 * Entries are derived once via {@link buildSearchIndex} and queried via
 * {@link searchIndex}. Both functions are pure; results are stable for
 * the same input which makes them trivial to memoise with `useMemo`.
 */

import type {
  BrawlifyBrawler,
  BrawlifyGameMode,
  BrawlifyMap,
  EncyclopediaSearchHit,
} from "../types/brawlify";

interface SearchEntry {
  type: "brawler" | "gameMode" | "map";
  id: number;
  name: string;
  /** Lowercased haystack — name plus extra keywords (mode/env name). */
  haystack: string;
  raw: BrawlifyBrawler | BrawlifyGameMode | BrawlifyMap;
}

export interface BuildSearchIndexInput {
  brawlers?: BrawlifyBrawler[];
  modes?: BrawlifyGameMode[];
  maps?: BrawlifyMap[];
}

export interface SearchIndex {
  entries: SearchEntry[];
}

function pushBrawler(out: SearchEntry[], brawler: BrawlifyBrawler): void {
  out.push({
    type: "brawler",
    id: brawler.id,
    name: brawler.name,
    haystack: [
      brawler.name,
      brawler.class?.name ?? "",
      brawler.rarity?.name ?? "",
    ]
      .join(" ")
      .toLowerCase(),
    raw: brawler,
  });
}

function pushMode(out: SearchEntry[], mode: BrawlifyGameMode): void {
  out.push({
    type: "gameMode",
    id: mode.id,
    name: mode.name,
    haystack: [mode.name, mode.title ?? "", mode.shortDescription ?? ""]
      .join(" ")
      .toLowerCase(),
    raw: mode,
  });
}

function pushMap(out: SearchEntry[], map: BrawlifyMap): void {
  out.push({
    type: "map",
    id: map.id,
    name: map.name,
    haystack: [
      map.name,
      map.gameMode?.name ?? "",
      map.environment?.name ?? "",
    ]
      .join(" ")
      .toLowerCase(),
    raw: map,
  });
}

export function buildSearchIndex(input: BuildSearchIndexInput): SearchIndex {
  const entries: SearchEntry[] = [];
  input.brawlers?.forEach((b) => pushBrawler(entries, b));
  input.modes?.forEach((m) => pushMode(entries, m));
  input.maps?.forEach((m) => pushMap(entries, m));
  return { entries };
}

/** Normalize a query: lowercase, trim, collapse whitespace. */
export function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

function scoreEntry(haystack: string, name: string, q: string): number {
  if (!q) return 0;
  const lowerName = name.toLowerCase();
  if (lowerName.startsWith(q)) return 3;
  // Match at the start of any word in the haystack.
  if (
    haystack === q ||
    haystack.startsWith(`${q} `) ||
    haystack.includes(` ${q}`)
  ) {
    return 2;
  }
  if (haystack.includes(q)) return 1;
  return 0;
}

/**
 * Returns up to `limit` hits sorted by descending score, then by name.
 * Empty query returns an empty array (caller decides what "no query"
 * means visually — usually the unfiltered grid).
 */
export function searchIndex(
  index: SearchIndex,
  rawQuery: string,
  limit = 30
): EncyclopediaSearchHit[] {
  const q = normalizeQuery(rawQuery);
  if (!q) return [];

  const hits: EncyclopediaSearchHit[] = [];
  for (const entry of index.entries) {
    const score = scoreEntry(entry.haystack, entry.name, q);
    if (score === 0) continue;
    if (entry.type === "brawler") {
      hits.push({
        type: "brawler",
        id: entry.id,
        name: entry.name,
        brawler: entry.raw as BrawlifyBrawler,
        score,
      });
    } else if (entry.type === "gameMode") {
      hits.push({
        type: "gameMode",
        id: entry.id,
        name: entry.name,
        mode: entry.raw as BrawlifyGameMode,
        score,
      });
    } else {
      hits.push({
        type: "map",
        id: entry.id,
        name: entry.name,
        map: entry.raw as BrawlifyMap,
        score,
      });
    }
    if (hits.length >= limit * 4) break; // stop early; we'll trim post-sort
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  return hits.slice(0, limit);
}

/** Group hits by entity type, preserving sort order from {@link searchIndex}. */
export interface GroupedSearchHits {
  brawlers: EncyclopediaSearchHit[];
  modes: EncyclopediaSearchHit[];
  maps: EncyclopediaSearchHit[];
}

export function groupHits(hits: EncyclopediaSearchHit[]): GroupedSearchHits {
  const brawlers: EncyclopediaSearchHit[] = [];
  const modes: EncyclopediaSearchHit[] = [];
  const maps: EncyclopediaSearchHit[] = [];
  for (const hit of hits) {
    if (hit.type === "brawler") brawlers.push(hit);
    else if (hit.type === "gameMode") modes.push(hit);
    else maps.push(hit);
  }
  return { brawlers, modes, maps };
}
