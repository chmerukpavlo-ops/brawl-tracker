import { useCallback, useEffect, useState } from "react";
import {
  PIN_NOTE_LIMIT,
  PIN_NAME_LIMIT,
  PINNED_PLAYERS_LIMIT,
  type FavoritePlayer,
} from "../types";

const STORAGE_KEY = "brawl_favorites";
/**
 * Backwards-compat alias. The list is now used as the single source of truth
 * for "pinned players" too — the limit was raised accordingly.
 */
export const FAVORITES_LIMIT = PINNED_PLAYERS_LIMIT;

function normalize(tag: string): string {
  return tag.trim().toUpperCase().replace(/^#+/, "");
}

function formatTag(tag: string): string {
  return `#${normalize(tag)}`;
}

function readStorage(): FavoritePlayer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FavoritePlayer =>
        !!item && typeof item.tag === "string" && typeof item.savedAt === "number"
    );
  } catch {
    return [];
  }
}

function writeStorage(items: FavoritePlayer[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

/**
 * Sanitizes a partial patch before writing it to storage. Keeps the existing
 * `tag` immutable and trims/length-limits user-provided strings.
 */
function sanitizePatch(patch: Partial<FavoritePlayer>): Partial<FavoritePlayer> {
  const out: Partial<FavoritePlayer> = { ...patch };
  if ("customName" in out) {
    const v = (out.customName ?? "").trim();
    out.customName = v.length === 0 ? undefined : v.slice(0, PIN_NAME_LIMIT);
  }
  if ("note" in out) {
    const v = (out.note ?? "").slice(0, PIN_NOTE_LIMIT);
    out.note = v.length === 0 ? undefined : v;
  }
  if ("tags" in out && Array.isArray(out.tags)) {
    out.tags = out.tags
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 6);
  }
  if ("color" in out && typeof out.color === "string") {
    out.color = /^#[0-9a-fA-F]{3,8}$/.test(out.color) ? out.color : undefined;
  }
  // Tag is never updated through patch; we keep the canonical original.
  delete (out as { tag?: string }).tag;
  return out;
}

export interface UseFavoritesApi {
  favorites: FavoritePlayer[];
  addFavorite: (
    tag: string,
    options?: Partial<
      Pick<
        FavoritePlayer,
        | "customName"
        | "iconEmoji"
        | "lastTrophies"
        | "originalName"
        | "color"
        | "groupId"
        | "note"
        | "tags"
      >
    >
  ) => { added: boolean; limitReached: boolean };
  removeFavorite: (tag: string) => void;
  updateFavorite: (tag: string, patch: Partial<FavoritePlayer>) => void;
  isFavorite: (tag: string) => boolean;
  /** Returns the pinned/favorite entry for `tag`, or `undefined`. */
  getFavorite: (tag: string) => FavoritePlayer | undefined;
  /** Bumps `viewCount` and `lastViewedAt` for an existing pin. No-op if not pinned. */
  recordView: (tag: string) => void;
  /** Updates `groupId` (or clears it when `null`). */
  movePinToGroup: (tag: string, groupId: string | null) => void;
  /** Bulk update of `groupId` — used when deleting a group. */
  reassignGroup: (fromGroupId: string, toGroupId: string | null) => void;
  reorderFavorites: (fromIndex: number, toIndex: number) => void;
  clearFavorites: () => void;
}

export function useFavorites(): UseFavoritesApi {
  const [favorites, setFavorites] = useState<FavoritePlayer[]>([]);

  useEffect(() => {
    setFavorites(readStorage());
  }, []);

  const addFavorite = useCallback<UseFavoritesApi["addFavorite"]>((tag, options) => {
    const formatted = formatTag(tag);
    const sanitized = sanitizePatch(options ?? {});
    let limitReached = false;
    let added = false;

    setFavorites((prev) => {
      const existsIdx = prev.findIndex((f) => normalize(f.tag) === normalize(formatted));
      if (existsIdx !== -1) {
        const next = [...prev];
        next[existsIdx] = {
          ...next[existsIdx],
          ...sanitized,
          tag: formatted,
        };
        writeStorage(next);
        added = false;
        return next;
      }
      if (prev.length >= PINNED_PLAYERS_LIMIT) {
        limitReached = true;
        return prev;
      }
      const entry: FavoritePlayer = {
        tag: formatted,
        savedAt: Date.now(),
        viewCount: 0,
        ...sanitized,
      };
      const next = [entry, ...prev];
      writeStorage(next);
      added = true;
      return next;
    });

    return { added, limitReached };
  }, []);

  const removeFavorite = useCallback((tag: string) => {
    const key = normalize(tag);
    setFavorites((prev) => {
      const next = prev.filter((f) => normalize(f.tag) !== key);
      writeStorage(next);
      return next;
    });
  }, []);

  const updateFavorite = useCallback((tag: string, patch: Partial<FavoritePlayer>) => {
    const key = normalize(tag);
    const sanitized = sanitizePatch(patch);
    setFavorites((prev) => {
      const next = prev.map((f) =>
        normalize(f.tag) === key ? { ...f, ...sanitized, tag: f.tag } : f
      );
      writeStorage(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (tag: string) => {
      const key = normalize(tag);
      return favorites.some((f) => normalize(f.tag) === key);
    },
    [favorites]
  );

  const getFavorite = useCallback(
    (tag: string) => {
      const key = normalize(tag);
      return favorites.find((f) => normalize(f.tag) === key);
    },
    [favorites]
  );

  const recordView = useCallback((tag: string) => {
    const key = normalize(tag);
    setFavorites((prev) => {
      const idx = prev.findIndex((f) => normalize(f.tag) === key);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        viewCount: (next[idx].viewCount ?? 0) + 1,
        lastViewedAt: Date.now(),
      };
      writeStorage(next);
      return next;
    });
  }, []);

  const movePinToGroup = useCallback((tag: string, groupId: string | null) => {
    const key = normalize(tag);
    setFavorites((prev) => {
      const idx = prev.findIndex((f) => normalize(f.tag) === key);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        groupId: groupId ?? undefined,
      };
      writeStorage(next);
      return next;
    });
  }, []);

  const reassignGroup = useCallback(
    (fromGroupId: string, toGroupId: string | null) => {
      setFavorites((prev) => {
        let changed = false;
        const next = prev.map((f) => {
          if (f.groupId === fromGroupId) {
            changed = true;
            return { ...f, groupId: toGroupId ?? undefined };
          }
          return f;
        });
        if (!changed) return prev;
        writeStorage(next);
        return next;
      });
    },
    []
  );

  const reorderFavorites = useCallback((fromIndex: number, toIndex: number) => {
    setFavorites((prev) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      writeStorage(next);
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    updateFavorite,
    isFavorite,
    getFavorite,
    recordView,
    movePinToGroup,
    reassignGroup,
    reorderFavorites,
    clearFavorites,
  };
}
