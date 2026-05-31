import { useCallback, useSyncExternalStore } from "react";
import { formatDate, parseDate, daysBetween } from "../utils/dateUtils";

const STORAGE_KEY = "brawl_streak";
const HISTORY_LIMIT = 30;

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  totalCheckins: number;
  totalXp: number;
  lastCheckinDate: string | null;
  history: string[];
}

export type StreakStatus = "active" | "at_risk" | "broken" | "new";

export interface Milestone {
  days: number;
  reward: string;
  emoji: string;
  xp: number;
}

export const MILESTONES: Milestone[] = [
  { days: 3, reward: "Перший серйозний streak", emoji: "🎯", xp: 30 },
  { days: 7, reward: "Тиждень підряд!", emoji: "🔥", xp: 100 },
  { days: 14, reward: "Два тижні", emoji: "💪", xp: 150 },
  { days: 30, reward: "Місяць!", emoji: "👑", xp: 500 },
  { days: 50, reward: "50 днів", emoji: "💎", xp: 1000 },
  { days: 100, reward: "100 днів — легенда", emoji: "🏆", xp: 2000 },
  { days: 365, reward: "Цілий рік", emoji: "🌟", xp: 10000 },
];

export interface CheckInResult {
  isFirstToday: boolean;
  isFirstEver: boolean;
  gainedXp: number;
  newStreak: number;
  brokenStreak: number;
  milestoneReached: Milestone | null;
}

const DEFAULT_STATE: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  totalCheckins: 0,
  totalXp: 0,
  lastCheckinDate: null,
  history: [],
};

function readStorage(): StreakState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<StreakState>;
    return {
      currentStreak: Number(parsed.currentStreak ?? 0),
      longestStreak: Number(parsed.longestStreak ?? 0),
      totalCheckins: Number(parsed.totalCheckins ?? 0),
      totalXp: Number(parsed.totalXp ?? 0),
      lastCheckinDate:
        typeof parsed.lastCheckinDate === "string" ? parsed.lastCheckinDate : null,
      history: Array.isArray(parsed.history)
        ? parsed.history.filter((d): d is string => typeof d === "string")
        : [],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writeStorage(state: StreakState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

let state: StreakState = readStorage();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  listeners.forEach((l) => l());
}

function setState(next: StreakState): void {
  state = next;
  writeStorage(state);
  notify();
}

function calculateBaseXp(streak: number): number {
  if (streak >= 100) return 50;
  if (streak >= 30) return 25;
  if (streak >= 7) return 15;
  return 10;
}

function findMilestone(days: number): Milestone | null {
  return MILESTONES.find((m) => m.days === days) ?? null;
}

export function nextMilestone(streak: number): Milestone | null {
  return MILESTONES.find((m) => m.days > streak) ?? null;
}

function getStatus(s: StreakState, today: string): StreakStatus {
  if (s.totalCheckins === 0 || s.currentStreak === 0) return "new";
  if (s.lastCheckinDate === today) return "active";

  const last = parseDate(s.lastCheckinDate ?? "");
  const now = parseDate(today);
  if (!last || !now) return "new";
  const diff = daysBetween(last, now);
  if (diff === 1) return "at_risk";
  if (diff > 1) return "broken";
  return "active";
}

function performCheckIn(): CheckInResult {
  const today = formatDate(new Date());
  const last = state.lastCheckinDate;

  if (last === today) {
    return {
      isFirstToday: false,
      isFirstEver: false,
      gainedXp: 0,
      newStreak: state.currentStreak,
      brokenStreak: 0,
      milestoneReached: null,
    };
  }

  const wasEmpty = state.totalCheckins === 0;
  let nextStreak: number;
  let brokenStreak = 0;

  if (last) {
    const lastDate = parseDate(last);
    const todayDate = parseDate(today);
    if (lastDate && todayDate && daysBetween(lastDate, todayDate) === 1) {
      nextStreak = state.currentStreak + 1;
    } else {
      brokenStreak = state.currentStreak;
      nextStreak = 1;
    }
  } else {
    nextStreak = 1;
  }

  const milestone = findMilestone(nextStreak);
  const baseXp = calculateBaseXp(nextStreak);
  const gainedXp = baseXp + (milestone?.xp ?? 0);

  const next: StreakState = {
    currentStreak: nextStreak,
    longestStreak: Math.max(state.longestStreak, nextStreak),
    totalCheckins: state.totalCheckins + 1,
    totalXp: state.totalXp + gainedXp,
    lastCheckinDate: today,
    history: [...state.history, today].slice(-HISTORY_LIMIT),
  };

  setState(next);

  return {
    isFirstToday: true,
    isFirstEver: wasEmpty,
    gainedXp,
    newStreak: nextStreak,
    brokenStreak,
    milestoneReached: milestone,
  };
}

function performReset(): void {
  setState({ ...DEFAULT_STATE });
}

export interface UseDailyCheckinApi {
  state: StreakState;
  isCheckedInToday: boolean;
  status: StreakStatus;
  daysUntilNextMilestone: number | null;
  nextMilestone: Milestone | null;
  checkIn: () => CheckInResult;
  resetStreak: () => void;
}

export function useDailyCheckin(): UseDailyCheckinApi {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
  const today = formatDate(new Date());
  const isCheckedInToday = snapshot.lastCheckinDate === today;
  const status = getStatus(snapshot, today);
  const next = nextMilestone(snapshot.currentStreak);
  const daysUntilNextMilestone = next ? next.days - snapshot.currentStreak : null;

  const checkIn = useCallback(() => performCheckIn(), []);
  const resetStreak = useCallback(() => performReset(), []);

  return {
    state: snapshot,
    isCheckedInToday,
    status,
    daysUntilNextMilestone,
    nextMilestone: next,
    checkIn,
    resetStreak,
  };
}
