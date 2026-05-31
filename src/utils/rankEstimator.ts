import type { PlayerRanking } from "../types";

export interface RankEstimate {
  /** Best-guess estimated rank (always > maxKnownRank). */
  estimatedRank: number;
  /** Inclusive lower bound of the estimated range. */
  estimatedRankMin: number;
  /** Inclusive upper bound of the estimated range. */
  estimatedRankMax: number;
  /** Confidence in the estimation. */
  confidence: "high" | "medium" | "low";
  /** Number of trophies separating the user from the bottom of the visible list. */
  trophyGap: number;
}

interface SortedSlice {
  rank: number;
  trophies: number;
}

function pickSorted(items: PlayerRanking[]): SortedSlice[] {
  return [...items]
    .map((it) => ({ rank: it.rank, trophies: it.trophies }))
    .filter((it) => it.rank > 0 && it.trophies > 0)
    .sort((a, b) => a.rank - b.rank);
}

/**
 * Estimates a player's rank if they are not present in `items` (the visible
 * leaderboard, e.g. top-200). Uses the slope between the median row and the
 * last row to extrapolate where `myTrophies` would land.
 *
 * Returns `null` when the leaderboard is too small to extrapolate, or when
 * the player would actually fit inside the visible list.
 */
export function estimateRank(
  myTrophies: number,
  items: PlayerRanking[]
): RankEstimate | null {
  if (!Number.isFinite(myTrophies) || myTrophies <= 0) return null;
  const sorted = pickSorted(items);
  if (sorted.length < 5) return null;

  const last = sorted[sorted.length - 1];
  const mid = sorted[Math.floor(sorted.length / 2)];
  if (last.rank <= mid.rank) return null;

  // If the player belongs in the visible list, no estimation needed.
  if (myTrophies >= last.trophies) return null;

  const denom = last.rank - mid.rank;
  const trophyPerRank = (mid.trophies - last.trophies) / denom;
  if (trophyPerRank <= 0) return null;

  const trophyGap = Math.max(1, last.trophies - myTrophies);
  const additionalRanks = Math.max(1, Math.round(trophyGap / trophyPerRank));
  const estimatedRank = last.rank + additionalRanks;

  const ratio = trophyGap / Math.max(1, last.trophies);
  const confidence: RankEstimate["confidence"] =
    ratio < 0.08 ? "high" : ratio < 0.3 ? "medium" : "low";
  const margin = Math.max(50, Math.round(estimatedRank * 0.2));

  return {
    estimatedRank,
    estimatedRankMin: Math.max(last.rank + 1, estimatedRank - margin),
    estimatedRankMax: estimatedRank + margin,
    confidence,
    trophyGap,
  };
}

/**
 * Renders a human-readable description of the estimate, suitable for use as a
 * sublabel under the player card. Uses `Intl.NumberFormat` for locale-aware
 * thousand separators.
 */
export function describeRankEstimate(
  estimate: RankEstimate,
  locale: "uk" | "en" = "uk"
): string {
  const { estimatedRankMin, estimatedRankMax, confidence } = estimate;
  const intl = locale === "uk" ? "uk-UA" : "en-US";
  const fmt = new Intl.NumberFormat(intl);
  const range = `${fmt.format(estimatedRankMin)}–${fmt.format(estimatedRankMax)}`;
  const labels =
    locale === "uk"
      ? { high: "висока точність", medium: "приблизно", low: "груба оцінка" }
      : { high: "high confidence", medium: "approximate", low: "rough estimate" };
  const conf = labels[confidence];
  return `≈ #${range} (${conf})`;
}
