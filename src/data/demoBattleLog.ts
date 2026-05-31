import type {
  BattleBrawler,
  BattleLogEntry,
  BattleMode,
  BattlePlayer,
  BattleResult,
  BattleTeam,
} from "../types/battle";
import type { PlayerStats } from "../types";

/**
 * Deterministic seeded battle log generator. Given the same player
 * tag, we always synthesize the same set of battles, so the UI never
 * jumps around when offline / in demo mode. Distribution is tuned to
 * look realistic: ~55% wins, mix of modes, recent battles within the
 * last ~5 days.
 */

const MODE_POOL: BattleMode[] = [
  "gemGrab",
  "brawlBall",
  "knockout",
  "bounty",
  "heist",
  "hotZone",
  "soloShowdown",
  "duoShowdown",
  "wipeout",
];

const SHOWDOWN_MODES = new Set<BattleMode>([
  "soloShowdown",
  "duoShowdown",
  "trioShowdown",
]);

const MAPS_BY_MODE: Record<string, string[]> = {
  gemGrab: ["Hard Rock Mine", "Crystal Arcade", "Undermine"],
  brawlBall: ["Sneaky Fields", "Beach Ball", "Backyard Bowl"],
  knockout: ["Goldarm Gulch", "Out in the Open", "Belle's Rock"],
  bounty: ["Hideout", "Snake Prairie", "Layer Cake"],
  heist: ["Safe Zone", "Hot Potato", "Pit Stop"],
  hotZone: ["Ring of Fire", "Open Business", "Parallel Plays"],
  soloShowdown: ["Skull Creek", "Cavern Churn", "Feast or Famine"],
  duoShowdown: ["Acute Angle", "Double Trouble", "Healthy Middle"],
  wipeout: ["Out in the Open", "Triple Dribble"],
};

const BRAWLER_POOL: BattleBrawler[] = [
  { id: 16000000, name: "SHELLY", power: 9, trophies: 540 },
  { id: 16000003, name: "COLT", power: 10, trophies: 720 },
  { id: 16000005, name: "BROCK", power: 9, trophies: 480 },
  { id: 16000008, name: "EL PRIMO", power: 11, trophies: 820 },
  { id: 16000011, name: "BARLEY", power: 10, trophies: 690 },
  { id: 16000014, name: "MORTIS", power: 11, trophies: 1010 },
  { id: 16000020, name: "PIPER", power: 10, trophies: 870 },
  { id: 16000024, name: "SPIKE", power: 11, trophies: 1100 },
  { id: 16000028, name: "EDGAR", power: 10, trophies: 750 },
  { id: 16000033, name: "STU", power: 11, trophies: 960 },
];

const NAME_POOL = [
  "DragonSlayer",
  "NoobMaster",
  "Phoenix",
  "Vortex",
  "Stormcaller",
  "ShadowFox",
  "BrawlKing",
  "Tigress",
  "Quasar",
  "RogueOne",
  "Mystic",
  "Falcon",
  "NinjaPro",
  "Aurora",
  "Zenith",
];

// xorshift32 — small, fast, deterministic enough for visuals.
function makeRng(seedString: string): () => number {
  let s = 0;
  for (let i = 0; i < seedString.length; i++) {
    s = (s * 31 + seedString.charCodeAt(i)) | 0;
  }
  let state = s || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    // Normalize to [0, 1).
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function generateTag(rng: () => number): string {
  const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let t = "#";
  for (let i = 0; i < 8; i++) t += ALPHA[Math.floor(rng() * ALPHA.length)];
  return t;
}

/**
 * Format a JS Date as the compact ISO that the Brawl Stars API uses,
 * e.g. "20260530T020547.000Z".
 */
function formatBattleTime(d: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}.000Z`
  );
}

function buildPlayer(
  rng: () => number,
  tag: string,
  name: string,
  brawler?: BattleBrawler
): BattlePlayer {
  return {
    tag,
    name,
    brawler: brawler ?? pick(rng, BRAWLER_POOL),
  };
}

interface DemoOptions {
  /** Number of battles to generate; capped to 25 by API anyway. */
  count?: number;
  /** "Now" reference — useful for tests. */
  nowMs?: number;
}

/**
 * Generates a deterministic demo battle log for any player.
 * Mixes 3v3, showdown and duo formats. Always includes the player
 * themselves as one of the participants so per-brawler / per-result
 * stats are meaningful.
 */
export function generateDemoBattleLog(
  player: Pick<PlayerStats, "tag" | "name"> & { brawlers?: PlayerStats["brawlers"] },
  options: DemoOptions = {}
): BattleLogEntry[] {
  const count = Math.min(options.count ?? 25, 25);
  const now = options.nowMs ?? Date.now();
  const rng = makeRng(`bl::${player.tag}`);

  // Build the user's own brawler pool (prefer real brawlers when known)
  // so per-brawler analytics line up with their profile.
  const myBrawlers: BattleBrawler[] = (player.brawlers ?? []).slice(0, 8).map((b) => ({
    id: b.id,
    name: b.name,
    power: b.power,
    trophies: b.trophies,
  }));
  const myPool = myBrawlers.length > 0 ? myBrawlers : BRAWLER_POOL.slice(0, 5);

  const entries: BattleLogEntry[] = [];
  // Battles roughly every 30–110 minutes apart, walking backward.
  let cursor = now;
  for (let i = 0; i < count; i++) {
    cursor -= (30 + Math.floor(rng() * 80)) * 60 * 1000;
    const mode = pick(rng, MODE_POOL);
    const map = pick(rng, MAPS_BY_MODE[mode] ?? ["Unknown Map"]);
    const isShowdown = SHOWDOWN_MODES.has(mode);
    const myBrawler = pick(rng, myPool);
    const me = buildPlayer(rng, player.tag, player.name || "You", myBrawler);

    if (isShowdown) {
      // Showdown: rank 1–10 with skewed bias to 2–5.
      const rank = Math.max(1, Math.min(10, Math.floor(rng() * 10) + 1));
      const players: BattlePlayer[] = [me];
      const fillCount = mode === "duoShowdown" ? 9 : 9;
      for (let j = 0; j < fillCount; j++) {
        players.push(
          buildPlayer(rng, generateTag(rng), pick(rng, NAME_POOL))
        );
      }
      const trophyChange = rank <= 3 ? 5 + Math.floor(rng() * 6) : -(3 + Math.floor(rng() * 5));
      entries.push({
        battleTime: formatBattleTime(new Date(cursor)),
        event: { id: 15000000 + Math.floor(rng() * 99), mode, map },
        battle: {
          mode,
          type: "ranked",
          rank,
          duration: 90 + Math.floor(rng() * 120),
          trophyChange,
          players,
        },
      });
    } else {
      // 3v3 — bias towards a 55% win rate so analytics look believable.
      const result: BattleResult =
        rng() < 0.55 ? "victory" : rng() < 0.85 ? "defeat" : "draw";
      const trophyChange =
        result === "victory"
          ? 6 + Math.floor(rng() * 6)
          : result === "defeat"
            ? -(2 + Math.floor(rng() * 6))
            : 0;
      const myTeam: BattleTeam = [
        me,
        buildPlayer(rng, generateTag(rng), pick(rng, NAME_POOL)),
        buildPlayer(rng, generateTag(rng), pick(rng, NAME_POOL)),
      ];
      const enemyTeam: BattleTeam = [
        buildPlayer(rng, generateTag(rng), pick(rng, NAME_POOL)),
        buildPlayer(rng, generateTag(rng), pick(rng, NAME_POOL)),
        buildPlayer(rng, generateTag(rng), pick(rng, NAME_POOL)),
      ];
      const allPlayers = [...myTeam, ...enemyTeam];
      const starPlayer = result === "victory" ? me : pick(rng, allPlayers);
      entries.push({
        battleTime: formatBattleTime(new Date(cursor)),
        event: { id: 15000000 + Math.floor(rng() * 99), mode, map },
        battle: {
          mode,
          type: rng() < 0.15 ? "friendly" : "ranked",
          result,
          duration: 90 + Math.floor(rng() * 150),
          trophyChange,
          starPlayer,
          teams: [myTeam, enemyTeam],
        },
      });
    }
  }
  return entries;
}
