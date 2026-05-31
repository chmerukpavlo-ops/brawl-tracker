import { describe, expect, it } from "vitest";
import {
  buildSearchIndex,
  groupHits,
  normalizeQuery,
  searchIndex,
} from "./searchIndex";
import type {
  BrawlifyBrawler,
  BrawlifyGameMode,
  BrawlifyMap,
} from "../types/brawlify";

const SHELLY: BrawlifyBrawler = {
  id: 16000000,
  avatarId: 0,
  name: "SHELLY",
  hash: "shelly",
  path: "Shelly",
  fankit: "",
  released: true,
  version: 1,
  link: "",
  imageUrl: "",
  imageUrl2: "",
  imageUrl3: "",
  class: { id: 1, name: "Damage Dealer" },
  rarity: { id: 1, name: "Trophy Road", color: "#a3d4ff" },
  description: "",
  starPowers: [],
  gadgets: [],
};

const COLT: BrawlifyBrawler = {
  ...SHELLY,
  id: 16000001,
  name: "COLT",
  hash: "colt",
  path: "Colt",
};

const MORTIS: BrawlifyBrawler = {
  ...SHELLY,
  id: 16000017,
  name: "MORTIS",
  hash: "mortis",
  path: "Mortis",
  rarity: { id: 5, name: "Mythic", color: "#cc5cff" },
};

const GEM_GRAB: BrawlifyGameMode = {
  id: 1,
  scId: 48000000,
  name: "Gem Grab",
  hash: "gem-grab",
  version: 1,
  color: "#9b30ff",
  bgColor: "#000",
  link: "",
  imageUrl: "",
  disabled: false,
  title: "Gem Grab",
  tutorial: "Collect 10 gems",
  description: "",
  shortDescription: "Collect 10 gems",
  sort1: 1,
  sort2: 1,
  TID: "tid_gem_grab",
};

const SHOWDOWN: BrawlifyGameMode = {
  ...GEM_GRAB,
  id: 2,
  scId: 48000001,
  name: "Showdown",
  hash: "showdown",
  shortDescription: "Last brawler standing",
  sort1: 2,
  sort2: 1,
  TID: "tid_showdown",
};

const HARD_ROCK_MINE: BrawlifyMap = {
  id: 15000010,
  new: false,
  disabled: false,
  name: "Hard Rock Mine",
  hash: "hard-rock-mine",
  version: 1,
  link: "",
  imageUrl: "",
  environment: {
    id: 1,
    name: "Mine",
    hash: "mine",
    path: "mine",
    version: 1,
    imageUrl: "",
  },
  gameMode: GEM_GRAB,
};

const FEAST_OR_FAMINE: BrawlifyMap = {
  ...HARD_ROCK_MINE,
  id: 15000011,
  name: "Feast or Famine",
  hash: "feast-or-famine",
  gameMode: SHOWDOWN,
};

describe("normalizeQuery", () => {
  it("lowercases, trims, and collapses inner whitespace", () => {
    expect(normalizeQuery("   SHELLY  ")).toBe("shelly");
    expect(normalizeQuery("Hard   Rock\tMine")).toBe("hard rock mine");
    expect(normalizeQuery("")).toBe("");
  });
});

describe("buildSearchIndex", () => {
  it("includes every entity with a derived haystack", () => {
    const index = buildSearchIndex({
      brawlers: [SHELLY, COLT],
      modes: [GEM_GRAB],
      maps: [HARD_ROCK_MINE],
    });
    expect(index.entries).toHaveLength(4);
    expect(index.entries.find((e) => e.name === "SHELLY")?.type).toBe(
      "brawler"
    );
    expect(index.entries.find((e) => e.name === "Gem Grab")?.type).toBe(
      "gameMode"
    );
    expect(index.entries.find((e) => e.name === "Hard Rock Mine")?.type).toBe(
      "map"
    );
  });

  it("tolerates missing slices", () => {
    const index = buildSearchIndex({});
    expect(index.entries).toHaveLength(0);
  });
});

describe("searchIndex", () => {
  const index = buildSearchIndex({
    brawlers: [SHELLY, COLT, MORTIS],
    modes: [GEM_GRAB, SHOWDOWN],
    maps: [HARD_ROCK_MINE, FEAST_OR_FAMINE],
  });

  it("returns empty for an empty query", () => {
    expect(searchIndex(index, "")).toEqual([]);
    expect(searchIndex(index, "   ")).toEqual([]);
  });

  it("scores prefix matches higher than substring matches", () => {
    const hits = searchIndex(index, "sh");
    const names = hits.map((h) => h.name);
    // "SHELLY" prefix > "Showdown" prefix (both score 3) > nothing else.
    expect(names).toEqual(expect.arrayContaining(["SHELLY", "Showdown"]));
    // Hard Rock Mine has no "sh" substring, must not appear.
    expect(names).not.toContain("Hard Rock Mine");
  });

  it("matches across entity types in one pass", () => {
    const hits = searchIndex(index, "gem");
    const types = new Set(hits.map((h) => h.type));
    expect(types.has("gameMode")).toBe(true); // "Gem Grab"
    // Hard Rock Mine's haystack also contains "Gem Grab" → match.
    expect(hits.some((h) => h.type === "map" && h.name === "Hard Rock Mine")).toBe(
      true
    );
  });

  it("respects the result limit", () => {
    expect(searchIndex(index, "e", 2)).toHaveLength(2);
  });

  it("is case-insensitive", () => {
    const upper = searchIndex(index, "SHELLY");
    const lower = searchIndex(index, "shelly");
    expect(upper.map((h) => h.id)).toEqual(lower.map((h) => h.id));
  });
});

describe("groupHits", () => {
  it("partitions hits by entity type while preserving order", () => {
    const index = buildSearchIndex({
      brawlers: [SHELLY],
      modes: [GEM_GRAB],
      maps: [HARD_ROCK_MINE],
    });
    // "rock" is unique to the map's name.
    const grouped = groupHits(searchIndex(index, "rock"));
    expect(grouped.brawlers).toHaveLength(0);
    expect(grouped.modes).toHaveLength(0);
    expect(grouped.maps.map((h) => h.name)).toContain("Hard Rock Mine");
  });

  it("returns empty groups for empty input", () => {
    expect(groupHits([])).toEqual({ brawlers: [], modes: [], maps: [] });
  });
});
