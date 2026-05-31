import { useMutation } from "@tanstack/react-query";
import { api, type AiCoachRequest, type AiCoachResponse } from "../../lib/api";
import { ApiError } from "../../lib/queryClient";

/**
 * Non-streaming AI coach mutation. The streaming SSE flow (used by
 * default in `PlayerContext.fetchAiCoach`) doesn't fit `useQuery`'s
 * request/response model so we keep it imperative there — but this hook
 * is handy for one-shot blocking calls and tests.
 */
export function useAiCoachMutation() {
  return useMutation<AiCoachResponse, ApiError, AiCoachRequest>({
    mutationFn: (body) => api.postAiCoach(body),
  });
}
