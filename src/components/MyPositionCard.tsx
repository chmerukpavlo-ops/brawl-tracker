import { useMemo, useState } from "react";
import { ChevronRight, Locate, Sparkles, Trophy } from "lucide-react";
import { motion } from "motion/react";
import type { PlayerStats, PlayerRanking } from "../types";
import {
  describeRankEstimate,
  estimateRank,
  type RankEstimate,
} from "../utils/rankEstimator";
import { haptic } from "../hooks/useHaptic";
import { getCountryMeta } from "../data/countries";
import { useI18n } from "../context/I18nContext";
import { useTranslation } from "../hooks/useTranslation";

interface MyPositionCardProps {
  player: PlayerStats;
  leaderboard: PlayerRanking[];
  countryCode: string;
  onChangeCountry: (code: string) => void;
  /** Optional override; when provided, treated as "found in current top". */
  knownRank?: number | null;
}

export default function MyPositionCard({
  player,
  leaderboard,
  countryCode,
  onChangeCountry,
  knownRank,
}: MyPositionCardProps) {
  const { t, locale } = useTranslation();
  const { formatNumber } = useI18n();
  const [revealed, setRevealed] = useState(false);

  const estimate: RankEstimate | null = useMemo(() => {
    if (knownRank) return null;
    return estimateRank(player.trophies, leaderboard);
  }, [knownRank, leaderboard, player.trophies]);

  const meta = getCountryMeta(countryCode);
  const initial = player.name.trim().slice(0, 1).toUpperCase() || "?";

  let primaryText: string;
  let secondaryText: string | null;
  let badgeColor: string;

  if (knownRank) {
    primaryText = t("leaders.youAreOn", { rank: formatNumber(knownRank) });
    secondaryText = `${meta.flag} ${meta.name} · ${formatNumber(player.trophies)}🏆`;
    badgeColor = "from-[#facc15] to-[#eab308] text-[#1a0a2e]";
  } else if (revealed && estimate) {
    primaryText = describeRankEstimate(estimate, locale);
    secondaryText = `${t("leaders.outOfTop")} · Δ≈${formatNumber(estimate.trophyGap)}🏆`;
    badgeColor = "from-[#7c3aed] to-[#5b21b6] text-white";
  } else if (revealed && !estimate) {
    primaryText = locale === "uk" ? "Замало даних для оцінки" : "Not enough data to estimate";
    secondaryText = locale === "uk" ? "Спробуй регіон з більшим топом" : "Try a region with a larger leaderboard";
    badgeColor = "from-slate-500 to-slate-700 text-white";
  } else {
    primaryText = t("leaders.outOfTop");
    secondaryText = `${meta.flag} ${meta.name}`;
    badgeColor = "from-slate-500 to-slate-700 text-white";
  }

  const showRevealButton = !knownRank && !revealed;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#facc15]/40 bg-gradient-to-br from-[#facc15]/10 to-[#7c3aed]/10 p-3 ring-1 ring-[#facc15]/20"
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-base font-black shadow-[0_0_18px_rgba(250,204,21,0.25)] ${badgeColor}`}
        >
          {knownRank ? (
            <Trophy className="h-5 w-5" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#facc15]">
            {t("leaders.yourPosition")}
          </p>
          <p className="truncate text-sm font-black text-white">{primaryText}</p>
          {secondaryText && (
            <p className="truncate text-[10px] text-slate-400">{secondaryText}</p>
          )}
        </div>
        {showRevealButton && (
          <button
            type="button"
            onClick={() => {
              haptic.medium();
              setRevealed(true);
            }}
            className="flex shrink-0 items-center gap-1 rounded-full border border-[#facc15]/40 bg-[#facc15]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#facc15] active:scale-95"
            aria-label={t("leaders.calculate")}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("leaders.calculate")}
          </button>
        )}
      </div>

      {!knownRank && countryCode !== "global" && (
        <button
          type="button"
          onClick={() => {
            haptic.selection();
            onChangeCountry("global");
          }}
          className="mt-2 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-300 active:scale-[0.98]"
        >
          <span className="flex items-center gap-1.5">
            <Locate className="h-3 w-3 text-[#a78bfa]" />
            {t("leaders.tryGlobal")}
          </span>
          <ChevronRight className="h-3 w-3 text-slate-500" />
        </button>
      )}
    </motion.div>
  );
}
