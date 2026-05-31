/**
 * Regression tests for the runaway-fetch bug fixed by routing every
 * outer-scope read in `handleQuery` through a `latestRef`, making the
 * callback truly stable.
 *
 * What we assert here:
 *
 *  1. `handleQuery` keeps the same reference across re-renders. Any
 *     consumer effect listing it in deps stays quiet (no cascade).
 *  2. Calling `handleQuery` once results in exactly one network hit
 *     for that tag — not 10+ as in the original bug report.
 *
 * Both checks are integration-level: a real `PlayerProvider` is mounted
 * with the same provider tree used in production (QueryClient + Toast
 * + I18n), and the player endpoint is intercepted by MSW.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "./I18nContext";
import { ToastProvider } from "./ToastContext";
import { PlayerProvider, usePlayer } from "./PlayerContext";
import { server } from "../test/msw/server";
import { mockPlayer } from "../test/fixtures/player";

function makeWrapper() {
  // Test-tuned client: no retries / no GC / no focus refetch so a
  // hook's network behavior maps 1:1 onto requests we issue.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ToastProvider>
            <PlayerProvider>{children}</PlayerProvider>
          </ToastProvider>
        </I18nProvider>
      </QueryClientProvider>
    );
  };
}

// Clean URL between cases — `handleQuery` calls `updateUrl({ tag })`,
// and the bootstrap effect in the next mount would otherwise race
// against our explicit call by re-fetching the leftover `?tag=` value.
function resetUrl() {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", "/");
}

describe("PlayerContext — handleQuery stability", () => {
  beforeEach(() => {
    resetUrl();
  });
  afterEach(() => {
    resetUrl();
  });

  it("returns the same handleQuery reference across re-renders", () => {
    const { result, rerender } = renderHook(() => usePlayer(), {
      wrapper: makeWrapper(),
    });

    const first = result.current.handleQuery;
    // Force a few re-renders that would previously rebuild the callback
    // because of unstable upstream hook returns (useMutation, pinned,
    // notifications…). With the `latestRef` fix the reference must hold.
    rerender();
    rerender();
    rerender();

    expect(result.current.handleQuery).toBe(first);
  });

  it("issues exactly one network request per handleQuery call", async () => {
    const playerHits = vi.fn();
    // Drop-in handler with a counter so we can assert the loop is dead.
    server.use(
      http.get("/api/v1/player/:tag", ({ params }) => {
        playerHits();
        const raw = decodeURIComponent(String(params.tag));
        return HttpResponse.json(mockPlayer({ tag: `#${raw.replace(/^#/, "")}` }));
      })
    );

    const { result } = renderHook(() => usePlayer(), {
      wrapper: makeWrapper(),
    });

    // Wait for the one-shot bootstrap effect to fire and settle (demo
    // path, since neither URL `?tag=` nor `myPlayer.tag` is present).
    // Otherwise it would race our explicit call after the test sets
    // `?tag=` via `updateUrl` and double-count fetches.
    await waitFor(() => {
      expect(result.current.playerData).not.toBeNull();
    });
    playerHits.mockClear();

    await act(async () => {
      await result.current.handleQuery("#ABC123", {
        navigateHome: false,
        bypassDemo: true,
      });
    });

    expect(playerHits).toHaveBeenCalledTimes(1);

    // A second explicit call against the same tag is the user's
    // intent (e.g. a Refresh tap) and should fetch again — but only
    // once more, never spiraling.
    await act(async () => {
      await result.current.handleQuery("#ABC123", {
        navigateHome: false,
        bypassDemo: true,
        forceFresh: true,
      });
    });

    expect(playerHits).toHaveBeenCalledTimes(2);
  });
});
