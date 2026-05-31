import { useDeferredValue, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import BrawlerCard from "./BrawlerCard";
import type { BrawlifyBrawler } from "../../types/brawlify";
import { useTranslation } from "../../hooks/useTranslation";
import { haptic } from "../../hooks/useHaptic";

interface BrawlerListProps {
  brawlers: BrawlifyBrawler[];
  onSelect: (brawler: BrawlifyBrawler) => void;
}

type SortKey = "name" | "rarity" | "newest" | "oldest";

/**
 * Filterable / sortable / searchable brawler grid. The filter state is
 * local to this component because Brawlify never serves more than ~80
 * brawlers, so we don't need URL-state or context.
 *
 * `useDeferredValue` keeps typing snappy on slow devices — the input
 * reacts immediately, while the heavy filter+sort pass yields to React.
 */
export default function BrawlerList({ brawlers, onSelect }: BrawlerListProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("rarity");

  const rarities = useMemo(() => {
    const seen = new Map<string, { name: string; color: string; sort: number }>();
    for (const b of brawlers) {
      if (!b.rarity) continue;
      if (!seen.has(b.rarity.name)) {
        seen.set(b.rarity.name, {
          name: b.rarity.name,
          color: b.rarity.color,
          sort: b.rarity.id,
        });
      }
    }
    return [...seen.values()].sort((a, b) => a.sort - b.sort);
  }, [brawlers]);

  const classes = useMemo(() => {
    const seen = new Map<string, { name: string; sort: number }>();
    for (const b of brawlers) {
      if (!b.class?.name) continue;
      if (!seen.has(b.class.name)) {
        seen.set(b.class.name, { name: b.class.name, sort: b.class.id });
      }
    }
    return [...seen.values()].sort((a, b) => a.sort - b.sort);
  }, [brawlers]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    let list = brawlers;
    if (rarityFilter) list = list.filter((b) => b.rarity?.name === rarityFilter);
    if (classFilter) list = list.filter((b) => b.class?.name === classFilter);
    if (q) list = list.filter((b) => b.name.toLowerCase().includes(q));

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "newest":
          return b.id - a.id;
        case "oldest":
          return a.id - b.id;
        case "rarity":
        default: {
          // Higher rarity id first, then by name within tier.
          const ra = a.rarity?.id ?? 0;
          const rb = b.rarity?.id ?? 0;
          if (ra !== rb) return rb - ra;
          return a.name.localeCompare(b.name);
        }
      }
    });
    return sorted;
  }, [brawlers, rarityFilter, classFilter, sort, deferredQuery]);

  const hasFilters = !!rarityFilter || !!classFilter || !!query;

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

      <div className="space-y-3">
        <FilterRow
          label={t("encyclopedia.filters.rarity")}
          options={rarities.map((r) => ({
            id: r.name,
            label: r.name,
            color: r.color,
          }))}
          value={rarityFilter}
          onChange={setRarityFilter}
        />
        <FilterRow
          label={t("encyclopedia.filters.class")}
          options={classes.map((c) => ({ id: c.name, label: c.name }))}
          value={classFilter}
          onChange={setClassFilter}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <SortPicker sort={sort} setSort={setSort} />
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              haptic.light();
              setRarityFilter(null);
              setClassFilter(null);
              setQuery("");
            }}
            className="text-[11px] font-black uppercase tracking-widest text-[#facc15] active:opacity-70"
          >
            {t("encyclopedia.filters.reset")}
          </button>
        )}
      </div>

      <p
        className="text-[11px] font-bold text-slate-400"
        aria-live="polite"
      >
        {filtered.length} / {brawlers.length}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-sm font-bold text-slate-300">
            {t("encyclopedia.state.empty")}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filtered.map((brawler) => (
            <li key={brawler.id}>
              <BrawlerCard brawler={brawler} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface FilterOption {
  id: string;
  label: string;
  color?: string;
}

interface FilterRowProps {
  label: string;
  options: FilterOption[];
  value: string | null;
  onChange: (next: string | null) => void;
}

function FilterRow({ label, options, value, onChange }: FilterRowProps) {
  const { t } = useTranslation();
  if (options.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" data-scroll-x>
        <FilterChip
          label={t("encyclopedia.filters.all")}
          active={value === null}
          onClick={() => onChange(null)}
        />
        {options.map((opt) => (
          <FilterChip
            key={opt.id}
            label={opt.label}
            color={opt.color}
            active={value === opt.id}
            onClick={() => onChange(opt.id === value ? null : opt.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}

function FilterChip({ label, active, color, onClick }: FilterChipProps) {
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

interface SortPickerProps {
  sort: SortKey;
  setSort: (next: SortKey) => void;
}

function SortPicker({ sort, setSort }: SortPickerProps) {
  const { t } = useTranslation();
  const options: { id: SortKey; label: string }[] = [
    { id: "rarity", label: t("encyclopedia.sort.rarity") },
    { id: "name", label: t("encyclopedia.sort.name") },
    { id: "newest", label: t("encyclopedia.sort.newest") },
    { id: "oldest", label: t("encyclopedia.sort.oldest") },
  ];
  return (
    <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-300">
      {t("encyclopedia.sort.label")}
      <select
        value={sort}
        onChange={(e) => {
          haptic.light();
          setSort(e.target.value as SortKey);
        }}
        className="rounded-lg border border-white/10 bg-[#1a0a2e] px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white outline-none"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
