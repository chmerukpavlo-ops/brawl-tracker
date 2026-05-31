import { useCallback, useMemo, useState } from "react";
import { Loader2, Swords } from "lucide-react";
import { motion } from "motion/react";
import { usePlayer } from "../../context/PlayerContext";
import { useBattleLogQuery } from "../../hooks/queries/useBattleLogQuery";
import {
  EMPTY_FILTERS,
  type BattleFilterState,
  type BattleLogEntry,
  type BattleMode,
} from "../../types/battle";
import {
  applyFilters,
  buildTrophyTimeline,
  computeBattleStats,
  distinctBrawlers,
  distinctModes,
  hasActiveFilters,
} from "../../utils/battleHelpers";
import { useTranslation } from "../../hooks/useTranslation";
import BattleStatsHeader from "./BattleStatsHeader";
import BattleFilters from "./BattleFilters";
import BattleList from "./BattleList";
import BattleDetailSheet from "./BattleDetailSheet";
import ModeBreakdown from "./ModeBreakdown";
import BrawlerBreakdown from "./BrawlerBreakdown";
import Skeleton from "../Skeleton";

/**
 * Mounted in `StatsScreen` as a top-level section. Owns the filter
 * state and the currently inspected battle. The query handles caching
 * + offline hydration; we just consume `data.items`.
 */
export default function BattleLogSection() {
  const { t } = useTranslation();
  const { playerData, isDemoMode } = usePlayer();
  const myTag = playerData?.tag ?? "";

  const query = useBattleLogQuery({
    tag: myTag || null,
    demo: isDemoMode,
    enabled: !!myTag,
  });

  const [filters, setFilters] = useState<BattleFilterState>(EMPTY_FILTERS);
  const [activeEntry, setActiveEntry] = useState<BattleLogEntry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const items = query.data?.items ?? [];
  const showSkeleton = query.isLoading && items.length === 0;

  const filtered = useMemo(
    () => applyFilters(items, filters, myTag),
    [items, filters, myTag]
  );
  const stats = useMemo(
    () => computeBattleStats(filtered, myTag),
    [filtered, myTag]
  );
  const timeline = useMemo(() => buildTrophyTimeline(filtered), [filtered]);
  const availableModes = useMemo(() => distinctModes(items), [items]);
  const availableBrawlers = useMemo(
    () => distinctBrawlers(items, myTag),
    [items, myTag]
  );

  const handleTap = useCallback((entry: BattleLogEntry) => {
    setActiveEntry(entry);
    setSheetOpen(true);
  }, []);

  const handleFilterMode = useCallback((mode: string) => {
    setFilters((prev) => ({
      ...prev,
      mode: prev.mode === mode ? null : (mode as BattleMode),
    }));
  }, []);
  const handleFilterBrawler = useCallback((brawlerId: number) => {
    setFilters((prev) => ({
      ...prev,
      brawlerId: prev.brawlerId === brawlerId ? null : brawlerId,
    }));
  }, []);
  const handleClearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  if (!playerData) return null;

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Swords className="h-3.5 w-3.5 text-slate-500" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            {t("battles.sectionTitle")}
          </p>
          {query.isFetching && !showSkeleton && (
            <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
          )}
        </div>
        {query.data?.isDemo && (
          <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-fuchsia-200">
            DEMO
          </span>
        )}
      </header>

      {showSkeleton ? (
        <BattleLogSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {items.length > 0 && (
            <>
              <BattleStatsHeader stats={stats} timeline={timeline} />
              <BattleFilters
                filters={filters}
                onChange={setFilters}
                availableModes={availableModes}
                availableBrawlers={availableBrawlers}
              />
            </>
          )}

          <BattleList
            entries={filtered}
            myTag={myTag}
            isUnfilteredEmpty={items.length === 0}
            onTap={handleTap}
            onFilterByMode={handleFilterMode}
            onFilterByBrawler={handleFilterBrawler}
            onClearFilters={
              hasActiveFilters(filters) ? handleClearFilters : undefined
            }
          />

          {items.length > 0 && (
            <>
              <ModeBreakdown
                entries={items}
                onFilterMode={(m) => handleFilterMode(m as string)}
                activeMode={filters.mode}
              />
              <BrawlerBreakdown
                entries={items}
                myTag={myTag}
                onFilterBrawler={handleFilterBrawler}
                activeBrawlerId={filters.brawlerId}
              />
            </>
          )}
        </motion.div>
      )}

      <BattleDetailSheet
        open={sheetOpen}
        entry={activeEntry}
        myTag={myTag}
        onClose={() => setSheetOpen(false)}
      />
    </section>
  );
}

function BattleLogSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton rounded="rounded-2xl" className="h-16" />
          </div>
        ))}
      </div>
      <Skeleton rounded="rounded-2xl" className="h-24" />
      <Skeleton rounded="rounded-full" className="h-7 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton rounded="rounded-2xl" className="h-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
