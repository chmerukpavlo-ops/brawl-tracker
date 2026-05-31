import { useCallback, useEffect, useState } from "react";
import {
  PINNED_GROUPS_LIMIT,
  PIN_GROUP_NAME_LIMIT,
  type PinnedGroup,
} from "../types";

const STORAGE_KEY = "brawl_pinned_groups";

function readStorage(): PinnedGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (g): g is PinnedGroup =>
          !!g &&
          typeof g.id === "string" &&
          typeof g.name === "string" &&
          typeof g.createdAt === "number"
      )
      .map((g, idx) => ({ order: idx, ...g }));
  } catch {
    return [];
  }
}

function writeStorage(items: PinnedGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

function uid(): string {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function sortByOrder(items: PinnedGroup[]): PinnedGroup[] {
  return [...items].sort((a, b) => {
    const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.createdAt - b.createdAt;
  });
}

export interface CreateGroupOptions {
  emoji?: string;
  color?: string;
}

export interface UsePinnedGroupsApi {
  groups: PinnedGroup[];
  /** Look up a group by id, or undefined. */
  getGroup: (id: string) => PinnedGroup | undefined;
  createGroup: (
    name: string,
    opts?: CreateGroupOptions
  ) => { group: PinnedGroup | null; limitReached: boolean };
  updateGroup: (id: string, patch: Partial<PinnedGroup>) => void;
  /** Removes the group from storage. Caller is responsible for reassigning members. */
  deleteGroup: (id: string) => void;
  reorderGroups: (fromIndex: number, toIndex: number) => void;
  clearGroups: () => void;
  /** Replaces the entire groups list (used by import). */
  replaceGroups: (next: PinnedGroup[]) => void;
}

export function usePinnedGroups(): UsePinnedGroupsApi {
  const [groups, setGroups] = useState<PinnedGroup[]>([]);

  useEffect(() => {
    setGroups(sortByOrder(readStorage()));
  }, []);

  const getGroup = useCallback(
    (id: string) => groups.find((g) => g.id === id),
    [groups]
  );

  const createGroup = useCallback<UsePinnedGroupsApi["createGroup"]>((name, opts) => {
    let limitReached = false;
    let created: PinnedGroup | null = null;

    setGroups((prev) => {
      if (prev.length >= PINNED_GROUPS_LIMIT) {
        limitReached = true;
        return prev;
      }
      const trimmed = name.trim().slice(0, PIN_GROUP_NAME_LIMIT);
      if (trimmed.length === 0) return prev;
      const group: PinnedGroup = {
        id: uid(),
        name: trimmed,
        emoji: opts?.emoji,
        color: opts?.color,
        createdAt: Date.now(),
        order: prev.length,
      };
      created = group;
      const next = [...prev, group];
      writeStorage(next);
      return next;
    });

    return { group: created, limitReached };
  }, []);

  const updateGroup = useCallback((id: string, patch: Partial<PinnedGroup>) => {
    setGroups((prev) => {
      const next = prev.map((g) => {
        if (g.id !== id) return g;
        const merged: PinnedGroup = {
          ...g,
          ...patch,
          id: g.id,
          createdAt: g.createdAt,
        };
        if (typeof merged.name === "string") {
          merged.name = merged.name.trim().slice(0, PIN_GROUP_NAME_LIMIT);
        }
        return merged;
      });
      writeStorage(next);
      return next;
    });
  }, []);

  const deleteGroup = useCallback((id: string) => {
    setGroups((prev) => {
      const next = prev.filter((g) => g.id !== id).map((g, idx) => ({ ...g, order: idx }));
      writeStorage(next);
      return next;
    });
  }, []);

  const reorderGroups = useCallback((fromIndex: number, toIndex: number) => {
    setGroups((prev) => {
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
      const renumbered = next.map((g, idx) => ({ ...g, order: idx }));
      writeStorage(renumbered);
      return renumbered;
    });
  }, []);

  const clearGroups = useCallback(() => {
    setGroups([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const replaceGroups = useCallback((next: PinnedGroup[]) => {
    const cleaned = sortByOrder(next).map((g, idx) => ({ ...g, order: idx }));
    writeStorage(cleaned);
    setGroups(cleaned);
  }, []);

  return {
    groups,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
    clearGroups,
    replaceGroups,
  };
}
