import { useMemo } from "react";
import { Trophy } from "lucide-react";
import type { BattleLogEntry } from "../../types/battle";
import { brawlersMetadata } from "../../types";
import { groupByBrawler } from "../../utils/battleHelpers";
import BrawlerAvatar from "../BrawlerAvatar";
import { useTranslation } from "../../hooks/useTranslation";

interface BrawlerBreakdownProps {
  entries: BattleLogEntry[];
  myTag: string;
  onFilterBrawler?: (brawlerId: number) => void;
  activeBrawlerId?: number | null;
}

/**
 * Per-brawler usage list: matches played, win-rate and net trophy
 * delta. Sorted by usage so users see their current pocket picks first.
 * Tap a row → narrows the parent list to only that brawler.
 */
export default function BrawlerBreakdown({
  entries,
  myTag,
  onFilterBrawler,
  activeBrawlerId,
}: BrawlerBreakdownProps) {
  const { t } = useTranslation();
  const rows = useMemo(() => groupByBrawler(entries, myTag), [entries, myTag]);

  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1a0a2e]/60 p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
        {t("battles.breakdown.brawlersTitle")}
      </p>
      <ul role="list" className="space-y-2">
        {rows.slice(0, 8).map((row) => {
          const isActive = activeBrawlerId === row.brawler.id;
          const name =
            brawlersMetadata[row.brawler.name]?.name ?? row.brawler.name;
          const winRatePct = Math.round(row.winRate * 100);
          const winColor =
            winRatePct >= 60
              ? "text-emerald-300"
              : winRatePct >= 45
                ? "text-[#facc15]"
                : "text-rose-300";
          const deltaColor =
            row.trophyDelta > 0
              ? "text-emerald-300"
              : row.trophyDelta < 0
                ? "text-rose-300"
                : "text-slate-400";

          return (
            <li key={row.brawler.id}>
              <button
                type="button"
                onClick={() => onFilterBrawler?.(row.brawler.id)}
                disabled={!onFilterBrawler}
                className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors disabled:cursor-default ${
                  isActive
                    ? "border-[#facc15]/40 bg-[#facc15]/5"
                    : "border-white/10 bg-white/[0.02] active:bg-white/5"
                }`}
              >
                <BrawlerAvatar
                  brawlerId={row.brawler.id}
                  brawlerName={row.brawler.name}
                  size={36}
                  rounded="rounded-lg"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-black uppercase tracking-wide text-white">
                    {name}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {/* Win bar (proportion of decisive matches that were wins). */}
                    <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-emerald-400/70"
                        style={{ width: `${winRatePct}%` }}
                      />
                    </div>
                    <span className={`shrink-0 text-[10px] font-black tabular-nums ${winColor}`}>
                      {winRatePct}%
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-black tabular-nums text-slate-200">
                    {row.matches}
                  </p>
                  <p className={`flex items-center gap-1 text-[10px] font-black tabular-nums ${deltaColor}`}>
                    <Trophy className="h-2.5 w-2.5" />
                    {row.trophyDelta > 0 ? "+" : ""}
                    {row.trophyDelta}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
