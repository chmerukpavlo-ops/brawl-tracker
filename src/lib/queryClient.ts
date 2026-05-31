import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { addBreadcrumb, captureException } from "./telemetry";

/**
 * Thin error wrapper that lets the query layer make routing decisions
 * (no-retry on 4xx, etc.) without having to inspect string messages.
 */
export class ApiError extends Error {
  status: number;
  suggestion?: string;
  body?: unknown;

  constructor(message: string, status: number, opts?: { suggestion?: string; body?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.suggestion = opts?.suggestion;
    this.body = opts?.body;
  }
}

function isFatalStatus(status: number): boolean {
  // 4xx (other than throttling) shouldn't be retried; the server will keep
  // returning the same answer regardless of how many times we ask.
  return status === 400 || status === 401 || status === 403 || status === 404;
}

/**
 * Whether to forward a query error to telemetry.
 *
 * We deliberately swallow:
 *   - 404 / 401 / 403 — expected (wrong tag, bad token); not bugs.
 *   - AbortError — user cancelled (tab switch, AI stream cancel).
 *
 * Everything else (5xx, network failures, JSON parse errors, etc.)
 * is genuinely worth investigating and gets shipped to Sentry.
 */
function shouldReport(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return false;
  }
  return true;
}

export const queryClient = new QueryClient({
  // Global cache hooks fire for *every* query/mutation regardless of
  // where it was defined. Using these instead of the (deprecated)
  // `defaultOptions.queries.onError` matches React Query v5 best
  // practice and survives `setQueryDefaults` overrides.
  queryCache: new QueryCache({
    onError: (error, query) => {
      const queryName = String(query.queryKey?.[0] ?? "unknown");
      addBreadcrumb({
        category: "react-query",
        level: "error",
        message: `query error: ${queryName}`,
        data: { queryKey: query.queryKey },
      });
      if (shouldReport(error)) {
        captureException(error, {
          tags: { source: "react-query", query: queryName },
          extra: { queryKey: query.queryKey },
        });
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      const mutationName = String(mutation.options.mutationKey?.[0] ?? "unknown");
      addBreadcrumb({
        category: "react-query",
        level: "error",
        message: `mutation error: ${mutationName}`,
      });
      if (shouldReport(error)) {
        captureException(error, {
          tags: { source: "react-query", mutation: mutationName },
        });
      }
    },
  }),
  defaultOptions: {
    queries: {
      // Considered fresh — no refetch — for a minute. Matches the
      // existing `CACHE_FRESH_MS` constant in `playerCache`.
      staleTime: 60_000,
      // Kept in memory for 5 minutes after the last subscriber leaves.
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && isFatalStatus(error.status)) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Keep previous data visible while a new query loads — feels much
      // smoother on tag switches than going through skeleton each time.
      placeholderData: (prev: unknown) => prev,
    },
    mutations: {
      retry: 1,
    },
  },
});
