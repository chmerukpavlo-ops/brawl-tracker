# Observability

The app supports optional, opt-in telemetry via [Sentry](https://sentry.io).
When enabled, errors and performance metrics from real users flow into a
single dashboard so we can fix regressions before more than a handful of
people hit them. When disabled (the default), nothing leaves the device.

This document covers operations: how to set it up, how to read the data,
and how to ship a release with valid source maps. For the user-facing
privacy story see [`PRIVACY.md`](./PRIVACY.md).

## How it works (one paragraph)

`@sentry/react` is **lazy-loaded** via dynamic `import()`. The SDK chunk
is only fetched when *both* (a) `VITE_SENTRY_DSN` is configured **and**
(b) the user has opted in via the consent banner / Settings toggle.
Without consent, every public method in `src/lib/telemetry.ts` is a strict
no-op — no SDK, no network, no bundle cost. With consent, errors,
breadcrumbs, and traces flow to Sentry. Backend errors run through a
parallel `@sentry/node` install in `server.ts`, gated by
`SENTRY_DSN_BACKEND`.

## ENV variables

All Sentry knobs are optional — the app works fine with none of them set.

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SENTRY_DSN` | client | DSN of the **frontend** project. Empty → SDK never loads. |
| `VITE_APP_VERSION` | client | Release tag for grouping events. Recommended: read from `package.json` in CI. |
| `SENTRY_DSN_BACKEND` | server | DSN of the **backend** project. Empty → server SDK skips init. |
| `SENTRY_TRACES_SAMPLE_RATE` | server | 0–1. Default `0.1`. |
| `SENTRY_AUTH_TOKEN` | build only | Required for source-map upload. **Never** commit. |
| `SENTRY_ORG` | build only | Sentry organization slug. |
| `SENTRY_PROJECT` | build only | Project slug. Defaults to `brawl-tracker`. |

## Setup walkthrough

1. Create two Sentry projects: one **React** (frontend), one **Node** (backend).
   Two projects let frontend stack traces resolve against the deployed
   client bundle and backend traces against the server build.
2. Copy the DSNs into `.env`:
   ```
   VITE_SENTRY_DSN="https://abc...@o123.ingest.sentry.io/4567"
   SENTRY_DSN_BACKEND="https://def...@o123.ingest.sentry.io/8901"
   VITE_APP_VERSION="$(node -p "require('./package.json').version")"
   ```
3. Restart the dev server. The frontend SDK still won't initialize until
   the user clicks **Allow** on the consent banner. To bootstrap a dev
   session: `localStorage.setItem('brawl_telemetry_consent', 'granted')`
   then refresh.

## Source maps + releases (production)

Stack traces from a minified bundle are useless without source maps.
Vite already emits `*.map` files alongside each chunk; we upload them to
Sentry **without** publishing them at the public path so end users can't
reconstruct the source.

```bash
# In CI, after `npm run build`:
export VITE_APP_VERSION=$(node -p "require('./package.json').version")
export SENTRY_AUTH_TOKEN=...   # from CI secrets
export SENTRY_ORG=your-org
export SENTRY_PROJECT=brawl-tracker

npm run sentry:sourcemaps
# → injects debug ids into ./dist
# → uploads sourcemaps to Sentry tagged with $VITE_APP_VERSION
# → original *.map files stay in ./dist and SHOULD be deleted before serving

rm dist/assets/*.map  # never deploy raw maps to the CDN
```

The convenience target `npm run release` runs `build` followed by
`sentry:sourcemaps`, but only if `SENTRY_AUTH_TOKEN` is set — local
builds without the token finish without errors.

If you'd rather use the Vite plugin (`@sentry/vite-plugin`), drop it in
the `plugins` array; the manual `@sentry/cli` flow above stays as the
fallback for local debugging.

## What we capture

| Surface | Details |
| --- | --- |
| Uncaught exceptions | All unhandled errors; React render errors via `<ErrorBoundary>` in `App.tsx`. |
| Promise rejections | Hooked by Sentry's default unhandled-rejection integration. |
| React Query failures | `QueryCache` + `MutationCache` global handlers in `src/lib/queryClient.ts`. 4xx + `AbortError` are *filtered out* — see `shouldReport`. |
| Web Vitals | LCP, CLS, INP, FCP, TTFB — flow as `breadcrumbs` and via `browserTracingIntegration` for the pageload transaction. |
| Span / transactions | `instrument(name, op, fn)` wraps any async block. Use it for AI calls, backup ops, deep links — anything user-perceivable. |
| Server errors | Express middleware `Sentry.setupExpressErrorHandler(app)` registered after all routes. |

## What we DELIBERATELY don't capture

- **Player tags / nicknames / club names.** Scrubbed by `scrubText` /
  `scrubEvent` / `scrubBreadcrumb` in `src/lib/telemetry.ts`. Tested in
  `telemetry.test.ts`.
- **Emails.** Scrubbed (the app doesn't ask for them, but we belt-and-
  brace the regex).
- **`request.headers` and `request.cookies`** — unconditionally deleted
  in `scrubEvent` because they may carry auth tokens.
- **IP addresses.** `sendDefaultPii: false` (Sentry honors this and IP
  scrubs at ingest).
- **Session replay.** Not enabled — adds substantial bundle weight and
  privacy surface. If you want it later, add `Sentry.replayIntegration({
  maskAllInputs: true, blockAllMedia: true })` to the integrations list
  in `initTelemetry`.

## Reading the dashboard

- **Issues** — grouped by stack-trace fingerprint. Sort by "users
  affected" rather than "events" (a single user with a `useEffect` loop
  can produce thousands of events).
- **Performance → Transactions** — pageload + `instrument()` spans show
  up here. p75 LCP > 4 s = poor.
- **Releases** — the version dropdown filters every panel. Always check
  this is set before debugging a regression.
- **User feedback** — currently disabled. Hook up the
  `Sentry.showReportDialog({ eventId })` call from `<ErrorFallback>` if
  the team decides to collect direct feedback.

### Recommended alerts

1. **First-seen issue in production** → email channel. Catches regressions
   before they're widespread.
2. **Error rate spike** (> 5 errors/min) → email + Slack.
3. **API failure rate** > 10% on `/api/v1/player/*` → Slack.
4. **Performance budget** — p75 LCP > 4 s for 5 min → email.

Configure these in Sentry → Alerts → Create Alert Rule.

## Local development

In dev (`MODE=development`), telemetry is gated by the same consent
flag. The default behavior is **off** — you'll see web-vitals printed to
console but nothing reaches Sentry. To exercise the full pipeline locally:

1. Set `VITE_SENTRY_DSN` in `.env`.
2. In the browser console: `localStorage.setItem('brawl_telemetry_consent', 'granted')`.
3. Reload — you'll see `[Sentry] node SDK initialized` (server) and the
   client SDK chunk in DevTools → Network.
4. Trigger an error, e.g.:
   ```js
   throw new Error('observability smoke test')
   ```
5. The event should appear in your dev project within ~30 s.

## Testing

- **Unit tests** for the scrub helpers live in `src/lib/telemetry.test.ts`.
  They cover the no-op invariant (telemetry never throws when uninitialized)
  + every PII redaction rule. Run them with `npm run test:run`.
- **Integration**: the React Query global error handlers don't have a
  dedicated test yet — the easiest way to validate is to point Vitest at
  a `<MemoryRouter>` rendering a query that returns 500 and assert that
  Sentry's `captureException` mock got called. Add that in a follow-up
  if regressions show up.

## Future bonuses

These are explicitly out of scope for the MVP rollout but easy to add
later:

- **Session replay** — see disclaimer above.
- **Release health / crash-free users** — already populated automatically
  once releases are tagged via `sentry:sourcemaps`.
- **Profiling** — `@sentry/profiling-node` for the backend; stays gated
  behind a separate ENV flag.
- **OpenTelemetry** — Sentry's tracing backend speaks OTel, so adding a
  `@opentelemetry/api` exporter alongside is non-disruptive.
- **Spotlight** — `Sentry.spotlight` for in-app dev event inspection;
  add to the dev-only branch of `initTelemetry`.
