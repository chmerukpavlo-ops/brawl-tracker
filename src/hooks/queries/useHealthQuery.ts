import { useQuery } from "@tanstack/react-query";
import { api, type HealthResponse } from "../../lib/api";
import { ApiError } from "../../lib/queryClient";
import { queryKeys } from "../../lib/queryKeys";

const HEALTH_STALE_MS = 30_000;

/**
 * Backend health probe. Used by Settings to render the API status badge
 * and by PlayerContext to decide whether demo mode should be the default.
 *
 * Polls every minute while the tab is foregrounded; pauses in background.
 */
export function useHealthQuery() {
  return useQuery<HealthResponse, ApiError>({
    queryKey: queryKeys.health(),
    queryFn: ({ signal }) => api.getHealth({ signal }),
    staleTime: HEALTH_STALE_MS,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    // Health failures shouldn't poison UI — surface the error but treat
    // the API as "unconfigured" so demo mode is offered.
    retry: 1,
  });
}
