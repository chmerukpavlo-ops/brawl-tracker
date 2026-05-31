import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { SavedAdvice } from "../types";
import { trackAchievementEvent } from "./useAchievements";

const STORAGE_KEY = "brawl_ai_history";
const AUTOSAVE_KEY = "brawl_ai_history_autosave";
const MAX_RECORDS = 50;
const MAX_ADVICE_LEN = 5000;
const DEDUPE_WINDOW_MS = 60 * 1000;

function normalizeTag(tag: string | null | undefined): string {
  if (!tag) return "";
  return tag.replace(/^#+/, "").toUpperCase();
}

function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `adv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readHistory(): SavedAdvice[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (it: unknown): it is SavedAdvice =>
          !!it &&
          typeof it === "object" &&
          typeof (it as SavedAdvice).id === "string" &&
          typeof (it as SavedAdvice).advice === "string"
      )
      .map((it) => ({
        ...it,
        playerTag: normalizeTag(it.playerTag),
        isPinned: !!it.isPinned,
        isAutoSaved: !!it.isAutoSaved,
        tags: Array.isArray(it.tags)
          ? it.tags.filter((t: unknown): t is string => typeof t === "string")
          : undefined,
      }));
  } catch {
    return [];
  }
}

function writeHistory(items: SavedAdvice[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    // QuotaExceeded: викинути найстаріший non-pinned і спробувати ще раз.
    if ((err as DOMException)?.name === "QuotaExceededError") {
      const sorted = [...items].sort((a, b) => a.createdAt - b.createdAt);
      const victim = sorted.find((it) => !it.isPinned);
      if (victim) {
        const next = items.filter((it) => it.id !== victim.id);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore second failure */
        }
      }
    }
  }
}

let state: SavedAdvice[] = readHistory();
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function setState(next: SavedAdvice[]): void {
  state = next;
  writeHistory(state);
  emit();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

// ── auto-save pref ────────────────────────────────────────────
function readAutoSavePref(): boolean {
  if (typeof localStorage === "undefined") return true;
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (raw === null) return true;
    return raw !== "false";
  } catch {
    return true;
  }
}

let autoSavePref = readAutoSavePref();
const autoSaveListeners = new Set<() => void>();

function setAutoSavePref(next: boolean): void {
  if (autoSavePref === next) return;
  autoSavePref = next;
  try {
    localStorage.setItem(AUTOSAVE_KEY, String(next));
  } catch {
    /* ignore */
  }
  autoSaveListeners.forEach((l) => l());
}

export function getAutoSaveEnabled(): boolean {
  return autoSavePref;
}

export function useAdviceAutoSave(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    (l) => {
      autoSaveListeners.add(l);
      return () => {
        autoSaveListeners.delete(l);
      };
    },
    () => autoSavePref,
    () => autoSavePref
  );
  return [value, setAutoSavePref];
}

// ── public mutators ──────────────────────────────────────────
export interface AddAdviceInput {
  playerTag: string;
  playerName: string;
  playerTrophies: number;
  advice: string;
  presetId?: string;
  presetTitle?: string;
  presetCategory?: string;
  presetIcon?: string;
  brawlerId?: number;
  brawlerName?: string;
}

export interface AddAdviceOptions {
  autoSave?: boolean;
}

/**
 * Saves a new advice. Truncates the body to `MAX_ADVICE_LEN`. If a similar
 * entry (same player + preset + brawler) was created in the last minute, the
 * existing one is returned (idempotence vs accidental double-fires).
 */
export function addSavedAdvice(
  input: AddAdviceInput,
  options: AddAdviceOptions = {}
): SavedAdvice | null {
  const trimmedAdvice =
    input.advice.length > MAX_ADVICE_LEN
      ? `${input.advice.slice(0, MAX_ADVICE_LEN)}\n\n*…обрізано через ліміт зберігання.*`
      : input.advice;
  if (!trimmedAdvice.trim()) return null;

  const playerTag = normalizeTag(input.playerTag);
  const now = Date.now();

  const dup = state.find(
    (it) =>
      it.playerTag === playerTag &&
      (it.presetId ?? null) === (input.presetId ?? null) &&
      (it.brawlerId ?? null) === (input.brawlerId ?? null) &&
      now - it.createdAt < DEDUPE_WINDOW_MS
  );
  if (dup) return dup;

  const record: SavedAdvice = {
    id: genId(),
    playerTag,
    playerName: input.playerName,
    playerTrophies: input.playerTrophies,
    advice: trimmedAdvice,
    presetId: input.presetId,
    presetTitle: input.presetTitle,
    presetCategory: input.presetCategory,
    presetIcon: input.presetIcon,
    brawlerId: input.brawlerId,
    brawlerName: input.brawlerName,
    createdAt: now,
    isPinned: false,
    isAutoSaved: options.autoSave ?? false,
  };

  // FIFO trim: keep at most MAX_RECORDS, but never drop pinned items.
  let next = [record, ...state];
  if (next.length > MAX_RECORDS) {
    const pinned = next.filter((it) => it.isPinned);
    const others = next.filter((it) => !it.isPinned);
    const allowedOthers = Math.max(0, MAX_RECORDS - pinned.length);
    next = [...pinned, ...others.slice(0, allowedOthers)].sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }
  setState(next);
  trackAchievementEvent("advice_saved", { totalAfter: next.length });
  return record;
}

export function removeSavedAdvice(id: string): SavedAdvice | null {
  const target = state.find((it) => it.id === id);
  if (!target) return null;
  setState(state.filter((it) => it.id !== id));
  return target;
}

export function restoreSavedAdvice(advice: SavedAdvice): void {
  if (state.some((it) => it.id === advice.id)) return;
  setState([advice, ...state].sort((a, b) => b.createdAt - a.createdAt));
}

export function toggleAdvicePin(id: string): boolean {
  let result = false;
  setState(
    state.map((it) => {
      if (it.id !== id) return it;
      result = !it.isPinned;
      return { ...it, isPinned: result };
    })
  );
  if (result) {
    trackAchievementEvent("advice_pinned");
  }
  return result;
}

export function updateSavedAdvice(
  id: string,
  patch: Partial<Pick<SavedAdvice, "note" | "tags">>
): void {
  setState(
    state.map((it) =>
      it.id === id
        ? {
            ...it,
            ...(patch.note !== undefined ? { note: patch.note.slice(0, 500) } : {}),
            ...(patch.tags !== undefined
              ? {
                  tags: Array.from(
                    new Set(
                      patch.tags
                        .map((t) => t.trim().slice(0, 20))
                        .filter((t) => t.length > 0)
                    )
                  ),
                }
              : {}),
          }
        : it
    )
  );
}

export function clearAdviceHistory(options: { keepPinned?: boolean } = {}): void {
  if (options.keepPinned) {
    setState(state.filter((it) => it.isPinned));
  } else {
    setState([]);
  }
}

export function findCachedAdvice(
  playerTag: string,
  presetId: string | undefined | null,
  brawlerId?: number | null,
  maxAgeMs = 24 * 60 * 60 * 1000
): SavedAdvice | null {
  const norm = normalizeTag(playerTag);
  const now = Date.now();
  const match = state.find(
    (it) =>
      it.playerTag === norm &&
      (it.presetId ?? null) === (presetId ?? null) &&
      (it.brawlerId ?? null) === (brawlerId ?? null) &&
      now - it.createdAt <= maxAgeMs
  );
  return match ?? null;
}

export function getAdviceById(id: string | null | undefined): SavedAdvice | null {
  if (!id) return null;
  return state.find((it) => it.id === id) ?? null;
}

// ── hook ────────────────────────────────────────────────────
export interface UseAiHistoryApi {
  history: SavedAdvice[];
  pinned: SavedAdvice[];
  addAdvice: typeof addSavedAdvice;
  removeAdvice: (id: string) => SavedAdvice | null;
  restoreAdvice: (advice: SavedAdvice) => void;
  togglePin: (id: string) => boolean;
  updateAdvice: (id: string, patch: Partial<Pick<SavedAdvice, "note" | "tags">>) => void;
  clearHistory: (options?: { keepPinned?: boolean }) => void;
  getByPlayer: (tag: string) => SavedAdvice[];
  getByPreset: (presetId: string) => SavedAdvice[];
  getRecent: (limit?: number) => SavedAdvice[];
  getAdvice: (id: string | null | undefined) => SavedAdvice | null;
  findCached: typeof findCachedAdvice;
}

export function useAiHistory(): UseAiHistoryApi {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);

  const pinned = useMemo(
    () => snapshot.filter((it) => it.isPinned),
    [snapshot]
  );

  const getByPlayer = useCallback(
    (tag: string) => {
      const norm = normalizeTag(tag);
      return snapshot.filter((it) => it.playerTag === norm);
    },
    [snapshot]
  );

  const getByPreset = useCallback(
    (presetId: string) => snapshot.filter((it) => it.presetId === presetId),
    [snapshot]
  );

  const getRecent = useCallback(
    (limit = 5) =>
      [...snapshot]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, Math.max(0, limit)),
    [snapshot]
  );

  const getAdvice = useCallback((id: string | null | undefined) => {
    if (!id) return null;
    return snapshot.find((it) => it.id === id) ?? null;
  }, [snapshot]);

  return {
    history: snapshot,
    pinned,
    addAdvice: addSavedAdvice,
    removeAdvice: removeSavedAdvice,
    restoreAdvice: restoreSavedAdvice,
    togglePin: toggleAdvicePin,
    updateAdvice: updateSavedAdvice,
    clearHistory: clearAdviceHistory,
    getByPlayer,
    getByPreset,
    getRecent,
    getAdvice,
    findCached: findCachedAdvice,
  };
}
