import { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "../../context/I18nContext";
import { ToastProvider } from "../../context/ToastContext";

/**
 * Test-tuned QueryClient: no retries, no GC, no refetch on window
 * focus. Each call to `createTestQueryClient` returns a fresh
 * instance so cross-test cache leakage is impossible.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
  /**
   * Pass a fresh QueryClient if a test wants to assert on cache
   * contents directly. Default is a fresh per-render instance.
   */
}

/**
 * Renders `ui` wrapped in the minimum providers most components
 * require. Returns the standard RTL handle plus the queryClient
 * so tests can do `qc.invalidateQueries(...)` etc.
 *
 * Note: PlayerProvider is intentionally NOT mounted by default — it
 * touches PWA/notifications/SSE and most tests don't need it. Wrap
 * `ui` with `<PlayerProvider>` explicitly in tests that do.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
) {
  const queryClient = options.queryClient ?? createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </QueryClientProvider>
    );
  }

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}

// Re-exports so test files can grab everything from one path.
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
