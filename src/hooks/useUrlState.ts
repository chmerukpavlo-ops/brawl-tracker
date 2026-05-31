import { useSyncExternalStore } from "react";
import {
  parseUrl,
  subscribeUrlChange,
  updateUrl,
  type UpdateUrlOptions,
  type UrlState,
} from "../navigation/urlState";

let cachedSearch: string | null = null;
let cachedSnapshot: UrlState = {};

function getSnapshot(): UrlState {
  if (typeof window === "undefined") return cachedSnapshot;
  const search = window.location.search;
  if (search !== cachedSearch) {
    cachedSearch = search;
    cachedSnapshot = parseUrl(search);
  }
  return cachedSnapshot;
}

function getServerSnapshot(): UrlState {
  return cachedSnapshot;
}

/**
 * React hook that returns the current URL state and reactively updates on
 * popstate / pushState / replaceState (when our `updateUrl` is used).
 */
export function useUrlState(): UrlState {
  return useSyncExternalStore(subscribeUrlChange, getSnapshot, getServerSnapshot);
}

/**
 * Convenience helper combining `useUrlState` with a setter.
 */
export function useUrlStateController(): [
  UrlState,
  (patch: UrlState, options?: UpdateUrlOptions) => void
] {
  const state = useUrlState();
  return [state, updateUrl];
}
