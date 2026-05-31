import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Crown,
  Locate,
  RefreshCw,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { haptic } from "../hooks/useHaptic";
import {
  useClubLeaderboard,
  useLeaderboard,
} from "../hooks/useLeaderboard";
import {
  useLeaderboardSearch,
  type SearchableItem,
} from "../hooks/useLeaderboardSearch";
import { useScrollDirection } from "../hooks/useScrollDirection";
import { useUrlState } from "../hooks/useUrlState";
import { trackAchievementEvent } from "../hooks/useAchievements";
import { updateUrl } from "../navigation/urlState";
import { getCountryMeta } from "../data/countries";
import { useI18n } from "../context/I18nContext";
import { useTranslation } from "../hooks/useTranslation";
import { isTagLikeQuery } from "../utils/highlightText";
import LeaderboardList from "../components/LeaderboardList";
import ClubLeaderboardList from "../components/ClubLeaderboardList";
import CountryPicker from "../components/CountryPicker";
import SearchBar, { type SearchSuggestion } from "../components/SearchBar";
import MyPositionCard from "../components/MyPositionCard";
import EmptyState from "../components/EmptyState";
import type { ContextMenuItem } from "../components/ContextMenu";
import type { ClubRanking, PlayerRanking } from "../types";

type LeaderboardKind = "players" | "clubs";

export default function LeadersScreen() {
  const { t } = useTranslation();
  const { formatRelativeTime, formatNumber } = useI18n();

  const SUB_TABS: Array<{ id: LeaderboardKind; label: string; icon: ReactNode }> = [
    { id: "players", label: t("leaders.players"), icon: <Trophy className="h-3.5 w-3.5" /> },
    { id: "clubs", label: t("leaders.clubs"), icon: <Users className="h-3.5 w-3.5" /> },
  ];

  type RankFilter = "all" | "top10" | "top50" | "top100";

  const RANK_FILTERS: Array<{ id: RankFilter; label: string; max: number }> = [
    { id: "all", label: t("leaders.filters.all"), max: Infinity },
    { id: "top10", label: t("leaders.filters.top10"), max: 10 },
    { id: "top50", label: t("leaders.filters.top50"), max: 50 },
    { id: "top100", label: t("leaders.filters.top100"), max: 100 },
  ];

  const {
    handleQuery,
    setActiveTab,
    myPlayer,
    favorites,
    addFavorite,
    removeFavorite,
    playerData,
    searchHistory,
    removeFromHistory,
  } = usePlayer();
  const { showInfo, showSuccess, showError } = useToast();
  const urlState = useUrlState();

  const [kind, setKind] = useState<LeaderboardKind>(
    urlState.leaderboard_type ?? "players"
  );

  const playersApi = useLeaderboard(urlState.leaderboard ?? undefined);
  const clubsApi = useClubLeaderboard(urlState.leaderboard ?? undefined);
  const active = kind === "players" ? playersApi : clubsApi;

  const playerSearch = useLeaderboardSearch<PlayerRanking>({
    items: playersApi.items as PlayerRanking[],
    searchHistory,
    kind: "players",
  });
  const clubSearch = useLeaderboardSearch<ClubRanking & SearchableItem>({
    items: clubsApi.items.map((c) => ({ ...c })) as Array<
      ClubRanking & SearchableItem
    >,
    searchHistory,
    kind: "clubs",
  });
  const search = kind === "players" ? playerSearch : clubSearch;

  const [rankFilter, setRankFilter] = useState<RankFilter>("all");
  const [pulseTag, setPulseTag] = useState<string | null>(null);
  const [apiPending, setApiPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const playerRowRefs = useMemo(() => new Map<string, HTMLDivElement | null>(), []);
  const clubRowRefs = useMemo(() => new Map<string, HTMLDivElement | null>(), []);
  const lastSelfRankRef = useRef<number | null>(null);
  const lastMyClubRankRef = useRef<number | null>(null);
  const lastSearchAchievementRef = useRef<string>("");
  const apiSearchSeenRef = useRef<Set<string>>(new Set());

  const scrollDirection = useScrollDirection(12);
  const stickyHidden = scrollDirection === "down";

  // Apply initial search query from URL exactly once (per kind switch).
  const appliedUrlSearchRef = useRef<string | null>(null);
  useEffect(() => {
    const q = urlState.leaderboard_search;
    if (!q || appliedUrlSearchRef.current === q) return;
    appliedUrlSearchRef.current = q;
    search.setQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlState.leaderboard_search]);

  // Achievements: fire `leaderboard_search` once per unique debounced query (>=2).
  useEffect(() => {
    const key = `${kind}:${search.debouncedQuery.trim().toLowerCase()}`;
    if (search.debouncedQuery.trim().length < 2) return;
    if (lastSearchAchievementRef.current === key) return;
    lastSearchAchievementRef.current = key;
    trackAchievementEvent("leaderboard_search");
  }, [search.debouncedQuery, kind]);

  // Track tab views.
  useEffect(() => {
    if (kind === "players") trackAchievementEvent("leaderboard_view");
    else trackAchievementEvent("club_leaderboard_view");
  }, [kind]);

  // Sync country & kind → URL.
  useEffect(() => {
    if (
      urlState.leaderboard !== active.country ||
      urlState.leaderboard_type !== (kind === "clubs" ? "clubs" : undefined)
    ) {
      updateUrl(
        {
          leaderboard: active.country,
          leaderboard_type: kind === "clubs" ? "clubs" : undefined,
        },
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.country, kind]);

  // Sync URL → state for back/forward.
  useEffect(() => {
    if (urlState.leaderboard && urlState.leaderboard !== active.country) {
      active.setCountry(urlState.leaderboard);
    }
    if (urlState.leaderboard_type && urlState.leaderboard_type !== kind) {
      setKind(urlState.leaderboard_type);
    }
  }, [urlState.leaderboard, urlState.leaderboard_type, active, kind]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // «У топі!» — players.
  useEffect(() => {
    if (kind !== "players" || !myPlayer.tag || playersApi.items.length === 0) return;
    const rank = playersApi.getPlayerRank(myPlayer.tag);
    if (rank && lastSelfRankRef.current !== rank) {
      lastSelfRankRef.current = rank;
      trackAchievementEvent("leaderboard_self_found", { rank });
    }
  }, [kind, myPlayer.tag, playersApi]);

  // «Клуб у топі» — clubs.
  const myClubTag = playerData?.club?.tag ?? null;
  useEffect(() => {
    if (kind !== "clubs" || !myClubTag || clubsApi.items.length === 0) return;
    const rank = clubsApi.getClubRank(myClubTag);
    if (rank && lastMyClubRankRef.current !== rank) {
      lastMyClubRankRef.current = rank;
      trackAchievementEvent("my_club_found", { rank });
    }
  }, [kind, myClubTag, clubsApi]);

  // Apply rank filter on top of debounced search.
  const filteredPlayers = useMemo(() => {
    const cap = RANK_FILTERS.find((f) => f.id === rankFilter)?.max ?? Infinity;
    return playerSearch.filtered.filter((r) => r.rank <= cap);
  }, [playerSearch.filtered, rankFilter]);

  const filteredClubs = useMemo(() => {
    const cap = RANK_FILTERS.find((f) => f.id === rankFilter)?.max ?? Infinity;
    return clubSearch.filtered.filter((r) => r.rank <= cap);
  }, [clubSearch.filtered, rankFilter]);

  const favoriteTags = useMemo(
    () => new Set(favorites.map((f) => f.tag.replace(/^#+/, "").toUpperCase())),
    [favorites]
  );

  const myRank = myPlayer.tag ? playersApi.getPlayerRank(myPlayer.tag) : null;
  const myClubRank = myClubTag ? clubsApi.getClubRank(myClubTag) : null;

  const meta = getCountryMeta(active.country);

  // ── Actions ─────────────────────────────────────────────────────────
  const triggerPulse = useCallback((tag: string) => {
    const norm = tag.replace(/^#+/, "").toUpperCase();
    setPulseTag(norm);
    setTimeout(() => setPulseTag(null), 1800);
  }, []);

  const scrollToTag = useCallback(
    (tag: string, refs: Map<string, HTMLDivElement | null>): boolean => {
      const norm = tag.replace(/^#+/, "").toUpperCase();
      const node = refs.get(norm);
      if (!node) return false;
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      triggerPulse(norm);
      return true;
    },
    [triggerPulse]
  );

  const apiPlayerLookup = useCallback(
    async (tagInput: string) => {
      if (apiPending) return;
      const tag = tagInput.trim();
      setApiPending(true);
      const inFlightKey = `players:${tag.replace(/^#+/, "").toUpperCase()}`;
      try {
        const ok = await handleQuery(tag, { navigateHome: false });
        if (ok) {
          showSuccess(t("leaders.foundViaApi", { name: tag }));
          setActiveTab("home");
          haptic.success();
          if (!apiSearchSeenRef.current.has(inFlightKey)) {
            apiSearchSeenRef.current.add(inFlightKey);
            trackAchievementEvent("leaderboard_api_search", { found: true });
          }
        } else {
          showError(t("leaders.apiNotFound"));
          haptic.error();
          trackAchievementEvent("leaderboard_api_search", { found: false });
        }
      } finally {
        setApiPending(false);
      }
    },
    [apiPending, handleQuery, setActiveTab, showError, showSuccess, t]
  );

  const handleSelectPlayer = useCallback(
    async (ranking: PlayerRanking) => {
      const ok = await handleQuery(ranking.tag, { navigateHome: false });
      if (ok) {
        showInfo(t("leaders.foundLoaded", { name: ranking.name }));
        setActiveTab("home");
      } else {
        showError(t("leaders.failedLoadProfile"));
      }
    },
    [handleQuery, showInfo, showError, setActiveTab, t]
  );

  const handleSelectClub = useCallback(
    (ranking: ClubRanking) => {
      const norm = ranking.tag.replace(/^#+/, "").toUpperCase();
      updateUrl({ club: norm });
      showInfo(t("leaders.openingClub", { name: ranking.name }));
    },
    [showInfo, t]
  );

  const handleSuggestionSelect = useCallback(
    (s: SearchSuggestion) => {
      if (s.disabled) return;
      if (s.type === "history") {
        const tag = s.label.replace(/^#+/, "");
        search.setQuery(tag);
        return;
      }
      if (s.type === "api") {
        const tag = s.label.replace(/^.*?#/, "#").trim();
        const candidate = tag.startsWith("#") ? tag : s.label.split('"')[1] ?? "";
        if (candidate && isTagLikeQuery(candidate)) {
          apiPlayerLookup(candidate);
        } else {
          showInfo(t("search.enterFullTag"));
        }
        return;
      }
      if (s.type === "local") {
        const tag = s.id.replace(/^local:/, "");
        if (kind === "players") {
          const found = scrollToTag(tag, playerRowRefs);
          if (!found) {
            const ranking = playersApi.items.find((r) => r.tag === tag);
            if (ranking) handleSelectPlayer(ranking);
          }
        } else {
          const found = scrollToTag(tag, clubRowRefs);
          if (!found) {
            const ranking = clubsApi.items.find((r) => r.tag === tag);
            if (ranking) handleSelectClub(ranking);
          }
        }
      }
    },
    [
      search,
      kind,
      apiPlayerLookup,
      playerRowRefs,
      clubRowRefs,
      playersApi.items,
      clubsApi.items,
      handleSelectPlayer,
      handleSelectClub,
      scrollToTag,
      showInfo,
      t,
    ]
  );

  const handleSearchSubmit = useCallback(
    (value: string) => {
      const cleaned = value.trim();
      if (!cleaned) return;
      if (isTagLikeQuery(cleaned)) {
        apiPlayerLookup(cleaned);
        return;
      }
      const lower = cleaned.toLowerCase();
      if (kind === "players") {
        const first = playersApi.items.find(
          (r) =>
            r.name.toLowerCase().includes(lower) ||
            r.tag.toLowerCase().includes(lower)
        );
        if (first) {
          scrollToTag(first.tag, playerRowRefs);
        } else {
          showInfo(t("search.nothingFoundTop"));
        }
      } else {
        const first = clubsApi.items.find(
          (r) =>
            r.name.toLowerCase().includes(lower) ||
            r.tag.toLowerCase().includes(lower)
        );
        if (first) {
          scrollToTag(first.tag, clubRowRefs);
        } else {
          showInfo(t("search.clubsNotFound"));
        }
      }
    },
    [
      apiPlayerLookup,
      kind,
      playersApi.items,
      clubsApi.items,
      playerRowRefs,
      clubRowRefs,
      scrollToTag,
      showInfo,
      t,
    ]
  );

  const handleScrollToMe = useCallback(() => {
    if (kind === "players") {
      if (!myPlayer.tag) {
        showInfo(t("leaders.setProfileFirst"));
        return;
      }
      const rank = playersApi.getPlayerRank(myPlayer.tag);
      haptic.medium();
      if (!rank) {
        showInfo(t("leaders.notFoundInTop"));
        return;
      }
      const ok = scrollToTag(myPlayer.tag, playerRowRefs);
      if (ok) showSuccess(t("leaders.youAreOn", { rank }));
      else showInfo(t("search.rankFound", { rank }));
    } else {
      if (!myClubTag) {
        showInfo(t("leaders.noClubYet"));
        return;
      }
      const rank = clubsApi.getClubRank(myClubTag);
      haptic.medium();
      if (!rank) {
        showInfo(t("leaders.clubNotFoundInTop"));
        return;
      }
      const ok = scrollToTag(myClubTag, clubRowRefs);
      if (ok) showSuccess(t("leaders.yourClubOn", { rank }));
      else showInfo(t("search.clubRankFound", { rank }));
    }
  }, [
    kind,
    myPlayer.tag,
    myClubTag,
    playersApi,
    clubsApi,
    playerRowRefs,
    clubRowRefs,
    showInfo,
    showSuccess,
    scrollToTag,
    t,
  ]);

  const handleRefresh = useCallback(async () => {
    haptic.medium();
    await active.refresh();
    showInfo(t("leaders.refreshed"));
  }, [active, showInfo, t]);

  const handleCountryChange = useCallback(
    (code: string) => {
      playersApi.setCountry(code);
      clubsApi.setCountry(code);
      lastSelfRankRef.current = null;
      lastMyClubRankRef.current = null;
      search.clear();
      setRankFilter("all");
    },
    [playersApi, clubsApi, search]
  );

  const handleKindChange = useCallback(
    (next: LeaderboardKind) => {
      if (next === kind) return;
      haptic.selection();
      setKind(next);
      setRankFilter("all");
    },
    [kind]
  );

  const buildPlayerContextMenu = useCallback(
    (ranking: PlayerRanking): ContextMenuItem[] => {
      const norm = ranking.tag.replace(/^#+/, "").toUpperCase();
      const fav = favoriteTags.has(norm);
      return [
        {
          id: "open",
          label: t("common.open"),
          icon: <Search className="h-4 w-4 text-[#a78bfa]" />,
          onClick: () => handleSelectPlayer(ranking),
        },
        {
          id: "favorite",
          label: fav ? t("toast.removedFromFavorites") : t("toast.addedToFavorites"),
          icon: <Trophy className="h-4 w-4 text-[#facc15]" />,
          onClick: () => {
            if (fav) {
              removeFavorite(ranking.tag);
              showInfo(t("toast.removedFromFavorites"));
            } else {
              const ok = addFavorite(ranking.tag, { originalName: ranking.name });
              if (ok) showSuccess(t("toast.addedToFavorites"));
            }
          },
        },
      ];
    },
    [
      favoriteTags,
      handleSelectPlayer,
      addFavorite,
      removeFavorite,
      showInfo,
      showSuccess,
      t,
    ]
  );

  const buildClubContextMenu = useCallback(
    (ranking: ClubRanking): ContextMenuItem[] => [
      {
        id: "open",
        label: t("common.open"),
        icon: <Users className="h-4 w-4 text-[#a78bfa]" />,
        onClick: () => handleSelectClub(ranking),
      },
    ],
    [handleSelectClub, t]
  );

  // Decide whether to show MyPositionCard (out-of-top scenario).
  const showMyPositionCard =
    kind === "players" &&
    !!myPlayer.tag &&
    !!playerData &&
    playerData.tag.replace(/^#+/, "").toUpperCase() ===
      myPlayer.tag.replace(/^#+/, "").toUpperCase() &&
    playersApi.items.length > 5 &&
    myRank == null;

  const findMeLabel = kind === "players" ? t("leaders.findMe") : t("leaders.findMyClub");
  const findMeAvailable = kind === "players" ? !!myPlayer.tag : !!myClubTag;
  const findMeRank = kind === "players" ? myRank : myClubRank;

  const top = active.items[0];
  const last = active.items[active.items.length - 1];

  return (
    <div className="space-y-4 px-4 pb-6 pt-4">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-black uppercase tracking-widest text-white">
            {t("leaders.title")}
          </h1>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={active.isLoading || active.isRefreshing}
            aria-label={t("common.refresh")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#2a1a4a] text-slate-300 transition-transform active:scale-95 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${active.isRefreshing || active.isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <div
          className="relative grid grid-cols-2 gap-1 rounded-2xl border border-white/5 bg-[#1a0a2e]/60 p-1"
          role="tablist"
          aria-label={t("leaders.title")}
        >
          {SUB_TABS.map((t) => {
            const isActive = kind === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleKindChange(t.id)}
                className={`relative z-10 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${
                  isActive ? "text-[#1a0a2e]" : "text-slate-400 active:text-slate-200"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="leadersSubTab"
                    className="absolute inset-0 rounded-xl bg-[#facc15] shadow-[0_0_18px_rgba(250,204,21,0.35)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {t.icon}
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CountryPicker value={active.country} onChange={handleCountryChange} />
          {findMeAvailable && (
            <button
              type="button"
              onClick={handleScrollToMe}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#facc15]/40 bg-[#facc15]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#facc15] active:scale-95"
              aria-label={findMeLabel}
            >
              <Locate className="h-3.5 w-3.5" />
              {findMeLabel}
              {typeof findMeRank === "number" && (
                <span className="rounded-full bg-[#facc15] px-1.5 py-0.5 text-[#1a0a2e]">
                  #{findMeRank}
                </span>
              )}
            </button>
          )}
          {active.fetchedAt && (
            <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {formatRelativeTime(active.fetchedAt, now)}
            </span>
          )}
        </div>
      </header>

      <motion.div
        className="sticky top-0 z-20 -mx-4 px-4 pb-2 pt-2 bg-[#1a0a2e]/95 backdrop-blur"
        animate={{
          opacity: stickyHidden ? 0.55 : 1,
          y: stickyHidden ? -2 : 0,
        }}
        transition={{ duration: 0.2 }}
      >
        <SearchBar
          value={search.query}
          onChange={search.setQuery}
          onSubmit={handleSearchSubmit}
          onClear={() => search.clear()}
          placeholder={
            kind === "players"
              ? t("leaders.searchPlaceholderPlayers")
              : t("leaders.searchPlaceholderClubs")
          }
          suggestions={search.suggestions}
          onSuggestionSelect={handleSuggestionSelect}
          onRemoveHistory={(label) => removeFromHistory(label)}
          isApiPending={apiPending}
          alwaysShowOnFocus
          footer={
            <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {RANK_FILTERS.map((f) => {
                const isActive = rankFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setRankFilter(f.id);
                    }}
                    className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
                      isActive
                        ? "border-[#facc15] bg-[#facc15] text-[#1a0a2e]"
                        : "border-white/10 bg-white/5 text-slate-400"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          }
        />
      </motion.div>

      {(active.isDemo || active.isStale || active.error) && (
        <motion.div
          layout
          className="flex items-start gap-2 rounded-2xl border border-[#facc15]/30 bg-[#facc15]/5 p-3 text-[11px] text-[#facc15]"
        >
          <Crown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="leading-snug">
            {active.isDemo
              ? t("leaders.demoMode")
              : active.isStale
                ? t("leaders.staleData")
                : active.error}
          </p>
        </motion.div>
      )}

      {showMyPositionCard && playerData && (
        <MyPositionCard
          player={playerData}
          leaderboard={playersApi.items}
          countryCode={active.country}
          onChangeCountry={handleCountryChange}
          knownRank={myRank}
        />
      )}

      {top && last && (
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label={t("leaders.top1")}
            value={`${formatNumber(top.trophies)}🏆`}
            sub={top.name}
            accent="text-[#facc15]"
          />
          <StatCard
            label={t("leaders.statTop", { rank: last.rank })}
            value={`${formatNumber(last.trophies)}🏆`}
            sub={`${meta.flag} ${meta.name}`}
            accent="text-[#a78bfa]"
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={kind}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {kind === "players" ? (
            filteredPlayers.length === 0 && search.query.trim() ? (
              <EmptyState
                compact
                illustration="🔎"
                title={t("leaders.nothingFoundTop")}
                description={
                  isTagLikeQuery(search.query)
                    ? t("leaders.apiTagHint")
                    : t("leaders.tryFullTag")
                }
                action={
                  isTagLikeQuery(search.query)
                    ? {
                        label: t("leaders.searchViaApi"),
                        onClick: () => apiPlayerLookup(search.query),
                      }
                    : {
                        label: t("common.reset"),
                        onClick: () => search.clear(),
                        variant: "secondary",
                      }
                }
              />
            ) : (
              <LeaderboardList
                rankings={filteredPlayers}
                isLoading={playersApi.isLoading}
                highlightedTags={{
                  mine: myPlayer.tag,
                  favorites: favoriteTags,
                }}
                rowRefs={playerRowRefs}
                onSelectPlayer={handleSelectPlayer}
                buildContextMenu={buildPlayerContextMenu}
                highlightQuery={search.debouncedQuery}
                pulseTag={pulseTag}
                emptyTitle={t("leaders.notFoundInTop")}
                emptyDescription={`${meta.flag} ${meta.name}`}
                emptyAction={{
                  label: t("leaders.global"),
                  onClick: () => handleCountryChange("global"),
                }}
              />
            )
          ) : filteredClubs.length === 0 && search.query.trim() ? (
            <EmptyState
              compact
              illustration="🔎"
              title={t("search.clubsNotFound")}
              description={t("leaders.tryFullTag")}
              action={{
                label: t("common.reset"),
                onClick: () => search.clear(),
                variant: "secondary",
              }}
            />
          ) : (
            <ClubLeaderboardList
              rankings={filteredClubs}
              isLoading={clubsApi.isLoading}
              myClubTag={myClubTag}
              rowRefs={clubRowRefs}
              onSelectClub={handleSelectClub}
              buildContextMenu={buildClubContextMenu}
              highlightQuery={search.debouncedQuery}
              pulseTag={pulseTag}
              emptyTitle={t("search.clubsNotFound")}
              emptyDescription={`${meta.flag} ${meta.name}`}
              emptyAction={{
                label: t("leaders.global"),
                onClick: () => handleCountryChange("global"),
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <p className="pt-1 text-center text-[10px] text-slate-600">
        {meta.flag} {meta.name} ·{" "}
        {kind === "players" ? t("leaders.players").toLowerCase() : t("leaders.clubs").toLowerCase()} ·{" "}
        {t("leaders.updatedEvery5")}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-base font-black tabular-nums ${accent ?? "text-white"}`}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 truncate text-[10px] text-slate-400">{sub}</p>
      )}
    </div>
  );
}
