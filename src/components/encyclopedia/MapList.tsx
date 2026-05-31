import { useDeferredValue, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import MapCard from "./MapCard";
import type { BrawlifyMap } from "../../types/brawlify";
import { useTranslation } from "../../hooks/useTranslation";
import { haptic } from "../../hooks/useHaptic";

interface MapListProps {
  maps: BrawlifyMap[];
  onSelect: (map: BrawlifyMap) => void;
}

export default function MapList({ maps, onSelect }: MapListProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [modeFilter, setModeFilter] = useState<string | null>(null);
  const [includeDisabled, setIncludeDisabled] = useState(false);

  const modeOptions = useMemo(() => {
    const seen = new Map<string, { name: string; color: string }>();
    for (const m of maps) {
      const name = m.gameMode?.name;
      if (!name) continue;
      if (!seen.has(name)) {
        seen.set(name, { name, color: m.gameMode.color });
      }
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [maps]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return maps
      .filter((m) => (includeDisabled ? true : !m.disabled))
      .filter((m) => (modeFilter ? m.gameMode?.name === modeFilter : true))
      .filter((m) => (q ? m.name.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        if (a.new !== b.new) return a.new ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [maps, modeFilter, includeDisabled, deferredQuery]);

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("encyclopedia.search.placeholder")}
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          aria-label={t("encyclopedia.search.placeholder")}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              haptic.light();
              setQuery("");
            }}
            className="text-slate-400 active:opacity-70"
            aria-label={t("common.clear")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {t("encyclopedia.filters.mode")}
        </p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" data-scroll-x>
          <Chip
            label={t("encyclopedia.filters.all")}
            active={modeFilter === null}
            onClick={() => setModeFilter(null)}
          />
          {modeOptions.map((opt) => (
            <Chip
              key={opt.name}
              label={opt.name}
              color={opt.color}
              active={modeFilter === opt.name}
              onClick={() =>
                setModeFilter(modeFilter === opt.name ? null : opt.name)
              }
            />
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold text-slate-300">
        <input
          type="checkbox"
          checked={includeDisabled}
          onChange={(e) => {
            haptic.light();
            setIncludeDisabled(e.target.checked);
          }}
          className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#facc15] focus:ring-[#facc15]"
        />
        {t("encyclopedia.map.disabled")}
      </label>

      <p className="text-[11px] font-bold text-slate-400" aria-live="polite">
        {filtered.length} / {maps.length}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-300">
          {t("encyclopedia.state.empty")}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {filtered.map((map) => (
            <li key={map.id}>
              <MapCard map={map} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic.light();
        onClick();
      }}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
        active
          ? "border-[#facc15] bg-[#facc15]/15 text-[#facc15]"
          : "border-white/10 bg-white/[0.04] text-slate-300 active:bg-white/10"
      }`}
      style={
        active && color
          ? { borderColor: color, color, backgroundColor: `${color}20` }
          : undefined
      }
    >
      {label}
    </button>
  );
}
