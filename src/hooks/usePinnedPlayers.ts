import { useCallback, useMemo } from "react";
import {
  PINNED_PLAYERS_LIMIT,
  type FavoritePlayer,
  type PinnedGroup,
} from "../types";
import { useFavorites, type UseFavoritesApi } from "./useFavorites";
import {
  usePinnedGroups,
  type UsePinnedGroupsApi,
} from "./usePinnedGroups";

const UNGROUPED_KEY = "__ungrouped__";

export interface PinnedExportPayload {
  version: 1;
  exportedAt: number;
  pins: FavoritePlayer[];
  groups: PinnedGroup[];
}

export interface ImportSummary {
  added: number;
  skipped: number;
  groupsAdded: number;
  errors: string[];
}

function normalize(tag: string): string {
  return tag.trim().toUpperCase().replace(/^#+/, "");
}

export interface UsePinnedPlayersApi
  extends Pick<
      UseFavoritesApi,
      | "addFavorite"
      | "removeFavorite"
      | "updateFavorite"
      | "isFavorite"
      | "getFavorite"
      | "recordView"
      | "movePinToGroup"
      | "reorderFavorites"
      | "clearFavorites"
    >,
    Pick<
      UsePinnedGroupsApi,
      "createGroup" | "updateGroup" | "reorderGroups" | "getGroup"
    > {
  pinned: FavoritePlayer[];
  groups: PinnedGroup[];
  /** Pins grouped by `groupId` (`__ungrouped__` for items without a group). */
  groupedPinned: Record<string, FavoritePlayer[]>;
  /** Sorted (by group `order`) iterable for rendering with stable keys. */
  groupSections: Array<{
    group: PinnedGroup | null;
    items: FavoritePlayer[];
  }>;
  /** Returns the best display name for a tag (custom > original > tag). */
  getDisplayName: (tag: string, fallback?: string) => string;
  /** Replaces a group with reassignment of its members. */
  deleteGroup: (
    id: string,
    options?: {
      reassignTo?: string | null;
      removeMembers?: boolean;
    }
  ) => void;
  /** Hard cap-aware addPin: returns whether a slot was available. */
  addPin: UseFavoritesApi["addFavorite"];
  /** Alias kept for symmetry with the spec. */
  removePin: UseFavoritesApi["removeFavorite"];
  /** True iff `tag` is in the pinned list. */
  isPinned: UseFavoritesApi["isFavorite"];
  /** Look up a single pin by tag. */
  getPin: UseFavoritesApi["getFavorite"];
  /** Limits used by UI to render counters. */
  limits: { players: number };
  exportPins: () => string;
  importPins: (json: string) => ImportSummary;
}

/**
 * High-level facade over `useFavorites` + `usePinnedGroups`. Add this hook
 * once near the top of the React tree (e.g. inside `PlayerProvider`) and
 * thread the API through context. Calling it in two places will produce two
 * independent state trees that won't react to each other.
 */
export function usePinnedPlayers(): UsePinnedPlayersApi {
  const fav = useFavorites();
  const grp = usePinnedGroups();

  const groupedPinned = useMemo(() => {
    const out: Record<string, FavoritePlayer[]> = {};
    for (const f of fav.favorites) {
      const key = f.groupId ?? UNGROUPED_KEY;
      (out[key] ??= []).push(f);
    }
    return out;
  }, [fav.favorites]);

  const groupSections = useMemo(() => {
    const sections: Array<{
      group: PinnedGroup | null;
      items: FavoritePlayer[];
    }> = [];
    for (const g of grp.groups) {
      const items = groupedPinned[g.id] ?? [];
      sections.push({ group: g, items });
    }
    const ungrouped = groupedPinned[UNGROUPED_KEY] ?? [];
    if (ungrouped.length > 0 || grp.groups.length === 0) {
      sections.push({ group: null, items: ungrouped });
    }
    return sections;
  }, [grp.groups, groupedPinned]);

  const getDisplayName = useCallback<UsePinnedPlayersApi["getDisplayName"]>(
    (tag, fallback) => {
      const pin = fav.getFavorite(tag);
      if (pin?.customName?.trim()) return pin.customName;
      if (pin?.originalName?.trim()) return pin.originalName;
      if (fallback?.trim()) return fallback;
      return tag.startsWith("#") ? tag : `#${normalize(tag)}`;
    },
    [fav]
  );

  const deleteGroup = useCallback<UsePinnedPlayersApi["deleteGroup"]>(
    (id, options) => {
      const removeMembers = options?.removeMembers ?? false;
      const reassignTo = options?.reassignTo ?? null;

      if (removeMembers) {
        const members = (groupedPinned[id] ?? []).map((m) => m.tag);
        for (const tag of members) {
          fav.removeFavorite(tag);
        }
      } else {
        fav.reassignGroup(id, reassignTo);
      }
      grp.deleteGroup(id);
    },
    [fav, grp, groupedPinned]
  );

  const exportPins = useCallback(() => {
    const payload: PinnedExportPayload = {
      version: 1,
      exportedAt: Date.now(),
      pins: fav.favorites,
      groups: grp.groups,
    };
    return JSON.stringify(payload, null, 2);
  }, [fav.favorites, grp.groups]);

  const importPins = useCallback<UsePinnedPlayersApi["importPins"]>(
    (json) => {
      const summary: ImportSummary = {
        added: 0,
        skipped: 0,
        groupsAdded: 0,
        errors: [],
      };
      let parsed: PinnedExportPayload;
      try {
        parsed = JSON.parse(json);
      } catch {
        summary.errors.push("Невалідний JSON");
        return summary;
      }
      if (!parsed || parsed.version !== 1) {
        summary.errors.push("Непідтримувана версія");
        return summary;
      }

      const incomingGroups = Array.isArray(parsed.groups) ? parsed.groups : [];
      const groupIdMap = new Map<string, string>();
      for (const g of incomingGroups) {
        if (typeof g?.name !== "string") continue;
        const existing = grp.groups.find(
          (cur) => cur.name.toLowerCase() === g.name.toLowerCase()
        );
        if (existing) {
          groupIdMap.set(g.id, existing.id);
          continue;
        }
        const result = grp.createGroup(g.name, { emoji: g.emoji, color: g.color });
        if (result.group) {
          groupIdMap.set(g.id, result.group.id);
          summary.groupsAdded += 1;
        } else if (result.limitReached) {
          summary.errors.push("Досягнуто ліміт груп");
        }
      }

      const incomingPins = Array.isArray(parsed.pins) ? parsed.pins : [];
      for (const p of incomingPins) {
        if (typeof p?.tag !== "string") continue;
        if (fav.isFavorite(p.tag)) {
          summary.skipped += 1;
          continue;
        }
        const remap = p.groupId ? groupIdMap.get(p.groupId) ?? null : null;
        const r = fav.addFavorite(p.tag, {
          customName: p.customName,
          iconEmoji: p.iconEmoji,
          originalName: p.originalName,
          color: p.color,
          groupId: remap ?? undefined,
          note: p.note,
          tags: p.tags,
        });
        if (r.added) summary.added += 1;
        else if (r.limitReached) summary.errors.push("Досягнуто ліміт закріплених");
      }
      return summary;
    },
    [fav, grp]
  );

  return {
    pinned: fav.favorites,
    groups: grp.groups,
    groupedPinned,
    groupSections,
    getDisplayName,
    addFavorite: fav.addFavorite,
    addPin: fav.addFavorite,
    removeFavorite: fav.removeFavorite,
    removePin: fav.removeFavorite,
    updateFavorite: fav.updateFavorite,
    isFavorite: fav.isFavorite,
    isPinned: fav.isFavorite,
    getFavorite: fav.getFavorite,
    getPin: fav.getFavorite,
    recordView: fav.recordView,
    movePinToGroup: fav.movePinToGroup,
    reorderFavorites: fav.reorderFavorites,
    clearFavorites: fav.clearFavorites,
    createGroup: grp.createGroup,
    updateGroup: grp.updateGroup,
    reorderGroups: grp.reorderGroups,
    getGroup: grp.getGroup,
    deleteGroup,
    limits: { players: PINNED_PLAYERS_LIMIT },
    exportPins,
    importPins,
  };
}

export const PINNED_UNGROUPED_KEY = UNGROUPED_KEY;
