import type { PlayerStats } from "../types";

export type TabId = "home" | "stats" | "leaders" | "library" | "settings";

export const TABS_ORDER: readonly TabId[] = [
  "home",
  "stats",
  "leaders",
  "library",
  "settings",
] as const;

export function getTabIndex(tab: TabId): number {
  return TABS_ORDER.indexOf(tab);
}

export function getNextTab(current: TabId): TabId {
  const i = getTabIndex(current);
  return TABS_ORDER[Math.min(TABS_ORDER.length - 1, i + 1)];
}

export function getPrevTab(current: TabId): TabId {
  const i = getTabIndex(current);
  return TABS_ORDER[Math.max(0, i - 1)];
}

export type UpdateButtonState = "idle" | "loading" | "success" | "pressed";

export interface ActionLog {
  time: string;
  tag: string;
  status: string;
  ok: boolean;
}

export interface ErrorInfo {
  message: string;
  suggestion?: string;
  status?: number;
}

export interface CachedPlayer {
  data: PlayerStats;
  timestamp: number;
}

export interface HandleQueryOptions {
  bypassDemo?: boolean;
  navigateHome?: boolean;
  forceFresh?: boolean;
}
