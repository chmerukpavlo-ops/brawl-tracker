/**
 * Vitest setup: runs ONCE per worker before any test file is imported.
 *
 *   - Wires `@testing-library/jest-dom` matchers (`toBeInTheDocument`,
 *     etc.).
 *   - Starts the MSW node server so every HTTP request in tests is
 *     mocked. Unhandled requests fail loudly so we don't silently hit
 *     real APIs.
 *   - Cleans React + storage state between every test for isolation.
 *   - Polyfills the small handful of browser APIs that happy-dom
 *     doesn't ship out of the box (matchMedia, IntersectionObserver,
 *     vibrate, createObjectURL).
 */
import "@testing-library/jest-dom/vitest";
// `vitest-axe@1.x` augments the pre-vitest@2 `Vi.Assertion` namespace
// which vitest 4 dropped. Our local augmentation
// (`src/test/vitest-axe.d.ts`) re-declares `toHaveNoViolations`
// against the current `@vitest/expect` `Matchers` interface so tests
// type-check.
import * as axeMatchers from "vitest-axe/matchers";
import { afterAll, afterEach, beforeAll, expect, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";

// Wire up the `vitest-axe` custom matcher so accessibility tests can
// call `expect(container).toHaveNoViolations()` without per-file
// boilerplate. The matcher pulls its rule list from the version of
// axe-core that ships with `vitest-axe` (currently 4.10.x).
expect.extend(axeMatchers);

// ─── Storage polyfill ─────────────────────────────────────────────
// happy-dom 20+ delegates to Node's experimental localStorage, which
// is gated behind `--localstorage-file`. Tests want a simple
// in-memory store with full isolation between runs, so we install
// our own implementation of the Storage interface.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function installStorage(name: "localStorage" | "sessionStorage"): void {
  const storage = new MemoryStorage();
  const target = globalThis as unknown as Record<string, Storage>;
  Object.defineProperty(target, name, {
    value: storage,
    writable: true,
    configurable: true,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, name, {
      value: storage,
      writable: true,
      configurable: true,
    });
  }
}

installStorage("localStorage");
installStorage("sessionStorage");

// ─── MSW lifecycle ────────────────────────────────────────────────
beforeAll(() => {
  // `bypass` instead of `error` would silently allow unmocked
  // requests through — we want explicit fixtures for everything.
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  if (typeof localStorage !== "undefined") localStorage.clear();
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});

// ─── DOM polyfills missing from happy-dom ─────────────────────────

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // legacy
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn().mockReturnValue(false),
    })),
  });
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  class MockIntersectionObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    root = null;
    rootMargin = "";
    thresholds: ReadonlyArray<number> = [];
  }
  globalThis.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

if (typeof globalThis.ResizeObserver === "undefined") {
  class MockResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
}

if (typeof navigator !== "undefined" && !("vibrate" in navigator)) {
  Object.defineProperty(navigator, "vibrate", {
    writable: true,
    value: vi.fn().mockReturnValue(true),
  });
}

// `URL.createObjectURL` is needed by the backup exporter — happy-dom
// provides it but throws on Blob args in some versions, so stub.
if (typeof URL !== "undefined") {
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
}

// happy-dom doesn't ship `scrollTo` on Element by default.
if (typeof Element !== "undefined" && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
}
