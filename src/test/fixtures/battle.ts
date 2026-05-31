import type {
  BattleCore,
  BattleEvent,
  BattleLogEntry,
  BattlePlayer,
} from "../../types/battle";

export function mockBattlePlayer(
  overrides: Partial<BattlePlayer> = {}
): BattlePlayer {
  return {
    tag: "#TEST123",
    name: "TestPlayer",
    brawler: { id: 16000000, name: "SHELLY", power: 11, trophies: 500 },
    ...overrides,
  };
}

export function mockBattleEvent(
  overrides: Partial<BattleEvent> = {}
): BattleEvent {
  return {
    id: 15_000_000,
    mode: "brawlBall",
    map: "Sneaky Fields",
    ...overrides,
  };
}

/**
 * Builds a complete battle log entry. Defaults to a 3v3 brawlBall
 * victory; use `overrides.battle` to swap to showdown / draw / etc.
 *
 * Time defaults to a stable ISO-8601 compact value so checksum-style
 * snapshots stay deterministic across CI runs.
 */
export function mockBattle(
  overrides: Omit<Partial<BattleLogEntry>, "battle"> & {
    battle?: Partial<BattleCore>;
  } = {}
): BattleLogEntry {
  const battle: BattleCore = {
    mode: "brawlBall",
    type: "ranked",
    result: "victory",
    duration: 120,
    trophyChange: 8,
    starPlayer: mockBattlePlayer(),
    teams: [
      [mockBattlePlayer()],
      [mockBattlePlayer({ tag: "#OPP1", name: "OpponentOne" })],
    ],
    ...overrides.battle,
  };

  return {
    battleTime: "20260530T020547.000Z",
    event: mockBattleEvent(),
    ...overrides,
    battle,
  };
}

/**
 * A small chronologically-ordered log: 2 wins, 1 loss, 1 draw, 1
 * solo-showdown rank-2 (counts as a win in stats).
 */
export function mockBattleLog(tag = "#TEST123"): BattleLogEntry[] {
  const me = mockBattlePlayer({ tag });
  return [
    mockBattle({
      battleTime: "20260530T020547.000Z",
      battle: { result: "victory", trophyChange: 8, teams: [[me], [mockBattlePlayer({ tag: "#O1" })]] },
    }),
    mockBattle({
      battleTime: "20260530T030547.000Z",
      battle: { result: "defeat", trophyChange: -6, teams: [[me], [mockBattlePlayer({ tag: "#O2" })]] },
    }),
    mockBattle({
      battleTime: "20260530T040547.000Z",
      battle: { result: "draw", trophyChange: 0, teams: [[me], [mockBattlePlayer({ tag: "#O3" })]] },
    }),
    mockBattle({
      battleTime: "20260530T050547.000Z",
      battle: { result: "victory", trophyChange: 10, teams: [[me], [mockBattlePlayer({ tag: "#O4" })]] },
    }),
    mockBattle({
      battleTime: "20260530T060547.000Z",
      event: mockBattleEvent({ mode: "soloShowdown", map: "Cavern Churn" }),
      battle: {
        mode: "soloShowdown",
        type: "ranked",
        result: undefined,
        rank: 2,
        trophyChange: 5,
        teams: undefined,
        players: [me, mockBattlePlayer({ tag: "#A" }), mockBattlePlayer({ tag: "#B" })],
      },
    }),
  ];
}
