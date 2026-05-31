import { X } from "lucide-react";
import type {
  BattleBrawler,
  BattleFilterState,
  BattleMode,
  BattleResult,
} from "../../types/battle";
import { brawlersMetadata } from "../../types";
import { getModeColor, getModeLabel, hasActiveFilters } from "../../utils/battleHelpers";
import { useTranslation } from "../../hooks/useTranslation";
import { haptic } from "../../hooks/useHaptic";
import type { TranslationKey } from "../../i18n";

interface BattleFiltersProps {
  filters: BattleFilterState;
  onChange: (next: BattleFilterState) => void;
  /** Only modes that actually appear in the raw log. */
  availableModes: BattleMode[];
  /** Only brawlers the user piloted. */
  availableBrawlers: BattleBrawler[];
}

const RESULTS: Array<{ key: BattleResult | null; tKey: TranslationKey }> = [
  { key: null, tKey: "battles.filters.all" },
  { key: "victory", tKey: "battles.filters.wins" },
  { key: "defeat", tKey: "battles.filters.losses" },
  { key: "draw", tKey: "battles.filters.draws" },
];

/**
 * Three rows of horizontally scrollable filter chips: result, mode and
 * brawler. Each chip is a self-toggling button — tapping the same chip
 * a second time clears that filter slice.
 */
export default function BattleFilters({
  filters,
  onChange,
  availableModes,
  availableBrawlers,
}: BattleFiltersProps) {
  const { t } = useTranslation();
  const active = hasActiveFilters(filters);

  const update = (patch: Partial<BattleFilterState>) => {
    haptic.light();
    onChange({ ...filters, ...patch });
  };

  return (
    <div className="space-y-2">
      <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-1.5">
          {RESULTS.map(({ key, tKey }) => {
            const selected = filters.result === key;
            return (
              <button
                key={key ?? "all"}
                type="button"
                onClick={() => update({ result: key })}
                aria-pressed={selected}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors ${
                  selected
                    ? "bg-[#facc15] text-[#1a0a2e]"
                    : "bg-white/5 text-slate-300 ring-1 ring-white/10"
                }`}
              >
                {t(tKey)}
              </button>
            );
          })}

          {active && (
            <button
              type="button"
              onClick={() =>
                update({ result: null, mode: null, brawlerId: null })
              }
              className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-rose-200 ring-1 ring-rose-500/30"
            >
              <X className="h-3 w-3" />
              {t("battles.filters.clear")}
            </button>
          )}
        </div>
      </div>

      {availableModes.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 pr-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("battles.filters.modes")}
            </span>
            {availableModes.map((mode) => {
              const selected = filters.mode === mode;
              const color = getModeColor(mode);
              const label = getModeLabel(mode, t as (k: string) => string);
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    update({ mode: selected ? null : mode })
                  }
                  aria-pressed={selected}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider transition-colors ${
                    selected
                      ? `${color.bg} ${color.text} ring-1`
                      : "bg-white/5 text-slate-400 ring-1 ring-white/10"
                  }`}
                  style={selected ? { boxShadow: `inset 0 0 0 1px ${color.accent}55` } : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {availableBrawlers.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 pr-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("battles.filters.brawlers")}
            </span>
            {availableBrawlers.map((b) => {
              const selected = filters.brawlerId === b.id;
              const displayName = brawlersMetadata[b.name]?.name ?? b.name;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    update({ brawlerId: selected ? null : b.id })
                  }
                  aria-pressed={selected}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider transition-colors ${
                    selected
                      ? "bg-[#7c3aed]/30 text-fuchsia-100 ring-1 ring-fuchsia-400/50"
                      : "bg-white/5 text-slate-400 ring-1 ring-white/10"
                  }`}
                >
                  {displayName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
