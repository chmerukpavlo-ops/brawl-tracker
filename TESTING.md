# Testing

This project ships three layers of automated tests. Run them locally,
keep them green in CI, and add a test next to any new utility or
component you touch.

| Layer | Tool | Speed | Where it lives |
| ----- | ---- | ----- | -------------- |
| Unit | Vitest | < 5 s | `src/**/*.test.ts` |
| Integration (DOM) | Vitest + RTL + MSW | < 30 s | `src/**/*.test.tsx` |
| E2E | Playwright (Chromium / Mobile Safari / Pixel 5) | < 5 min | `e2e/**/*.spec.ts` |

## Quickstart

```bash
npm run test            # watch mode
npm run test:run        # one-shot (CI-style)
npm run test:coverage   # one-shot + coverage report → coverage/index.html
npm run test:e2e        # Playwright (auto-starts dev server)
npm run test:e2e:ui     # Playwright UI mode for debugging
npm run test:all        # unit + e2e back-to-back
```

First-time setup before running e2e on a fresh checkout:

```bash
npx playwright install --with-deps chromium
```

## Layout

```
src/
  test/
    setup.ts                ← global Vitest setup (MSW, DOM polyfills)
    msw/
      handlers.ts           ← default HTTP fixtures
      server.ts             ← node setup (used by Vitest)
      browser.ts            ← browser worker (for Playwright/dev)
    fixtures/
      player.ts             ← mockPlayer()
      battle.ts             ← mockBattle(), mockBattleLog()
      club.ts, leaderboard.ts
    utils/
      renderWithProviders.tsx ← RTL render + QueryClient + I18n + Toast
      renderHook.tsx          ← hook variant of the above
e2e/
  smoke.spec.ts             ← landing checks
playwright.config.ts
.github/workflows/test.yml  ← CI: unit + e2e jobs
```

## Writing tests

### Pure utility / module-level

```ts
import { describe, it, expect } from "vitest";
import { computeResult } from "./battleHelpers";
import { mockBattle } from "../test/fixtures/battle";

describe("computeResult", () => {
  it("treats showdown rank 1–3 as victories", () => {
    const entry = mockBattle({ battle: { result: undefined, rank: 2, mode: "soloShowdown" } });
    expect(computeResult(entry)).toBe("victory");
  });
});
```

Patterns we follow:

- One `describe` per public function.
- Arrange-Act-Assert; no shared mutable state across tests.
- Reach for fixtures (`src/test/fixtures/*`) rather than building
  ad-hoc objects — they stay in sync with the real types.
- `localStorage` and `sessionStorage` are wiped in `afterEach`; rely
  on it instead of cleaning up yourself.

### Hooks

Use `renderHook` from `src/test/utils/renderHook.tsx`:

```ts
import { act } from "@testing-library/react";
import { renderHook } from "../test/utils/renderHook";
import { useMountOnce } from "./useMountOnce";

it("stays mounted once `active` flips true", () => {
  const { result, rerender } = renderHook(({ active }: { active: boolean }) => useMountOnce(active), {
    bare: true,            // skip I18n + Toast (faster, no context dependency)
    initialProps: { active: false },
  });
  act(() => rerender({ active: true }));
  act(() => rerender({ active: false }));
  expect(result.current).toBe(true);
});
```

Pass `bare: false` (the default) when the hook reads from i18n or
toast context.

### Components

`renderWithProviders` mounts the standard provider tree
(`QueryClientProvider`, `I18nProvider`, `ToastProvider`). Add
`<PlayerProvider>` manually in the test if the component you're
rendering reads it — most don't.

```tsx
import { renderWithProviders, screen, userEvent } from "../test/utils/renderWithProviders";
import MyButton from "./MyButton";

it("fires onClick", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  renderWithProviders(<MyButton onClick={onClick}>Press</MyButton>);
  await user.click(screen.getByRole("button", { name: "Press" }));
  expect(onClick).toHaveBeenCalled();
});
```

### HTTP mocks

MSW is wired through `src/test/msw/server.ts`. The default handlers
cover every `/api/*` route the client touches. Override per-test
when you need a specific response:

```ts
import { http, HttpResponse } from "msw";
import { server } from "../test/msw/server";

it("shows error toast on 500", async () => {
  server.use(
    http.get("/api/v1/player/:tag", () =>
      HttpResponse.json({ message: "boom" }, { status: 500 })
    )
  );
  // ... render + assert error UI
});
```

Unhandled requests **fail the test** — this catches typos like
calling the wrong endpoint. Add the handler to `handlers.ts` if it's
a real route, or `server.use(...)` if it's test-specific.

### E2E

```ts
import { test, expect } from "@playwright/test";

test("renders home", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).toBeVisible();
});
```

The Playwright config sets `baseURL` to `http://localhost:5173` and
spins up `npm run dev` automatically. The dev server's MSW worker
is opt-in (see `src/test/msw/browser.ts`); without it, e2e talks to
the real backend. For deterministic e2e, gate a `VITE_ENABLE_MSW=1`
flag and call `worker.start()` from `main.tsx`.

## Coverage

```bash
npm run test:coverage
# open coverage/index.html
```

Coverage gates live in `vite.config.ts → test.coverage.thresholds`:

| Scope | Floor |
| ----- | ----- |
| Global (statements / lines) | 5% |
| Global (functions / branches) | 3% |
| `utils/backup/crypto.ts` | 95% statements |
| `utils/backup/storage.ts` | 85% statements |
| `utils/backup/importer.ts` | 70% statements |
| `utils/backup/migrations.ts` | 70% statements |
| `utils/backup/exporter.ts` | 50% statements |
| `utils/battleHelpers.ts` | 55% statements |
| `hooks/useMountOnce.ts` | 90% statements |

The **global** floors are intentionally low at MVP — the suite covers
a focused slice of the codebase, and we don't want to block CI on
files no one has tested yet. The **per-file** floors make sure any
regression in the well-covered utilities (backup, battle helpers)
fails the build.

When you write a test for a new file, add a per-file gate at roughly
the level you actually achieved minus 5% — that locks in your work
without making future small refactors painful.

## CI

`.github/workflows/test.yml` runs on every push to `main` and every
pull request, in two parallel jobs:

- **Unit + integration**: `tsc --noEmit` then `npm run test:coverage`,
  uploads coverage as an artifact.
- **E2E**: installs Playwright Chromium, builds the app, runs the
  e2e suite against Mobile Chrome and Desktop Chrome. The Playwright
  HTML report is uploaded on failure.

## Anti-patterns we avoid

- **No `data-testid` unless unavoidable.** Use `getByRole`,
  `getByLabelText`, `getByText` so tests reflect what users
  perceive.
- **No fetch mocking by hand.** MSW is the only mock layer — keep it
  that way.
- **No "snapshot" tests of large component trees.** Snapshots get
  rubber-stamped; assert on observable behavior instead.
- **No real timers in tests that schedule work.** Use
  `vi.useFakeTimers()` and advance time explicitly.
- **No coverage chasing for its own sake.** A meaningful test for a
  hook beats five trivial assertions on a Button.
