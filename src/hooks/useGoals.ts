import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { TrophyGoal, TrophyGoalType } from "../types";
import { normalizeTag } from "../utils/playerCache";

const STORAGE_KEY = "brawl_goals";
const AUTO_PREF_KEY = "brawl_goals_auto_enabled";
const OVERLAY_PREF_KEY = "brawl_goals_overlay_enabled";

export const GOALS_LIMIT = 30;

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isValidGoal(value: unknown): value is TrophyGoal {
  if (!value || typeof value !== "object") return false;
  const g = value as Partial<TrophyGoal>;
  return (
    typeof g.id === "string" &&
    typeof g.tag === "string" &&
    typeof g.targetTrophies === "number" &&
    typeof g.createdAt === "number" &&
    typeof g.startTrophies === "number" &&
    (g.type === "auto" || g.type === "custom")
  );
}

function readGoalsRaw(): TrophyGoal[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidGoal);
  } catch {
    return [];
  }
}

function writeGoalsRaw(goals: TrophyGoal[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  } catch {
    /* ignore */
  }
}

let goalsState: TrophyGoal[] = readGoalsRaw();
const goalsListeners = new Set<() => void>();

function subscribeGoals(l: () => void): () => void {
  goalsListeners.add(l);
  return () => goalsListeners.delete(l);
}

function notifyGoals(): void {
  goalsListeners.forEach((l) => l());
}

function setGoalsState(next: TrophyGoal[]): void {
  goalsState = next;
  writeGoalsRaw(goalsState);
  notifyGoals();
}

function tagsEqual(a: string, b: string): boolean {
  return normalizeTag(a) === normalizeTag(b);
}

export function getNextAutoMilestone(currentTrophies: number): number {
  const t = Math.max(0, Math.floor(currentTrophies));
  if (t < 1000) return Math.max(100, Math.ceil((t + 1) / 100) * 100);
  if (t < 10000) return Math.ceil((t + 1) / 1000) * 1000;
  if (t < 50000) return Math.ceil((t + 1) / 5000) * 5000;
  if (t < 100000) return Math.ceil((t + 1) / 10000) * 10000;
  return Math.ceil((t + 1) / 25000) * 25000;
}

export interface GoalProgress {
  remaining: number;
  percentage: number;
  isAchieved: boolean;
}

export function getProgress(
  goal: TrophyGoal,
  currentTrophies: number
): GoalProgress {
  const span = Math.max(1, goal.targetTrophies - goal.startTrophies);
  const gained = Math.max(0, currentTrophies - goal.startTrophies);
  const percentage = Math.max(
    0,
    Math.min(100, (gained / span) * 100)
  );
  const remaining = Math.max(0, goal.targetTrophies - currentTrophies);
  const isAchieved = !!goal.achievedAt || currentTrophies >= goal.targetTrophies;
  return { remaining, percentage, isAchieved };
}

interface AddGoalInput {
  tag: string;
  targetTrophies: number;
  startTrophies: number;
  type: TrophyGoalType;
  label?: string;
  reward?: string;
  achievedAt?: number;
}

export interface AddGoalResult {
  goal: TrophyGoal | null;
  duplicate: boolean;
  limitReached: boolean;
}

function performAddGoal(input: AddGoalInput): AddGoalResult {
  if (goalsState.length >= GOALS_LIMIT) {
    return { goal: null, duplicate: false, limitReached: true };
  }
  const duplicate = goalsState.some(
    (g) =>
      !g.achievedAt &&
      g.targetTrophies === input.targetTrophies &&
      tagsEqual(g.tag, input.tag)
  );
  if (duplicate) {
    return { goal: null, duplicate: true, limitReached: false };
  }
  const goal: TrophyGoal = {
    id: generateId(),
    tag: input.tag,
    targetTrophies: input.targetTrophies,
    createdAt: Date.now(),
    startTrophies: input.startTrophies,
    type: input.type,
    label: input.label,
    reward: input.reward,
    achievedAt: input.achievedAt,
  };
  setGoalsState([...goalsState, goal]);
  return { goal, duplicate: false, limitReached: false };
}

function performRemoveGoal(id: string): void {
  setGoalsState(goalsState.filter((g) => g.id !== id));
}

function performUpdateGoal(id: string, patch: Partial<TrophyGoal>): void {
  setGoalsState(
    goalsState.map((g) => (g.id === id ? { ...g, ...patch, id: g.id } : g))
  );
}

function performMarkAchieved(id: string, ts: number): TrophyGoal | null {
  let updated: TrophyGoal | null = null;
  const next = goalsState.map((g) => {
    if (g.id !== id || g.achievedAt) return g;
    updated = { ...g, achievedAt: ts };
    return updated;
  });
  if (!updated) return null;
  setGoalsState(next);
  return updated;
}

function performClearAll(): void {
  setGoalsState([]);
}

export interface ProcessResult {
  achievedNow: TrophyGoal[];
  newAuto: TrophyGoal | null;
}

function performProcessTrophyUpdate(
  tag: string,
  trophies: number,
  autoEnabled: boolean
): ProcessResult {
  const now = Date.now();
  const achievedNow: TrophyGoal[] = [];
  let mutated = false;

  const next = goalsState.map((g) => {
    if (
      !g.achievedAt &&
      tagsEqual(g.tag, tag) &&
      trophies >= g.targetTrophies
    ) {
      const updated = { ...g, achievedAt: now };
      achievedNow.push(updated);
      mutated = true;
      return updated;
    }
    return g;
  });

  let working = next;

  let newAuto: TrophyGoal | null = null;
  if (autoEnabled) {
    const hasActiveAuto = working.some(
      (g) => !g.achievedAt && g.type === "auto" && tagsEqual(g.tag, tag)
    );
    if (!hasActiveAuto && working.length < GOALS_LIMIT) {
      const target = getNextAutoMilestone(trophies);
      newAuto = {
        id: generateId(),
        tag,
        targetTrophies: target,
        createdAt: now,
        startTrophies: trophies,
        type: "auto",
      };
      working = [...working, newAuto];
      mutated = true;
    }
  }

  if (mutated) {
    setGoalsState(working);
  }

  return { achievedNow, newAuto };
}

function readBoolPref(key: string, def: boolean): boolean {
  if (typeof localStorage === "undefined") return def;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return def;
    return raw === "true";
  } catch {
    return def;
  }
}

function makeBoolStore(key: string, def: boolean) {
  let value = readBoolPref(key, def);
  const listeners = new Set<() => void>();
  return {
    subscribe(l: () => void): () => void {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    get(): boolean {
      return value;
    },
    set(next: boolean): void {
      if (value === next) return;
      value = next;
      try {
        localStorage.setItem(key, String(next));
      } catch {
        /* ignore */
      }
      listeners.forEach((l) => l());
    },
  };
}

const autoStore = makeBoolStore(AUTO_PREF_KEY, true);
const overlayStore = makeBoolStore(OVERLAY_PREF_KEY, true);

export function useAutoGoalsEnabled(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(autoStore.subscribe, autoStore.get, autoStore.get);
  return [value, autoStore.set];
}

export function useOverlayEnabled(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    overlayStore.subscribe,
    overlayStore.get,
    overlayStore.get
  );
  return [value, overlayStore.set];
}

export function getAutoGoalsEnabled(): boolean {
  return autoStore.get();
}

export function getOverlayEnabled(): boolean {
  return overlayStore.get();
}

export interface UseGoalsApi {
  goals: TrophyGoal[];
  activeGoals: (tag: string) => TrophyGoal[];
  achievedGoals: (tag: string) => TrophyGoal[];
  addGoal: (input: AddGoalInput) => AddGoalResult;
  removeGoal: (id: string) => void;
  updateGoal: (id: string, patch: Partial<TrophyGoal>) => void;
  markAchieved: (id: string, ts?: number) => TrophyGoal | null;
  clearAll: () => void;
  processTrophyUpdate: (
    tag: string,
    trophies: number,
    autoEnabled: boolean
  ) => ProcessResult;
}

export function useGoals(): UseGoalsApi {
  const snapshot = useSyncExternalStore(
    subscribeGoals,
    () => goalsState,
    () => goalsState
  );

  const activeGoals = useCallback(
    (tag: string) =>
      snapshot
        .filter((g) => !g.achievedAt && tagsEqual(g.tag, tag))
        .sort((a, b) => a.targetTrophies - b.targetTrophies),
    [snapshot]
  );

  const achievedGoals = useCallback(
    (tag: string) =>
      snapshot
        .filter((g) => !!g.achievedAt && tagsEqual(g.tag, tag))
        .sort((a, b) => (b.achievedAt ?? 0) - (a.achievedAt ?? 0)),
    [snapshot]
  );

  const addGoal = useCallback((input: AddGoalInput) => performAddGoal(input), []);
  const removeGoal = useCallback((id: string) => performRemoveGoal(id), []);
  const updateGoal = useCallback(
    (id: string, patch: Partial<TrophyGoal>) => performUpdateGoal(id, patch),
    []
  );
  const markAchieved = useCallback(
    (id: string, ts: number = Date.now()) => performMarkAchieved(id, ts),
    []
  );
  const clearAll = useCallback(() => performClearAll(), []);
  const processTrophyUpdate = useCallback(
    (tag: string, trophies: number, autoEnabled: boolean) =>
      performProcessTrophyUpdate(tag, trophies, autoEnabled),
    []
  );

  return useMemo<UseGoalsApi>(
    () => ({
      goals: snapshot,
      activeGoals,
      achievedGoals,
      addGoal,
      removeGoal,
      updateGoal,
      markAchieved,
      clearAll,
      processTrophyUpdate,
    }),
    [
      snapshot,
      activeGoals,
      achievedGoals,
      addGoal,
      removeGoal,
      updateGoal,
      markAchieved,
      clearAll,
      processTrophyUpdate,
    ]
  );
}
