import { describe, it, expect } from "vitest";
import {
  parseBattleTime,
  computeResult,
  computeBattleStats,
  groupByMode,
  distinctModes,
  distinctBrawlers,
  isAnonymousTag,
  findMyPlayerInBattle,
  splitTeams,
} from "./battleHelpers";
import { mockBattle, mockBattlePlayer, mockBattleEvent, mockBattleLog } from "../test/fixtures/battle";

describe("parseBattleTime", () => {
  it("parses Brawl Stars compact ISO format", () => {
    const date = parseBattleTime("20260530T020547.000Z");
    expect(date.toISOString()).toBe("2026-05-30T02:05:47.000Z");
  });

  it("falls back to Date() for non-compact strings", () => {
    const date = parseBattleTime("2026-05-30T02:05:47.000Z");
    expect(date.toISOString()).toBe("2026-05-30T02:05:47.000Z");
  });

  it("falls back to epoch (Date(0)) for clearly malformed input", () => {
    // The implementation deliberately swallows invalid input so the
    // UI never has to handle NaN — it just sorts to the bottom.
    const date = parseBattleTime("not-a-date-zzz");
    expect(date.getTime()).toBe(0);
  });
});

describe("computeResult", () => {
  it("returns the explicit 3v3 result when present", () => {
    expect(computeResult(mockBattle({ battle: { result: "victory" } }))).toBe("victory");
    expect(computeResult(mockBattle({ battle: { result: "defeat" } }))).toBe("defeat");
    expect(computeResult(mockBattle({ battle: { result: "draw" } }))).toBe("draw");
  });

  it("treats showdown ranks 1–3 as victories, 4+ as defeats", () => {
    for (const rank of [1, 2, 3]) {
      expect(
        computeResult(mockBattle({ battle: { result: undefined, rank, mode: "soloShowdown" } }))
      ).toBe("victory");
    }
    for (const rank of [4, 5, 8]) {
      expect(
        computeResult(mockBattle({ battle: { result: undefined, rank, mode: "soloShowdown" } }))
      ).toBe("defeat");
    }
  });

  it("falls back to draw when neither result nor rank is set", () => {
    expect(
      computeResult(mockBattle({ battle: { result: undefined, rank: undefined } }))
    ).toBe("draw");
  });
});

describe("findMyPlayerInBattle", () => {
  const me = mockBattlePlayer({ tag: "#ME", name: "Me" });

  it("finds the player inside `teams`", () => {
    const entry = mockBattle({ battle: { teams: [[me], [mockBattlePlayer({ tag: "#OPP" })]] } });
    expect(findMyPlayerInBattle(entry, "#ME")?.tag).toBe("#ME");
  });

  it("finds the player inside `players` (showdown)", () => {
    const entry = mockBattle({
      event: mockBattleEvent({ mode: "soloShowdown" }),
      battle: {
        mode: "soloShowdown",
        teams: undefined,
        players: [me, mockBattlePlayer({ tag: "#A" })],
      },
    });
    expect(findMyPlayerInBattle(entry, "#ME")?.tag).toBe("#ME");
  });

  it("is case- and #-insensitive", () => {
    const entry = mockBattle({ battle: { teams: [[me], []] } });
    expect(findMyPlayerInBattle(entry, "me")?.tag).toBe("#ME");
    expect(findMyPlayerInBattle(entry, "ME")?.tag).toBe("#ME");
  });

  it("returns null if the tag isn't in the battle", () => {
    const entry = mockBattle({ battle: { teams: [[mockBattlePlayer({ tag: "#X" })], []] } });
    expect(findMyPlayerInBattle(entry, "#NOTHERE")).toBeNull();
  });
});

describe("splitTeams", () => {
  it("splits 3v3 into my and opponent teams", () => {
    const me = mockBattlePlayer({ tag: "#ME" });
    const opp = mockBattlePlayer({ tag: "#OPP" });
    const entry = mockBattle({ battle: { teams: [[opp], [me]] } });
    const split = splitTeams(entry, "#ME");
    expect(split?.my[0].tag).toBe("#ME");
    expect(split?.opponents[0].tag).toBe("#OPP");
  });

  it("returns null for showdown (no teams)", () => {
    const entry = mockBattle({ battle: { teams: undefined } });
    expect(splitTeams(entry, "#ME")).toBeNull();
  });
});

describe("computeBattleStats", () => {
  it("tallies wins, losses, draws and trophyDelta", () => {
    const entries = mockBattleLog("#ME");
    const stats = computeBattleStats(entries, "#ME");
    // mockBattleLog: 2 wins + 1 loss + 1 draw + 1 showdown rank 2
    // — but showdown is counted as a win in win-rate.
    expect(stats.total).toBe(5);
    expect(stats.wins).toBeGreaterThanOrEqual(2);
    expect(stats.losses).toBeGreaterThanOrEqual(1);
    expect(stats.draws).toBeGreaterThanOrEqual(1);
    expect(stats.trophyDelta).toBe(8 + (-6) + 0 + 10 + 5);
  });

  it("returns zero-stats for an empty list", () => {
    const stats = computeBattleStats([], "#ME");
    expect(stats.total).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.trophyDelta).toBe(0);
  });
});

describe("groupByMode + distinctModes", () => {
  it("groups entries by mode", () => {
    const groups = groupByMode(mockBattleLog());
    expect([...groups.keys()]).toEqual(expect.arrayContaining(["brawlBall", "soloShowdown"]));
  });

  it("sorts distinct modes by frequency descending", () => {
    const entries = [
      mockBattle({ battle: { mode: "brawlBall" } }),
      mockBattle({ battle: { mode: "brawlBall" } }),
      mockBattle({ battle: { mode: "gemGrab" } }),
    ];
    expect(distinctModes(entries)).toEqual(["brawlBall", "gemGrab"]);
  });
});

describe("distinctBrawlers", () => {
  it("collects unique brawlers the player used", () => {
    const me = "#ME";
    const entries = [
      mockBattle({
        battle: {
          teams: [
            [mockBattlePlayer({ tag: me, brawler: { id: 16000000, name: "SHELLY", power: 11, trophies: 500 } })],
            [],
          ],
        },
      }),
      mockBattle({
        battle: {
          teams: [
            [mockBattlePlayer({ tag: me, brawler: { id: 16000001, name: "COLT", power: 11, trophies: 500 } })],
            [],
          ],
        },
      }),
    ];
    const brawlers = distinctBrawlers(entries, me);
    expect(brawlers.map((b) => b.name)).toEqual(expect.arrayContaining(["SHELLY", "COLT"]));
  });
});

describe("isAnonymousTag", () => {
  it("flags undefined and short tags", () => {
    expect(isAnonymousTag(undefined)).toBe(true);
    expect(isAnonymousTag("#XX")).toBe(true);
  });

  it("flags placeholder-X tags from the API", () => {
    expect(isAnonymousTag("#XXXXXX")).toBe(true);
    expect(isAnonymousTag("XXXX")).toBe(true);
  });

  it("returns false for real-looking tags", () => {
    expect(isAnonymousTag("#ABC123")).toBe(false);
  });
});
