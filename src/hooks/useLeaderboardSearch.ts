import { useEffect, useMemo, useState } from "react";
import { isTagLikeQuery } from "../utils/highlightText";
import type { SearchSuggestion } from "../components/SearchBar";
import { useI18n } from "../context/I18nContext";

export type SearchableKind = "players" | "clubs";

export interface SearchableItem {
  tag: string;
  name: string;
  rank: number;
  trophies: number;
  /** Player ranking has `club: { name }` — for substring matches by club name. */
  club?: { name?: string };
  /** Club ranking has memberCount — used for sublabel formatting. */
  memberCount?: number;
}

interface UseLeaderboardSearchOptions<T extends SearchableItem> {
  items: T[];
  searchHistory: string[];
  kind: SearchableKind;
  /** Cap of local suggestions shown in dropdown (default 5). */
  maxLocal?: number;
  /** Cap of history suggestions shown when input is empty (default 4). */
  maxHistory?: number;
  /** Debounce window in ms (default 300). */
  debounceMs?: number;
}

interface UseLeaderboardSearchApi<T extends SearchableItem> {
  query: string;
  setQuery: (next: string) => void;
  debouncedQuery: string;
  /** Same as `items` filtered by `debouncedQuery` (>=2 chars), preserving rank order. */
  filtered: T[];
  /** Local + API + history suggestions, ready for `<SearchBar>` dropdown. */
  suggestions: SearchSuggestion[];
  /** True when current `query` looks like a player/club tag. */
  isTagFormat: boolean;
  /** True when query is short and we treat it as no-op for filtering. */
  isShort: boolean;
  /** Reset query to empty. */
  clear: () => void;
}

function formatTrophiesIntl(value: number, intl: string): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return new Intl.NumberFormat(intl).format(value);
}

function formatLocalSublabel<T extends SearchableItem>(
  item: T,
  kind: SearchableKind,
  intl: string
): string {
  const tag = item.tag.startsWith("#") ? item.tag : `#${item.tag}`;
  const trophy = `${formatTrophiesIntl(item.trophies, intl)}🏆`;
  if (kind === "clubs" && item.memberCount !== undefined) {
    return `${tag} · ${trophy} · ${item.memberCount}/30`;
  }
  if (item.club?.name) {
    return `${tag} · ${trophy} · ${item.club.name}`;
  }
  return `${tag} · ${trophy}`;
}

export function useLeaderboardSearch<T extends SearchableItem>(
  opts: UseLeaderboardSearchOptions<T>
): UseLeaderboardSearchApi<T> {
  const {
    items,
    searchHistory,
    kind,
    maxLocal = 5,
    maxHistory = 4,
    debounceMs = 300,
  } = opts;

  const { t, intlLocale } = useI18n();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(handle);
  }, [query, debounceMs]);

  const isTagFormat = useMemo(() => isTagLikeQuery(query), [query]);
  const isShort = query.trim().length > 0 && query.trim().length < 2;

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (q.length < 2) return items;
    return items.filter((it) => {
      if (it.name.toLowerCase().includes(q)) return true;
      if (it.tag.toLowerCase().includes(q)) return true;
      if (kind === "players" && it.club?.name?.toLowerCase().includes(q))
        return true;
      return false;
    });
  }, [items, debouncedQuery, kind]);

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const out: SearchSuggestion[] = [];
    const trimmed = query.trim();

    if (!trimmed) {
      const seen = new Set<string>();
      for (const tag of searchHistory) {
        if (seen.has(tag)) continue;
        seen.add(tag);
        if (out.length >= maxHistory) break;
        out.push({
          id: `history:${tag}`,
          type: "history",
          label: tag.startsWith("#") ? tag : `#${tag}`,
          sublabel: t("search.historyHint"),
        });
      }
      return out;
    }

    if (isShort) {
      out.push({
        id: "info:short",
        type: "info",
        label: t("search.minChars"),
        sublabel: t("search.minCharsHint"),
        disabled: true,
      });
      return out;
    }

    if (isTagFormat) {
      const cleaned = trimmed.replace(/^#+/, "").toUpperCase();
      out.push({
        id: `api:tag:${cleaned}`,
        type: "api",
        label: t("search.findTag", { tag: cleaned }),
        sublabel:
          kind === "clubs" ? t("search.apiClubLookup") : t("search.apiPlayerLookup"),
      });
    }

    const lower = trimmed.toLowerCase();
    const localMatches = items
      .filter((it) => {
        if (it.name.toLowerCase().includes(lower)) return true;
        if (it.tag.toLowerCase().includes(lower)) return true;
        if (kind === "players" && it.club?.name?.toLowerCase().includes(lower))
          return true;
        return false;
      })
      .slice(0, maxLocal);

    for (const item of localMatches) {
      out.push({
        id: `local:${item.tag}`,
        type: "local",
        label: item.name,
        sublabel: formatLocalSublabel(item, kind, intlLocale),
        meta: `#${item.rank}`,
      });
    }

    if (localMatches.length === 0 && !isTagFormat) {
      out.push({
        id: "info:nolocal",
        type: "info",
        label:
          kind === "clubs" ? t("search.notFoundClubs") : t("search.notFoundPlayers"),
        sublabel: t("search.tryFullTag"),
        disabled: true,
      });
      out.push({
        id: `api:fallback:${trimmed}`,
        type: "api",
        label: `${
          kind === "clubs" ? t("search.apiSearchClubs") : t("search.apiSearchPlayers")
        }: "${trimmed}"`,
        sublabel: t("search.onlyFullTag"),
        disabled: true,
      });
    }

    const totalLocal = items.filter((it) => {
      const l = lower;
      return (
        it.name.toLowerCase().includes(l) ||
        it.tag.toLowerCase().includes(l) ||
        (kind === "players" && it.club?.name?.toLowerCase().includes(l))
      );
    }).length;
    if (totalLocal > maxLocal) {
      out.push({
        id: "info:more",
        type: "more",
        label: t("search.moreMatches", { count: totalLocal - maxLocal }),
        sublabel: t("search.closeToSeeAll"),
        disabled: true,
      });
    }

    return out;
  }, [
    query,
    items,
    searchHistory,
    isTagFormat,
    isShort,
    kind,
    maxLocal,
    maxHistory,
    t,
    intlLocale,
  ]);

  return {
    query,
    setQuery,
    debouncedQuery,
    filtered,
    suggestions,
    isTagFormat,
    isShort,
    clear: () => setQuery(""),
  };
}
