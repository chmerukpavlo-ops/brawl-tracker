# Performance playbook

This document captures the performance budget, the workflow for
auditing the bundle, and the conventions every new feature should
follow to keep the app fast.

## Targets

| Metric | Budget | Source |
| ------ | ------ | ------ |
| Initial JS (gzip) | **≤ 200 KB** | Cold-start TTI on 3G |
| Initial JS (brotli) | **≤ 175 KB** | Modern browsers |
| Initial CSS (gzip) | ≤ 20 KB | One CSS file per route |
| LCP | ≤ 2.5 s | Web Vitals "good" |
| CLS | ≤ 0.1 | Web Vitals "good" |
| INP | ≤ 200 ms | Web Vitals "good" |
| Lighthouse Performance | ≥ 90 | Mobile preset |
| Lighthouse PWA | ≥ 90 | All required checks |

Bundle baseline before the optimization pass: **935 KB raw / 268 KB
gzip** in a single chunk. After: **~635 KB raw / ~175 KB brotli**
spread across ~25 chunks, with everything past the Home tab loaded
on demand.

## Bundle analysis

```bash
npm run analyze
```

Runs `vite build` with `ANALYZE=true` and opens
`dist/stats.html` — a treemap of every module weighted by minified
and brotli size. Use it whenever you add a dependency.

Each production build also writes precompressed `.br` and `.gz`
sibling files for every JS/CSS/SVG/JSON asset, so an HTTP server
configured with `Content-Encoding: br` serves them without paying
compression cost at request time.

## Lighthouse audit

```bash
# In one terminal:
npm run dev

# In another:
npm run audit
```

Writes `lighthouse-report.html` next to the repo. The script uses
the desktop preset by default — re-run with
`--preset=perf` and `--form-factor=mobile` for the more conservative
mobile profile when judging the budget.

## Code-splitting conventions

- **Default tab (Home)** stays eager — it's the cold-start entry.
  Every other screen is a `React.lazy()` import gated by a
  `<Suspense fallback={<ScreenSkeleton />}>` and the
  `ChunkLoadErrorBoundary`.
- **Modal sheets / drawers** (CompareSheet, ClubSheet, CoachPanel,
  BrawlerDetailSheet, etc.) are lazy and gated by `useMountOnce` so
  their chunk only downloads on first open, but the component stays
  mounted afterwards so `AnimatePresence` can play exit animations.
- **Heavy single-screen sections** (BattleLogSection, AI history) are
  lazy at the screen level.
- New heavy deps must be evaluated against the budget. If they push
  initial JS over 200 KB gzip, they must be loaded behind an
  `import()` call invoked from a user gesture.

## Manual vendor chunks

`vite.config.ts → build.rollupOptions.output.manualChunks` groups
`node_modules` into stable buckets:

| Chunk | Contents |
| ----- | -------- |
| `vendor-react` | `react`, `react-dom`, `scheduler` |
| `vendor-query` | `@tanstack/react-query` |
| `vendor-motion` | `motion` (`framer-motion` if added) |
| `vendor-icons` | `lucide-react` |
| `vendor-workbox` | dynamic Workbox runtime |
| `vendor` | everything else |

This stabilizes long-term caching: shipping a hotfix to the app
code doesn't re-invalidate the (much larger) React/motion vendor
chunks.

## Runtime

- **Web Vitals** are wired up in `src/main.tsx` via the inline
  implementation at `src/utils/webVitals.ts` (no `web-vitals`
  dependency — saves ~2 KB gzip). Dev builds log each metric to the
  console; prod keeps the observer alive for future analytics
  integration.
- **Console output** is dropped in production via the `esbuild.drop`
  config — keep `import.meta.env.DEV` guards for anything you want
  to ship through.
- **Brawlify CDN** is preconnected from `index.html` so the first
  brawler avatar doesn't pay a TLS handshake.

## Image discipline

Use `BrawlerAvatar` for brawler artwork — it already enforces
`width`/`height`, `loading="lazy"`, `decoding="async"`. For other
remote images, use `src/components/ui/OptimizedImage.tsx`:

- Always pass intrinsic `width` and `height` (no CLS).
- Pass `responsiveWidths` + `sizes` for any image rendered at multiple
  viewports.
- Above-the-fold hero images get `eager` to opt into
  `fetchpriority="high"`.

## Workflow for new components

1. Open a small PR.
2. Run `npm run analyze` before/after; diff the chunk you touched.
3. Lazy-load any component that's behind a user gesture or
   conditional render and weighs > 10 KB minified.
4. Reserve layout for any image / iframe / async render to keep CLS
   at zero.
5. Memoize work that runs per render only when it isn't already
   cheap — `useMemo` for filtered/sorted arrays and grouping; plain
   functions for everything else.

## Resilience

- Lazy chunks that fail to load (offline, stale hash after deploy)
  surface a friendly retry card via `ChunkLoadErrorBoundary`. Stale
  hashes automatically trigger a full reload to pick up the new
  `index.html`.
- The PWA service worker precaches the latest entry HTML and core
  chunks, so an offline launch still gets the Home tab and cached
  player data.

## When not to optimize

- **Virtualization** is not yet warranted — the longest list
  (leaderboard) tops out at ~200 rows. Revisit if a list crosses
  500.
- **Web Workers** are not yet warranted — no client-side computation
  blocks the main thread for > 16 ms.
- **`PlayerContext` splitting** would be invasive; TanStack Query
  already moved the highest-frequency state out (player/club/
  leaderboard/battle log) into its own subscription tree.
