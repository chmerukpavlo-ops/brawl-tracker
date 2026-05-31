import { useMemo } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  RANGE_LABEL,
  RANGE_SHORT,
  rangeSinceMs,
  type TrophyRange,
  type TrophySnapshot,
} from "../utils/trophyHistory";

interface TrophyDeltaCardProps {
  snapshots: TrophySnapshot[];
  range: TrophyRange;
  onRangeChange: (range: TrophyRange) => void;
}

const RANGES: TrophyRange[] = ["24h", "7d", "30d", "all"];

function formatNumber(value: number): string {
  return value.toLocaleString("uk-UA");
}

function formatDelta(value: number): string {
  if (value === 0) return "0";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}`;
}

function formatDateShort(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function TrophyDeltaCard({
  snapshots,
  range,
  onRangeChange,
}: TrophyDeltaCardProps) {
  const stats = useMemo(() => {
    const since = rangeSinceMs(range);
    const filtered = since
      ? snapshots.filter((s) => s.timestamp >= since)
      : snapshots;
    if (filtered.length < 2) {
      return {
        empty: true as const,
        count: filtered.length,
      };
    }
    const first = filtered[0];
    const last = filtered[filtered.length - 1];
    const delta = last.trophies - first.trophies;
    const percentage =
      first.trophies > 0 ? (delta / first.trophies) * 100 : 0;
    return {
      empty: false as const,
      delta,
      percentage,
      count: filtered.length,
      from: first.timestamp,
      to: last.timestamp,
      current: last.trophies,
    };
  }, [snapshots, range]);

  const deltaColor = stats.empty
    ? "text-slate-400"
    : stats.delta > 0
      ? "text-[#22c55e]"
      : stats.delta < 0
        ? "text-rose-400"
        : "text-slate-400";

  const TrendIcon = stats.empty
    ? Minus
    : stats.delta > 0
      ? TrendingUp
      : stats.delta < 0
        ? TrendingDown
        : Minus;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          Прогрес
        </p>
        <div
          role="tablist"
          aria-label="Період"
          className="flex shrink-0 gap-0.5 rounded-full bg-[#1a0a2e] p-0.5"
        >
          {RANGES.map((r) => {
            const active = r === range;
            return (
              <button
                key={r}
                role="tab"
                aria-selected={active}
                onClick={() => onRangeChange(r)}
                className={`relative min-h-[28px] rounded-full px-2.5 text-[10px] font-black uppercase transition-colors ${
                  active ? "text-[#1a0a2e]" : "text-slate-400 active:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="trophy-range-pill"
                    className="absolute inset-0 -z-0 rounded-full bg-[#facc15]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{RANGE_SHORT[r]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={range + (stats.empty ? "-empty" : "-data")}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {stats.empty ? (
            <div>
              <p className="text-2xl font-black text-slate-400">—</p>
              <p className="text-[11px] font-medium text-slate-500">
                Немає даних за період «{RANGE_LABEL[range]}»
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <TrendIcon className={`h-5 w-5 ${deltaColor}`} />
                <span className={`text-2xl font-black tabular-nums ${deltaColor}`}>
                  {formatDelta(stats.delta)}
                </span>
                {stats.delta !== 0 && (
                  <span className={`text-xs font-bold tabular-nums ${deltaColor}`}>
                    {stats.percentage > 0 ? "+" : ""}
                    {stats.percentage.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                {RANGE_LABEL[range].toLowerCase()} •{" "}
                {stats.count.toLocaleString("uk-UA")} snapshots •{" "}
                {formatDateShort(stats.from)} – {formatDateShort(stats.to)}
              </p>
              {stats.delta === 0 && (
                <p className="text-[11px] font-bold text-slate-400">Без змін</p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
