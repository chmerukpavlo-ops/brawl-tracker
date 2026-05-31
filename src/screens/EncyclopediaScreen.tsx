import { lazy, Suspense, useDeferredValue, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search as SearchIcon, X } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import { haptic } from "../hooks/useHaptic";
import {
  useBrawlersQuery,
  useEventsQuery,
  useGameModesQuery,
  useMapsQuery,
} from "../hooks/queries/useEncyclopediaQueries";
import type {
  BrawlifyBrawler,
  BrawlifyGameMode,
  BrawlifyMap,
} from "../types/brawlify";
import {
  buildSearchIndex,
  groupHits,
  searchIndex,
} from "../utils/searchIndex";

// Lazy-load tab panels — keeps the encyclopedia chunk small and lets
// each section paint independently.
const BrawlerList = lazy(
  () => import("../components/encyclopedia/BrawlerList")
);
const GameModeList = lazy(
  () => import("../components/encyclopedia/GameModeList")
);
const MapList = lazy(() => import("../components/encyclopedia/MapList"));
const ActiveEventsList = lazy(
  () => import("../components/encyclopedia/ActiveEventsList")
);
const BrawlerEncyclopediaSheet = lazy(
  () => import("../components/encyclopedia/BrawlerEncyclopediaSheet")
);
const GameModeSheet = lazy(
  () => import("../components/encyclopedia/GameModeSheet")
);
const MapSheet = lazy(() => import("../components/encyclopedia/MapSheet"));

type Section = "brawlers" | "modes" | "maps" | "events";
const SECTIONS: Section[] = ["brawlers", "modes", "maps", "events"];

export default function EncyclopediaScreen() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>("brawlers");
  const [globalQuery, setGlobalQuery] = useState("");
  const deferredGlobalQuery = useDeferredValue(globalQuery);

  const brawlersQ = useBrawlersQuery();
  const modesQ = useGameModesQuery();
  const mapsQ = useMapsQuery();
  const eventsQ = useEventsQuery();

  const brawlers = brawlersQ.data?.data.list ?? [];
  const modes = modesQ.data?.data.list ?? [];
  const maps = mapsQ.data?.data.list ?? [];

  const [activeBrawler, setActiveBrawler] = useState<BrawlifyBrawler | null>(
    null
  );
  const [activeMode, setActiveMode] = useState<BrawlifyGameMode | null>(null);
  const [activeMap, setActiveMap] = useState<BrawlifyMap | null>(null);

  const index = useMemo(
    () => buildSearchIndex({ brawlers, modes, maps }),
    [brawlers, modes, maps]
  );

  const grouped = useMemo(() => {
    const hits = searchIndex(index, deferredGlobalQuery, 24);
    return groupHits(hits);
  }, [index, deferredGlobalQuery]);

  const isAnyLoading =
    brawlersQ.isLoading || modesQ.isLoading || mapsQ.isLoading;
  const hasAnyError =
    brawlersQ.isError && modesQ.isError && mapsQ.isError;

  const openMapById = (mapId: number) => {
    const found = maps.find((m) => m.id === mapId);
    if (found) {
      setActiveMap(found);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-col gap-4 px-4 pb-28 pt-6">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#facc15]">
          {t("encyclopedia.subtitle")}
        </p>
        <h1 className="text-2xl font-black uppercase tracking-wide text-white">
          {t("encyclopedia.title")}
        </h1>
      </header>

      <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
        <SearchIcon className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={globalQuery}
          onChange={(e) => setGlobalQuery(e.target.value)}
          placeholder={t("encyclopedia.search.placeholder")}
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          aria-label={t("encyclopedia.search.placeholder")}
        />
        {globalQuery && (
          <button
            type="button"
            onClick={() => {
              haptic.light();
              setGlobalQuery("");
            }}
            className="text-slate-400 active:opacity-70"
            aria-label={t("common.clear")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      {globalQuery.trim() ? (
        <GlobalSearchResults
          grouped={grouped}
          query={globalQuery}
          onPickBrawler={setActiveBrawler}
          onPickMode={setActiveMode}
          onPickMap={setActiveMap}
        />
      ) : (
        <>
          <nav
            className="flex gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1"
            data-scroll-x
            role="tablist"
            aria-label={t("encyclopedia.title")}
          >
            {SECTIONS.map((id) => {
              const active = section === id;
              return (
                <button
                  key={id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => {
                    if (id !== section) haptic.light();
                    setSection(id);
                  }}
                  className={`relative flex-1 shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors ${
                    active ? "text-black" : "text-slate-300 active:bg-white/10"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="enc-tab-indicator"
                      className="absolute inset-0 rounded-full bg-[#facc15]"
                      transition={{ type: "spring", stiffness: 360, damping: 32 }}
                    />
                  )}
                  <span className="relative">
                    {t(`encyclopedia.sections.${id}`)}
                  </span>
                </button>
              );
            })}
          </nav>

          {isAnyLoading && brawlers.length === 0 && (
            <p className="text-center text-xs text-slate-400">
              {t("encyclopedia.state.loading")}
            </p>
          )}

          {hasAnyError && brawlers.length === 0 && (
            <ErrorBlock
              onRetry={() => {
                haptic.medium();
                brawlersQ.refetch();
                modesQ.refetch();
                mapsQ.refetch();
                eventsQ.refetch();
              }}
            />
          )}

          {(brawlersQ.data?.stale ||
            modesQ.data?.stale ||
            mapsQ.data?.stale ||
            eventsQ.data?.stale) && (
            <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              {t("encyclopedia.state.stale")}
            </p>
          )}

          <Suspense
            fallback={
              <p className="text-center text-xs text-slate-400">
                {t("encyclopedia.state.loading")}
              </p>
            }
          >
            {section === "brawlers" && brawlers.length > 0 && (
              <BrawlerList
                brawlers={brawlers}
                onSelect={setActiveBrawler}
              />
            )}
            {section === "modes" && modes.length > 0 && (
              <GameModeList modes={modes} onSelect={setActiveMode} />
            )}
            {section === "maps" && maps.length > 0 && (
              <MapList maps={maps} onSelect={setActiveMap} />
            )}
            {section === "events" && (
              <ActiveEventsList
                active={eventsQ.data?.data.active ?? []}
                upcoming={eventsQ.data?.data.upcoming ?? []}
                onSelectMap={openMapById}
              />
            )}
          </Suspense>
        </>
      )}

      <p className="pt-3 text-center text-[10px] text-slate-500">
        {t("encyclopedia.credit")}
      </p>

      <Suspense fallback={null}>
        <BrawlerEncyclopediaSheet
          brawler={activeBrawler}
          open={!!activeBrawler}
          onClose={() => setActiveBrawler(null)}
        />
        <GameModeSheet
          mode={activeMode}
          open={!!activeMode}
          onClose={() => setActiveMode(null)}
          maps={maps}
          onSelectMap={(map) => {
            setActiveMode(null);
            setActiveMap(map);
          }}
        />
        <MapSheet
          map={activeMap}
          open={!!activeMap}
          onClose={() => setActiveMap(null)}
        />
      </Suspense>
    </main>
  );
}

interface GlobalSearchResultsProps {
  grouped: ReturnType<typeof groupHits>;
  query: string;
  onPickBrawler: (b: BrawlifyBrawler) => void;
  onPickMode: (m: BrawlifyGameMode) => void;
  onPickMap: (m: BrawlifyMap) => void;
}

function GlobalSearchResults({
  grouped,
  query,
  onPickBrawler,
  onPickMode,
  onPickMap,
}: GlobalSearchResultsProps) {
  const { t } = useTranslation();
  const total =
    grouped.brawlers.length + grouped.modes.length + grouped.maps.length;

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-slate-300">
        {t("encyclopedia.search.empty", { query })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.brawlers.length > 0 && (
        <ResultGroup
          title={t("encyclopedia.search.groupBrawlers")}
          count={grouped.brawlers.length}
        >
          {grouped.brawlers.map((hit) =>
            hit.type === "brawler" ? (
              <ResultRow
                key={`b-${hit.id}`}
                title={hit.name}
                subtitle={hit.brawler.rarity?.name ?? ""}
                accent={hit.brawler.rarity?.color}
                imageUrl={hit.brawler.imageUrl}
                onClick={() => onPickBrawler(hit.brawler)}
              />
            ) : null
          )}
        </ResultGroup>
      )}
      {grouped.modes.length > 0 && (
        <ResultGroup
          title={t("encyclopedia.search.groupModes")}
          count={grouped.modes.length}
        >
          {grouped.modes.map((hit) =>
            hit.type === "gameMode" ? (
              <ResultRow
                key={`m-${hit.id}`}
                title={hit.name}
                subtitle={hit.mode.shortDescription ?? ""}
                accent={hit.mode.color}
                imageUrl={hit.mode.imageUrl}
                onClick={() => onPickMode(hit.mode)}
              />
            ) : null
          )}
        </ResultGroup>
      )}
      {grouped.maps.length > 0 && (
        <ResultGroup
          title={t("encyclopedia.search.groupMaps")}
          count={grouped.maps.length}
        >
          {grouped.maps.map((hit) =>
            hit.type === "map" ? (
              <ResultRow
                key={`p-${hit.id}`}
                title={hit.name}
                subtitle={hit.map.gameMode?.name ?? ""}
                accent={hit.map.gameMode?.color}
                imageUrl={hit.map.imageUrl}
                onClick={() => onPickMap(hit.map)}
              />
            ) : null
          )}
        </ResultGroup>
      )}
    </div>
  );
}

function ResultGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
        {title} · {count}
      </p>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function ResultRow({
  title,
  subtitle,
  imageUrl,
  accent,
  onClick,
}: {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  accent?: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          haptic.light();
          onClick();
        }}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2 text-left active:bg-white/10"
      >
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10"
          style={{ backgroundColor: accent ? `${accent}22` : "rgba(255,255,255,0.04)" }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-contain"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="text-xs font-black text-white">
              {title.charAt(0)}
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{title}</p>
          {subtitle && (
            <p
              className="truncate text-[11px] font-bold uppercase tracking-widest"
              style={{ color: accent || "#94a3b8" }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </button>
    </li>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-center text-sm">
      <p className="font-bold text-rose-200">{t("encyclopedia.state.error")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-rose-200 active:opacity-70"
      >
        {t("encyclopedia.state.retry")}
      </button>
    </div>
  );
}
