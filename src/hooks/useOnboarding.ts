import { useCallback, useSyncExternalStore } from "react";

/**
 * Bump the version when onboarding changes meaningfully (new steps, new
 * permissions request, etc.) so existing users can be re-introduced to
 * the delta. Storage key is intentionally suffixed with the version.
 */
export const ONBOARDING_VERSION = 1;
const STORAGE_KEY = `brawl_onboarding_v${ONBOARDING_VERSION}`;

/** Heuristics for "this is an existing user" — auto-marks onboarding done. */
const LEGACY_TAG_KEYS = ["brawl_my_player", "my_player_tag"];
const LEGACY_PINNED_KEY = "brawl_favorites";

export interface OnboardingState {
  completed: boolean;
  /** ms since epoch when the user completed (or skipped) the flow. */
  completedAt?: number;
  /** Was onboarding closed without finishing? Useful for analytics. */
  skipped?: boolean;
}

const DEFAULT_STATE: OnboardingState = { completed: false };

function readStorage(): OnboardingState {
  if (typeof localStorage === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as OnboardingState | null;
      if (parsed && typeof parsed.completed === "boolean") return parsed;
    }
  } catch {
    /* corrupt entry → fall through to migration check */
  }

  // Migration path: a user that already configured the app before this
  // onboarding existed shouldn't be greeted with a tutorial. If any of
  // the "you've used this app" markers are present, mark complete.
  try {
    const hasTag = LEGACY_TAG_KEYS.some((k) => {
      const v = localStorage.getItem(k);
      if (!v) return false;
      try {
        const parsed = JSON.parse(v);
        if (parsed && typeof parsed === "object" && "tag" in parsed) {
          return typeof (parsed as { tag?: unknown }).tag === "string";
        }
      } catch {
        return v.length > 0;
      }
      return false;
    });
    const hasPinned = (() => {
      const raw = localStorage.getItem(LEGACY_PINNED_KEY);
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    })();
    if (hasTag || hasPinned) {
      const migrated: OnboardingState = {
        completed: true,
        completedAt: Date.now(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      } catch {
        /* ignore */
      }
      return migrated;
    }
  } catch {
    /* localStorage inaccessible — treat as fresh user */
  }

  return DEFAULT_STATE;
}

function writeStorage(state: OnboardingState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

// Module-singleton store so all `useOnboarding()` callers see the same
// state and trigger a single re-render when it changes.
let state: OnboardingState = readStorage();
const listeners = new Set<() => void>();

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function setState(next: OnboardingState): void {
  state = next;
  writeStorage(state);
  listeners.forEach((l) => l());
}

export interface UseOnboardingApi {
  state: OnboardingState;
  /** True if the flow should be shown right now. */
  isVisible: boolean;
  /** Mark onboarding finished — flow disappears. */
  complete: (opts?: { skipped?: boolean }) => void;
  /** Wipe completion flag — flow will appear again on next mount. */
  reset: () => void;
}

export function useOnboarding(): UseOnboardingApi {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );

  const complete = useCallback<UseOnboardingApi["complete"]>((opts) => {
    setState({
      completed: true,
      completedAt: Date.now(),
      skipped: !!opts?.skipped,
    });
  }, []);

  const reset = useCallback(() => {
    setState({ completed: false });
  }, []);

  return {
    state: snapshot,
    isVisible: !snapshot.completed,
    complete,
    reset,
  };
}

/** Imperative escape hatch for non-React call sites. */
export function isOnboardingCompleted(): boolean {
  return state.completed;
}
