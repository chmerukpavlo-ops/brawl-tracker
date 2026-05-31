import { useMemo } from "react";
import type { BattleLogEntry, BattleMode } from "../../types/battle";
import {
  computeResult,
  getModeColor,
  getModeLabel,
  groupByMode,
} from "../../utils/battleHelpers";
import { useTranslation } from "../../hooks/useTranslation";

interface ModeBreakdownProps {
  entries: BattleLogEntry[];
  onFilterMode?: (mode: BattleMode) => void;
  activeMode?: BattleMode | null;
}

interface Slice {
  mode: BattleMode;
  count: number;
  wins: number;
  losses: number;
  accent: string;
  start: number;
  end: number;
}

const CIRCUMFERENCE = 2 * Math.PI * 36; // r=36

/**
 * Donut chart of matches per mode + a per-mode legend with W/L bars.
 * Drawn purely with SVG arcs (no chart lib). Each legend row is also a
 * filter shortcut — tapping it sets the parent filter to that mode.
 */
export default function ModeBreakdown({
  entries,
  onFilterMode,
  activeMode,
}: ModeBreakdownProps) {
  const { t, locale } = useTranslation();
  const total = entries.length;

  const slices = useMemo<Slice[]>(() => {
    if (total === 0) return [];
    const grouped = groupByMode(entries);
    const sorted = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);

    let cursor = 0;
    return sorted.map(([mode, modeEntries]) => {
      const count = modeEntries.length;
      const color = getModeColor(mode).accent;
      const fraction = count / total;
      const start = cursor;
      cursor += fraction;
      let wins = 0;
      let losses = 0;
      for (const e of modeEntries) {
        const r = computeResult(e);
        if (r === "victory") wins++;
        else if (r === "defeat") losses++;
      }
      return {
        mode,
        count,
        wins,
        losses,
        accent: color,
        start,
        end: cursor,
      };
    });
  }, [entries, total]);

  if (total === 0) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1a0a2e]/60 p-4">
      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
        {t("battles.breakdown.modesTitle")}
      </p>

      <div className="flex items-start gap-4">
        <svg
          viewBox="0 0 90 90"
          width={96}
          height={96}
          className="shrink-0"
          aria-hidden
        >
          {/* Track */}
          <circle
            cx={45}
            cy={45}
            r={36}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={10}
          />
          {/* Slices — drawn as dashed arcs along the same circumference. */}
          {slices.map((s) => {
            const length = (s.end - s.start) * CIRCUMFERENCE;
            const offset = -s.start * CIRCUMFERENCE;
            return (
              <circle
                key={s.mode}
                cx={45}
                cy={45}
                r={36}
                fill="none"
                stroke={s.accent}
                strokeWidth={10}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={offset}
                // Rotate -90deg so the first slice starts at 12 o'clock.
                transform="rotate(-90 45 45)"
                strokeLinecap="butt"
              />
            );
          })}
          <text
            x="45"
            y="42"
            textAnchor="middle"
            className="fill-white"
            style={{ fontSize: 13, fontWeight: 900 }}
          >
            {total}
          </text>
          <text
            x="45"
            y="55"
            textAnchor="middle"
            className="fill-slate-400"
            style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}
          >
            {t("battles.breakdown.matches")}
          </text>
        </svg>

        <ul className="min-w-0 flex-1 space-y-1.5">
          {slices.slice(0, 6).map((s) => {
            const label = getModeLabel(s.mode, t as (k: string) => string);
            const pct = Math.round((s.count / total) * 100);
            const decisive = s.wins + s.losses;
            const winRate = decisive === 0 ? null : Math.round((s.wins / decisive) * 100);
            const isActive = activeMode === s.mode;
            return (
              <li key={s.mode}>
                <button
                  type="button"
                  onClick={() => onFilterMode?.(s.mode)}
                  disabled={!onFilterMode}
                  className={`flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left transition-colors disabled:cursor-default ${
                    isActive ? "bg-white/5" : "active:bg-white/5"
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: s.accent }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-black uppercase tracking-wide text-slate-200">
                    {label}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                    {s.count.toLocaleString(locale === "uk" ? "uk-UA" : "en-US")}{" "}
                    <span className="text-slate-500">({pct}%)</span>
                    {winRate !== null && (
                      <span
                        className={`ml-1.5 font-black ${
                          winRate >= 60
                            ? "text-emerald-300"
                            : winRate >= 45
                              ? "text-[#facc15]"
                              : "text-rose-300"
                        }`}
                      >
                        {winRate}%
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
