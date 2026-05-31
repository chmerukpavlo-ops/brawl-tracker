import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "brawl_high_contrast";
const QUERY = "(prefers-contrast: more)";

export type ContrastMode = "system" | "more" | "normal";

function readSystem(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

function readMode(): ContrastMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "more" || v === "normal") return v;
    return "system";
  } catch {
    return "system";
  }
}

function writeMode(mode: ContrastMode): void {
  try {
    if (mode === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* swallow */
  }
}

/**
 * High-contrast preference hook. Mirrors `useReducedMotion`: combines
 * the OS `prefers-contrast: more` signal with an optional in-app
 * override.
 *
 * The result is reflected onto `<html data-contrast="more">` so global
 * CSS can swap palette tokens without prop-drilling. Components that
 * need to make explicit decisions can read `more` directly.
 */
export function useHighContrast(): {
  more: boolean;
  mode: ContrastMode;
  setMode: (next: ContrastMode) => void;
} {
  const [mode, setModeState] = useState<ContrastMode>(readMode);
  const [systemMore, setSystemMore] = useState<boolean>(readSystem);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    try {
      const mq = window.matchMedia(QUERY);
      const handler = (e: MediaQueryListEvent) => setSystemMore(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } catch {
      return;
    }
  }, []);

  // Reflect the resolved value onto the document so CSS rules
  // (`[data-contrast="more"] :root { ... }`) can pick it up.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const more = mode === "more" || (mode === "system" && systemMore);
    if (more) {
      document.documentElement.dataset.contrast = "more";
    } else {
      delete document.documentElement.dataset.contrast;
    }
  }, [mode, systemMore]);

  const setMode = useCallback((next: ContrastMode) => {
    writeMode(next);
    setModeState(next);
  }, []);

  const more = mode === "more" ? true : mode === "normal" ? false : systemMore;

  return { more, mode, setMode };
}
