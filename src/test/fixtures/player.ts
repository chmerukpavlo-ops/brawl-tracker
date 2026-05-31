import type { PlayerStats, BrawlerInfo } from "../../types";

const DEFAULT_BRAWLERS: BrawlerInfo[] = [
  {
    id: 16000000,
    name: "SHELLY",
    power: 11,
    rank: 25,
    trophies: 500,
    highestTrophies: 600,
  },
  {
    id: 16000001,
    name: "COLT",
    power: 9,
    rank: 20,
    trophies: 420,
    highestTrophies: 500,
  },
];

/**
 * Returns a fully-populated `PlayerStats` suitable for any test that
 * needs *a player* without caring about the exact values. Pass
 * `overrides` for the few fields you actually want to control.
 */
export function mockPlayer(overrides: Partial<PlayerStats> = {}): PlayerStats {
  return {
    tag: "#TEST123",
    name: "TestPlayer",
    nameColor: "0xffffffff",
    icon: { id: 28000000 },
    trophies: 1500,
    highestTrophies: 2000,
    expLevel: 50,
    expPoints: 25_000,
    "3vs3Victories": 100,
    soloVictories: 50,
    duoVictories: 30,
    club: { tag: "#CLUB1", name: "Test Club" },
    brawlers: DEFAULT_BRAWLERS,
    isQualifiedFromChampionshipChallenge: false,
    ...overrides,
  };
}
