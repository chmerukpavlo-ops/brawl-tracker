import { useSyncExternalStore } from "react";

const STORAGE_KEY = "haptic_enabled";

type Listener = () => void;

function readEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

const listeners = new Set<Listener>();
let enabled: boolean = readEnabled();

function notify(): void {
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return enabled;
}

function getServerSnapshot(): boolean {
  return true;
}

export function setHapticEnabled(next: boolean): void {
  if (enabled === next) return;
  enabled = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* ignore */
  }
  notify();
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function canVibrate(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof (navigator as Navigator).vibrate === "function"
  );
}

function vibrate(pattern: number | number[]): void {
  if (!enabled) return;
  if (prefersReducedMotion()) return;
  if (!canVibrate()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export interface Haptic {
  light: () => void;
  medium: () => void;
  heavy: () => void;
  success: () => void;
  error: () => void;
  selection: () => void;
}

export const haptic: Haptic = {
  light: () => vibrate(10),
  medium: () => vibrate(20),
  heavy: () => vibrate(30),
  success: () => vibrate([15, 50, 30]),
  error: () => vibrate([50, 30, 50]),
  selection: () => vibrate(5),
};

export function useHaptic(): Haptic {
  return haptic;
}

export function useHapticEnabled(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [value, setHapticEnabled];
}
