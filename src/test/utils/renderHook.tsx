import { type ReactNode } from "react";
import { renderHook as baseRenderHook, type RenderHookOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "../../context/I18nContext";
import { ToastProvider } from "../../context/ToastContext";
import { createTestQueryClient } from "./renderWithProviders";

interface Options<Props> extends Omit<RenderHookOptions<Props>, "wrapper"> {
  queryClient?: QueryClient;
  /**
   * Skip the I18n + Toast providers (cheaper for pure-utility hooks
   * that don't touch context).
   */
  bare?: boolean;
}

/**
 * Wrapper around RTL's `renderHook` that injects the same providers
 * as `renderWithProviders`. Defaults to the full provider tree;
 * pass `bare: true` for hooks that don't read context (faster).
 */
export function renderHook<Result, Props = unknown>(
  hook: (props: Props) => Result,
  options: Options<Props> = {}
) {
  const queryClient = options.queryClient ?? createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    if (options.bare) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }
    return (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </QueryClientProvider>
    );
  }

  return { queryClient, ...baseRenderHook(hook, { wrapper: Wrapper, ...options }) };
}

export { act, waitFor } from "@testing-library/react";
