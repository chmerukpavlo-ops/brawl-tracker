import { Flame, ListChecks, Percent, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import type { BattleAggregateStats } from "../../types/battle";
import type { TimelinePoint } from "../../utils/battleHelpers";
import { useTranslation } from "../../hooks/useTranslation";
import TrophyTimeline from "./TrophyTimeline";

interface BattleStatsHeaderProps {
  stats: BattleAggregateStats;
  timeline: TimelinePoint[];
}

/**
 * Four-up stats grid + a sparkline below. The cards are tappable in
 * spirit only — they're high-information surfaces that summarise the
 * filtered battle window above the list.
 */
export default function BattleStatsHeader({ stats, timeline }: BattleStatsHeaderProps) {
  const { t, locale } = useTranslation();

  const winRatePct = Math.round(stats.winRate * 100);
  const winRateColor =
    winRatePct >= 60
      ? "text-emerald-300"
      : winRatePct >= 45
        ? "text-[#facc15]"
        : "text-rose-300";

  const trophyColor =
    stats.trophyDelta > 0
      ? "text-emerald-300"
      : stats.trophyDelta < 0
        ? "text-rose-300"
        : "text-slate-300";
  const trophyText =
    stats.trophyDelta > 0
      ? `+${stats.trophyDelta}`
      : `${stats.trophyDelta}`;

  const streakLabel = (() => {
    if (!stats.currentStreak.kind || stats.currentStreak.length === 0) return "—";
    const lookup: Record<string, string> = {
      victory: t("battles.stats.winStreak"),
      defeat: t("battles.stats.lossStreak"),
      draw: t("battles.stats.drawStreak"),
    };
    return `${stats.currentStreak.length} ${lookup[stats.currentStreak.kind]}`;
  })();
  const streakColor =
    stats.currentStreak.kind === "victory"
      ? "text-emerald-300"
      : stats.currentStreak.kind === "defeat"
        ? "text-rose-300"
        : "text-slate-300";

  const cards = [
    {
      label: t("battles.stats.total"),
      value: stats.total.toLocaleString(locale === "uk" ? "uk-UA" : "en-US"),
      icon: ListChecks,
      tone: "text-sky-300",
    },
    {
      label: t("battles.stats.winRate"),
      value: `${winRatePct}%`,
      icon: Percent,
      tone: winRateColor,
    },
    {
      label: t("battles.stats.trophyDelta"),
      value: trophyText,
      icon: TrendingUp,
      tone: trophyColor,
    },
    {
      label: t("battles.stats.streak"),
      value: streakLabel,
      icon: Flame,
      tone: streakColor,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {cards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-2xl border border-white/10 bg-[#2a1a4a]/80 p-3"
            >
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <Icon className="h-3.5 w-3.5" />
                {c.label}
              </p>
              <p
                className={`mt-1.5 text-lg font-black tabular-nums leading-tight ${c.tone}`}
              >
                {c.value}
              </p>
              {c.label === t("battles.stats.streak") &&
                stats.bestWinStreak > 0 && (
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {t("battles.stats.bestStreak")}: {stats.bestWinStreak}
                  </p>
                )}
            </motion.div>
          );
        })}
      </div>

      <TrophyTimeline points={timeline} />
    </div>
  );
}
