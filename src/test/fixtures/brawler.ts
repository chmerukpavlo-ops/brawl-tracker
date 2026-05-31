import type {
  BrawlifyBrawler,
  BrawlifyClass,
  BrawlifyRarity,
} from "../../types/brawlify";

/**
 * Brawlify-shaped fixtures used by stories and isolated tests. Mirrors
 * the production payload closely enough that a story can swap the
 * fixture for the real API response without breaking layout.
 *
 * Live next to the production `brawlify` types so any schema change
 * fails the type-check immediately.
 */

const RARITY: Record<string, BrawlifyRarity> = {
  common: { id: 1, name: "Common", color: "#94a3b8" },
  rare: { id: 2, name: "Rare", color: "#22c55e" },
  superRare: { id: 3, name: "Super Rare", color: "#3b82f6" },
  epic: { id: 4, name: "Epic", color: "#a855f7" },
  mythic: { id: 5, name: "Mythic", color: "#ef4444" },
  legendary: { id: 6, name: "Legendary", color: "#facc15" },
};

const CLASSES: Record<string, BrawlifyClass> = {
  damage: { id: 1, name: "Damage Dealer" },
  tank: { id: 2, name: "Tank" },
  marksman: { id: 3, name: "Marksman" },
  artillery: { id: 4, name: "Artillery" },
  controller: { id: 5, name: "Controller" },
  assassin: { id: 6, name: "Assassin" },
  support: { id: 7, name: "Support" },
};

interface BrawlerOverrides {
  id?: number;
  name?: string;
  imageUrl?: string;
  rarity?: BrawlifyRarity;
  class?: BrawlifyClass;
}

export function mockBrawler(overrides: BrawlerOverrides = {}): BrawlifyBrawler {
  return {
    id: overrides.id ?? 16000000,
    avatarId: 28000000,
    name: overrides.name ?? "Shelly",
    hash: "shelly",
    path: "shelly",
    fankit: "",
    released: true,
    version: 1,
    link: "https://brawlify.com/brawlers/detail/Shelly",
    imageUrl:
      overrides.imageUrl ?? "https://cdn.brawlify.com/brawlers/borderless/16000000.png",
    imageUrl2: "",
    imageUrl3: "",
    class: overrides.class ?? CLASSES.damage,
    rarity: overrides.rarity ?? RARITY.common,
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    starPowers: [],
    gadgets: [],
  };
}

export const BRAWLER_FIXTURES = {
  shelly: mockBrawler({ id: 16000000, name: "Shelly", rarity: RARITY.common }),
  colt: mockBrawler({
    id: 16000001,
    name: "Colt",
    rarity: RARITY.common,
    class: CLASSES.marksman,
    imageUrl: "https://cdn.brawlify.com/brawlers/borderless/16000001.png",
  }),
  jacky: mockBrawler({
    id: 16000044,
    name: "Jacky",
    rarity: RARITY.epic,
    class: CLASSES.tank,
    imageUrl: "https://cdn.brawlify.com/brawlers/borderless/16000044.png",
  }),
  amber: mockBrawler({
    id: 16000038,
    name: "Amber",
    rarity: RARITY.legendary,
    class: CLASSES.damage,
    imageUrl: "https://cdn.brawlify.com/brawlers/borderless/16000038.png",
  }),
  spike: mockBrawler({
    id: 16000017,
    name: "Spike",
    rarity: RARITY.legendary,
    class: CLASSES.damage,
    imageUrl: "https://cdn.brawlify.com/brawlers/borderless/16000017.png",
  }),
  crow: mockBrawler({
    id: 16000018,
    name: "Crow",
    rarity: RARITY.mythic,
    class: CLASSES.assassin,
    imageUrl: "https://cdn.brawlify.com/brawlers/borderless/16000018.png",
  }),
};

export { RARITY as BRAWLER_RARITIES, CLASSES as BRAWLER_CLASSES };
