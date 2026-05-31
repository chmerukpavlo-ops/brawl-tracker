import { useCallback, useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

const STORAGE_KEY = "brawl_reduce_motion";

/**
 * Three-state preference: respect the system signal, force on, force off.
 *
 *   "system" — follow `prefers-reduced-motion` (default)
 *   "always" — user has asked for reduced motion regardless of OS
 *   "never"  — user has explicitly opted in to full motion
 */
export type ReduceMotionMode = "system" | "always" | "never";

function readMode(): ReduceMotionMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "always" || v === "never") return v;
    return "system";
  } catch {
    return "system";
  }
}

function writeMode(mode: ReduceMotionMode): void {
  try {
    if (mode === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* private mode — degrade gracefully */
  }
}

/**
 * `useReducedMotion` is the project-wide hook every animated component
 * should consume. It combines two signals:
 *
 *   1. The user's OS-level `prefers-reduced-motion` setting.
 *   2. An optional override stored in localStorage so users can flip
 *      animations off without touching their device settings.
 *
 * The OS signal is the *floor*: if the OS says "reduce motion", we
 * respect it even if the in-app override is "never". We never let the
 * app override a user's accessibility setting — that would be hostile.
 */
export function useReducedMotion(): {
  reduce: boolean;
  mode: ReduceMotionMode;
  setMode: (next: ReduceMotionMode) => void;
} {
  const systemPrefers = usePrefersReducedMotion();
  const [mode, setModeState] = useState<ReduceMotionMode>(readMode);

  // Keep the document data attribute in sync so global CSS rules can
  // target `[data-reduce-motion="always"]` for non-React animations
  // (CSS keyframes, transitions on third-party widgets).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const reduce = mode === "always" || (mode === "system" && systemPrefers);
    document.documentElement.dataset.reduceMotion = reduce ? "true" : "false";
    return () => {
      delete document.documentElement.dataset.reduceMotion;
    };
  }, [mode, systemPrefers]);

  const setMode = useCallback((next: ReduceMotionMode) => {
    writeMode(next);
    setModeState(next);
  }, []);

  const reduce =
    mode === "always" ? true : mode === "never" ? false : systemPrefers;

  return { reduce, mode, setMode };
}
