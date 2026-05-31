import type { BrawlerInfo, PlayerStats } from "../types";

export type CompareWinner = "a" | "b" | "tie";

export interface ComparisonMetric {
  key: MetricKey;
  label: string;
  valueA: number;
  valueB: number;
  winner: CompareWinner;
  /** Absolute |a - b| */
  diff: number;
  /** Signed percentage advantage of winner vs loser (0..Infinity). 0 if tie. */
  percentage: number;
  /** Optional formatter for display. */
  format?: (n: number) => string;
  /** Higher value = better for this metric (default true). */
  higherIsBetter?: boolean;
}

export type MetricKey =
  | "trophies"
  | "highestTrophies"
  | "expLevel"
  | "v3Victories"
  | "soloVictories"
  | "duoVictories"
  | "brawlersCount"
  | "brawlersAvgPower"
  | "brawlersAvgTrophies"
  | "maxedBrawlers"
  | "rank35Brawlers";

const METRIC_WEIGHTS: Partial<Record<MetricKey, number>> = {
  trophies: 5,
  highestTrophies: 3,
  v3Victories: 2,
  soloVictories: 1,
  duoVictories: 1,
  brawlersCount: 2,
  maxedBrawlers: 4,
  brawlersAvgPower: 2,
  brawlersAvgTrophies: 2,
};

export interface BrawlerDiffEntry {
  brawler: BrawlerInfo;
  /** Same id brawler from the other side (if exists). */
  counterpart?: BrawlerInfo;
}

export interface ComparisonResult {
  playerA: PlayerStats;
  playerB: PlayerStats;
  overall: {
    winner: CompareWinner;
    scoreA: number;
    scoreB: number;
  };
  metrics: ComparisonMetric[];
  brawlers: {
    common: Array<{
      id: number;
      name: string;
      a: BrawlerInfo;
      b: BrawlerInfo;
      winner: CompareWinner;
    }>;
    onlyA: BrawlerInfo[];
    onlyB: BrawlerInfo[];
    counts: {
      common: number;
      onlyA: number;
      onlyB: number;
    };
  };
}

function compareNumeric(
  a: number,
  b: number,
  higherIsBetter = true
): { winner: CompareWinner; diff: number; percentage: number } {
  if (a === b) return { winner: "tie", diff: 0, percentage: 0 };
  const aBetter = higherIsBetter ? a > b : a < b;
  const winner: CompareWinner = aBetter ? "a" : "b";
  const high = Math.max(a, b);
  const low = Math.min(a, b);
  const denom = Math.max(1, low);
  return {
    winner,
    diff: high - low,
    percentage: ((high - low) / denom) * 100,
  };
}

function nullableNumber(n: number | undefined | null): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function brawlerAggregates(brawlers: BrawlerInfo[] | undefined) {
  const list = Array.isArray(brawlers) ? brawlers : [];
  const count = list.length;
  let powerSum = 0;
  let trophiesSum = 0;
  let maxed = 0;
  let rank35 = 0;
  for (const b of list) {
    powerSum += nullableNumber(b.power);
    trophiesSum += nullableNumber(b.trophies);
    if (b.power >= 11) maxed += 1;
    if (b.rank >= 35) rank35 += 1;
  }
  return {
    count,
    avgPower: count ? powerSum / count : 0,
    avgTrophies: count ? trophiesSum / count : 0,
    maxed,
    rank35,
  };
}

function buildMetric(
  key: MetricKey,
  label: string,
  valueA: number,
  valueB: number,
  options: { higherIsBetter?: boolean; format?: (n: number) => string } = {}
): ComparisonMetric {
  const { winner, diff, percentage } = compareNumeric(
    valueA,
    valueB,
    options.higherIsBetter ?? true
  );
  return {
    key,
    label,
    valueA,
    valueB,
    winner,
    diff,
    percentage,
    format: options.format,
    higherIsBetter: options.higherIsBetter ?? true,
  };
}

const intFmt = (n: number) => Math.round(n).toLocaleString("uk-UA");
const oneFmt = (n: number) =>
  n.toLocaleString("uk-UA", { maximumFractionDigits: 1 });

export function getComparisonStats(
  playerA: PlayerStats,
  playerB: PlayerStats
): ComparisonResult {
  const aggA = brawlerAggregates(playerA.brawlers);
  const aggB = brawlerAggregates(playerB.brawlers);

  const metrics: ComparisonMetric[] = [
    buildMetric("trophies", "Поточні кубки", playerA.trophies, playerB.trophies, {
      format: intFmt,
    }),
    buildMetric(
      "highestTrophies",
      "Рекорд кубків",
      playerA.highestTrophies,
      playerB.highestTrophies,
      { format: intFmt }
    ),
    buildMetric("expLevel", "Рівень", playerA.expLevel, playerB.expLevel, {
      format: intFmt,
    }),
    buildMetric(
      "v3Victories",
      "Перемоги 3v3",
      playerA["3vs3Victories"],
      playerB["3vs3Victories"],
      { format: intFmt }
    ),
    buildMetric(
      "soloVictories",
      "Solo перемоги",
      playerA.soloVictories,
      playerB.soloVictories,
      { format: intFmt }
    ),
    buildMetric(
      "duoVictories",
      "Duo перемоги",
      playerA.duoVictories,
      playerB.duoVictories,
      { format: intFmt }
    ),
    buildMetric("brawlersCount", "Бійців у колекції", aggA.count, aggB.count, {
      format: intFmt,
    }),
    buildMetric(
      "brawlersAvgPower",
      "Середній Power",
      aggA.avgPower,
      aggB.avgPower,
      { format: oneFmt }
    ),
    buildMetric(
      "brawlersAvgTrophies",
      "Середні кубки бійців",
      aggA.avgTrophies,
      aggB.avgTrophies,
      { format: intFmt }
    ),
    buildMetric(
      "maxedBrawlers",
      "Бійці Power 11",
      aggA.maxed,
      aggB.maxed,
      { format: intFmt }
    ),
    buildMetric(
      "rank35Brawlers",
      "Ранг 35+",
      aggA.rank35,
      aggB.rank35,
      { format: intFmt }
    ),
  ];

  // Weighted overall.
  let scoreA = 0;
  let scoreB = 0;
  for (const m of metrics) {
    const w = METRIC_WEIGHTS[m.key] ?? 0;
    if (!w) continue;
    if (m.winner === "a") scoreA += w;
    else if (m.winner === "b") scoreB += w;
    else {
      scoreA += w / 2;
      scoreB += w / 2;
    }
  }
  const overall: ComparisonResult["overall"] = {
    scoreA,
    scoreB,
    winner: scoreA > scoreB ? "a" : scoreB > scoreA ? "b" : "tie",
  };

  // Brawler overlap.
  const aListRaw = Array.isArray(playerA.brawlers) ? playerA.brawlers : [];
  const bListRaw = Array.isArray(playerB.brawlers) ? playerB.brawlers : [];
  const mapA = new Map<number, BrawlerInfo>();
  const mapB = new Map<number, BrawlerInfo>();
  for (const b of aListRaw) mapA.set(b.id, b);
  for (const b of bListRaw) mapB.set(b.id, b);

  const common: ComparisonResult["brawlers"]["common"] = [];
  const onlyA: BrawlerInfo[] = [];
  const onlyB: BrawlerInfo[] = [];

  for (const [id, ba] of mapA.entries()) {
    const bb = mapB.get(id);
    if (bb) {
      const cmp = compareNumeric(ba.trophies, bb.trophies);
      common.push({ id, name: ba.name, a: ba, b: bb, winner: cmp.winner });
    } else {
      onlyA.push(ba);
    }
  }
  for (const [id, bb] of mapB.entries()) {
    if (!mapA.has(id)) onlyB.push(bb);
  }

  common.sort(
    (x, y) => Math.max(y.a.trophies, y.b.trophies) - Math.max(x.a.trophies, x.b.trophies)
  );
  onlyA.sort((x, y) => y.trophies - x.trophies);
  onlyB.sort((x, y) => y.trophies - x.trophies);

  return {
    playerA,
    playerB,
    overall,
    metrics,
    brawlers: {
      common,
      onlyA,
      onlyB,
      counts: {
        common: common.length,
        onlyA: onlyA.length,
        onlyB: onlyB.length,
      },
    },
  };
}

/**
 * Normalized progress (0..1) for each side, sized relative to the max of the
 * two values; useful for rendering a 2-sided horizontal bar.
 */
export function dualBarRatio(
  valueA: number,
  valueB: number
): { ratioA: number; ratioB: number } {
  const max = Math.max(valueA, valueB);
  if (max <= 0) return { ratioA: 0, ratioB: 0 };
  return {
    ratioA: Math.max(0, valueA / max),
    ratioB: Math.max(0, valueB / max),
  };
}

export function formatPct(percentage: number): string {
  if (percentage <= 0) return "0%";
  if (percentage >= 999) return "999%+";
  if (percentage >= 100) return `+${Math.round(percentage)}%`;
  return `+${percentage.toFixed(percentage < 10 ? 1 : 0)}%`;
}
