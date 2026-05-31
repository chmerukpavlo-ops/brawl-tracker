import type {
  BattleAggregateStats,
  BattleBrawler,
  BattleFilterState,
  BattleLogEntry,
  BattleMode,
  BattlePlayer,
  BattleResult,
} from "../types/battle";
import { normalizeTag } from "./playerCache";

/* ───────────────────────── time helpers ───────────────────────── */

const COMPACT_RE =
  /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z$/;

/** Parse the API's `"20260530T020547.000Z"` into a JS Date. */
export function parseBattleTime(value: string): Date {
  const m = COMPACT_RE.exec(value);
  if (!m) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? new Date(0) : fallback;
  }
  const [, y, mo, d, h, mi, s, ms] = m;
  return new Date(
    Date.UTC(+y, +mo - 1, +d, +h, +mi, +s, +ms)
  );
}

/* ──────────────────────── result / tag utils ──────────────────── */

/**
 * Compute the canonical W/L/D for a single entry. Showdown ranks
 * 1-3 are treated as wins (podium), 4+ as losses; draws only exist
 * in 3v3 modes.
 */
export function computeResult(entry: BattleLogEntry): BattleResult {
  const b = entry.battle;
  if (b.result) return b.result;
  if (typeof b.rank === "number") {
    if (b.rank <= 3) return "victory";
    return "defeat";
  }
  // Unknown → default to draw so it doesn't skew win-rate.
  return "draw";
}

function eqTag(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return normalizeTag(a) === normalizeTag(b);
}

/** Find the "me" entry within a battle by tag (case-/`#`-insensitive). */
export function findMyPlayerInBattle(
  entry: BattleLogEntry,
  myTag: string
): BattlePlayer | null {
  if (entry.battle.players) {
    return entry.battle.players.find((p) => eqTag(p.tag, myTag)) ?? null;
  }
  if (entry.battle.teams) {
    for (const team of entry.battle.teams) {
      const hit = team.find((p) => eqTag(p.tag, myTag));
      if (hit) return hit;
    }
  }
  if (entry.battle.starPlayer && eqTag(entry.battle.starPlayer.tag, myTag)) {
    return entry.battle.starPlayer;
  }
  return null;
}

/** Split a 3v3 battle into "my team" and "opponent team". */
export function splitTeams(
  entry: BattleLogEntry,
  myTag: string
): { my: BattlePlayer[]; opponents: BattlePlayer[] } | null {
  if (!entry.battle.teams || entry.battle.teams.length < 2) return null;
  const myIdx = entry.battle.teams.findIndex((team) =>
    team.some((p) => eqTag(p.tag, myTag))
  );
  if (myIdx < 0) {
    // Couldn't find user — present teams as-is so the sheet is still useful.
    return { my: entry.battle.teams[0] ?? [], opponents: entry.battle.teams[1] ?? [] };
  }
  const oppIdx = myIdx === 0 ? 1 : 0;
  return {
    my: entry.battle.teams[myIdx] ?? [],
    opponents: entry.battle.teams[oppIdx] ?? [],
  };
}

/* ───────────────────────── mode metadata ──────────────────────── */

/** Stable color tokens per mode, used for chips, lists and donut. */
export const MODE_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  soloShowdown: { bg: "bg-orange-500/15", text: "text-orange-300", accent: "#fb923c" },
  duoShowdown: { bg: "bg-amber-500/15", text: "text-amber-300", accent: "#fbbf24" },
  trioShowdown: { bg: "bg-yellow-500/15", text: "text-yellow-300", accent: "#facc15" },
  gemGrab: { bg: "bg-purple-500/15", text: "text-purple-300", accent: "#a78bfa" },
  brawlBall: { bg: "bg-sky-500/15", text: "text-sky-300", accent: "#38bdf8" },
  brawlBall5v5: { bg: "bg-sky-500/15", text: "text-sky-300", accent: "#38bdf8" },
  heist: { bg: "bg-yellow-500/15", text: "text-yellow-300", accent: "#eab308" },
  bounty: { bg: "bg-cyan-500/15", text: "text-cyan-300", accent: "#22d3ee" },
  hotZone: { bg: "bg-rose-500/15", text: "text-rose-300", accent: "#f43f5e" },
  knockout: { bg: "bg-pink-500/15", text: "text-pink-300", accent: "#ec4899" },
  knockout5v5: { bg: "bg-pink-500/15", text: "text-pink-300", accent: "#ec4899" },
  wipeout: { bg: "bg-fuchsia-500/15", text: "text-fuchsia-300", accent: "#d946ef" },
  wipeout5v5: { bg: "bg-fuchsia-500/15", text: "text-fuchsia-300", accent: "#d946ef" },
  siege: { bg: "bg-slate-500/15", text: "text-slate-300", accent: "#94a3b8" },
  basketBrawl: { bg: "bg-emerald-500/15", text: "text-emerald-300", accent: "#34d399" },
  volleyBrawl: { bg: "bg-lime-500/15", text: "text-lime-300", accent: "#a3e635" },
  duels: { bg: "bg-violet-500/15", text: "text-violet-300", accent: "#a78bfa" },
  payload: { bg: "bg-orange-500/15", text: "text-orange-300", accent: "#fb923c" },
};

const FALLBACK_COLOR = { bg: "bg-white/5", text: "text-slate-300", accent: "#94a3b8" };

export function getModeColor(mode: BattleMode): { bg: string; text: string; accent: string } {
  return MODE_COLORS[mode] ?? FALLBACK_COLOR;
}

/* ─────────────────────── aggregations ─────────────────────────── */

export function computeBattleStats(
  entries: BattleLogEntry[],
  myTag: string
): BattleAggregateStats {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let trophyDelta = 0;
  const modeSet = new Set<string>();
  const brawlerSet = new Set<number>();

  // Walk in chronological order (oldest → newest) to compute streaks.
  const sorted = [...entries].sort(
    (a, b) =>
      parseBattleTime(a.battleTime).getTime() -
      parseBattleTime(b.battleTime).getTime()
  );

  let bestWinStreak = 0;
  let currentStreakKind: BattleResult | null = null;
  let currentStreakLength = 0;
  let runningWinStreak = 0;

  for (const entry of sorted) {
    const result = computeResult(entry);
    if (result === "victory") wins++;
    else if (result === "defeat") losses++;
    else draws++;

    if (typeof entry.battle.trophyChange === "number") {
      trophyDelta += entry.battle.trophyChange;
    }

    modeSet.add(entry.battle.mode);
    const me = findMyPlayerInBattle(entry, myTag);
    if (me?.brawler?.id) brawlerSet.add(me.brawler.id);

    // Streak tracking
    if (result === "victory") {
      runningWinStreak++;
      bestWinStreak = Math.max(bestWinStreak, runningWinStreak);
    } else {
      runningWinStreak = 0;
    }

    if (currentStreakKind === result) {
      currentStreakLength++;
    } else {
      currentStreakKind = result;
      currentStreakLength = 1;
    }
  }

  const decisive = wins + losses;
  const winRate = decisive === 0 ? 0 : wins / decisive;

  return {
    total: entries.length,
    wins,
    losses,
    draws,
    winRate,
    trophyDelta,
    bestWinStreak,
    currentStreak: {
      kind: currentStreakKind,
      length: currentStreakLength,
    },
    modesPlayed: modeSet.size,
    brawlersUsed: brawlerSet.size,
  };
}

/* ─────────────────────── grouping helpers ─────────────────────── */

export function groupByMode(
  entries: BattleLogEntry[]
): Map<BattleMode, BattleLogEntry[]> {
  const map = new Map<BattleMode, BattleLogEntry[]>();
  for (const e of entries) {
    const arr = map.get(e.battle.mode);
    if (arr) arr.push(e);
    else map.set(e.battle.mode, [e]);
  }
  return map;
}

export interface BrawlerStat {
  brawler: BattleBrawler;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  trophyDelta: number;
}

/** Aggregate by brawler the user piloted. */
export function groupByBrawler(
  entries: BattleLogEntry[],
  myTag: string
): BrawlerStat[] {
  const map = new Map<number, BrawlerStat>();
  for (const e of entries) {
    const me = findMyPlayerInBattle(e, myTag);
    if (!me?.brawler) continue;
    const cur = map.get(me.brawler.id) ?? {
      brawler: me.brawler,
      matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      trophyDelta: 0,
    };
    cur.matches++;
    const result = computeResult(e);
    if (result === "victory") cur.wins++;
    else if (result === "defeat") cur.losses++;
    else cur.draws++;
    if (typeof e.battle.trophyChange === "number") {
      cur.trophyDelta += e.battle.trophyChange;
    }
    map.set(me.brawler.id, cur);
  }

  const list = [...map.values()].map((s) => {
    const dec = s.wins + s.losses;
    return { ...s, winRate: dec === 0 ? 0 : s.wins / dec };
  });
  list.sort((a, b) => b.matches - a.matches);
  return list;
}

/* ──────────────────── trophy timeline ─────────────────────────── */

export interface TimelinePoint {
  time: Date;
  delta: number;
  cumulative: number;
  mode: BattleMode;
  result: BattleResult;
}

/**
 * Builds a cumulative trophy-delta timeline (oldest → newest) for use
 * with the sparkline. Uses `0` for entries without `trophyChange`.
 */
export function buildTrophyTimeline(entries: BattleLogEntry[]): TimelinePoint[] {
  const sorted = [...entries].sort(
    (a, b) =>
      parseBattleTime(a.battleTime).getTime() -
      parseBattleTime(b.battleTime).getTime()
  );
  let cumulative = 0;
  return sorted.map((e) => {
    const delta = e.battle.trophyChange ?? 0;
    cumulative += delta;
    return {
      time: parseBattleTime(e.battleTime),
      delta,
      cumulative,
      mode: e.battle.mode,
      result: computeResult(e),
    };
  });
}

/* ──────────────────────── filtering ───────────────────────────── */

export function applyFilters(
  entries: BattleLogEntry[],
  filters: BattleFilterState,
  myTag: string
): BattleLogEntry[] {
  return entries.filter((e) => {
    if (filters.mode && e.battle.mode !== filters.mode) return false;
    if (filters.result && computeResult(e) !== filters.result) return false;
    if (filters.brawlerId !== null) {
      const me = findMyPlayerInBattle(e, myTag);
      if (!me || me.brawler.id !== filters.brawlerId) return false;
    }
    return true;
  });
}

export function hasActiveFilters(filters: BattleFilterState): boolean {
  return (
    filters.mode !== null ||
    filters.result !== null ||
    filters.brawlerId !== null
  );
}

/** Lists modes that actually appear in `entries`, sorted by frequency. */
export function distinctModes(entries: BattleLogEntry[]): BattleMode[] {
  const counts = new Map<BattleMode, number>();
  for (const e of entries) {
    counts.set(e.battle.mode, (counts.get(e.battle.mode) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m);
}

/** Distinct brawlers used by myTag, sorted by usage. */
export function distinctBrawlers(
  entries: BattleLogEntry[],
  myTag: string
): BattleBrawler[] {
  const counts = new Map<number, { brawler: BattleBrawler; count: number }>();
  for (const e of entries) {
    const me = findMyPlayerInBattle(e, myTag);
    if (!me?.brawler) continue;
    const cur = counts.get(me.brawler.id);
    if (cur) cur.count++;
    else counts.set(me.brawler.id, { brawler: me.brawler, count: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .map((v) => v.brawler);
}

/* ─────────────────────── misc helpers ─────────────────────────── */

/** Brawlify map preview URL — fallback to null if id is invalid. */
export function getMapImageUrl(eventId: number | undefined | null): string | null {
  if (!eventId || !Number.isFinite(eventId)) return null;
  return `https://cdn.brawlify.com/maps/regular/${eventId}.png`;
}

/**
 * Best-effort mode label that returns the localized name when present,
 * or falls back to a humanized camelCase string for unknown future
 * modes (no i18n key). Pass the `t` function from `useTranslation`.
 */
export function getModeLabel(
  mode: BattleMode,
  t: (key: string) => string
): string {
  const key = `modes.${mode}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return mode
    .replace(/([A-Z0-9])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/** Anonymous tags from API look like `#XXXXX` — not clickable. */
export function isAnonymousTag(tag: string | undefined): boolean {
  if (!tag) return true;
  const norm = tag.replace(/^#/, "");
  return /^X+$/i.test(norm) || norm.length < 3;
}

/** `90` → `"1:30"`. */
export function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
