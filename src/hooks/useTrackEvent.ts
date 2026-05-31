import { useCallback } from "react";
import type { AnalyticsEvent } from "../types/analytics";
import { track } from "../lib/analytics";

/**
 * Tiny hook that returns a stable `track` function for use in event
 * handlers. The hook exists so consumers don't need to import the
 * facade directly — and so the type parameter constrains the event
 * shape via the discriminated union.
 *
 * Example:
 *   const track = useTrackEvent();
 *   track({ name: "search_player", properties: { has_result: true, ... } });
 */
export function useTrackEvent(): <E extends AnalyticsEvent>(event: E) => void {
  return useCallback(<E extends AnalyticsEvent>(event: E) => {
    track(event);
  }, []);
}
