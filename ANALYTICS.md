# Product analytics

Privacy-friendly analytics for understanding **what** users do, never
**who** they are. This document covers the architecture, the event
taxonomy, and the operational checklist.

> Sister document: [`PRIVACY.md`](./PRIVACY.md) — what we collect and
> what we don't, written for end users.

## Architecture in 30 seconds

```
              ┌─────────────────────────┐
              │  src/types/analytics.ts │   <- discriminated union
              │  AnalyticsEvent         │
              └────────────┬────────────┘
                           │
                  type-checked at compile
                           │
              ┌────────────▼────────────┐
              │  src/lib/analytics/     │
              │  index.ts (facade)      │
              └────────────┬────────────┘
                           │ runtime: load on consent
                           │
       ┌────────┬──────────┼──────────┬──────────┐
       ▼        ▼          ▼          ▼          ▼
   NoopAdapter  Plausible  Umami    PostHog   (extension point)
       │        │          │          │
       │        <script>   <script>   /capture/ (HTTP)
       │
       │        each adapter is its own bundle chunk
       │        (see vite.config.ts manualChunks)
       ▼
   no-op (default; nothing leaves the device)
```

- **Facade**: `src/lib/analytics/index.ts`. `track`, `trackPageView`,
  `setAnalyticsOptOut`, `initAnalytics`. Safe to call before init —
  silently lands on the noop adapter.
- **Adapters**: One file per backend. Each is `dynamic import`-ed on
  demand, so users who never grant consent never download the code.
- **Consent**: `src/lib/analytics/consent.ts`. Storage key
  `brawl_analytics_consent`, separate from Sentry's
  `brawl_telemetry_consent`. Two switches in `Settings → Privacy`.
- **Scrub**: `src/lib/analytics/scrub.ts`. Runs every property
  payload through the same regex used by `src/lib/telemetry.ts` so
  player tags can never escape — even if a developer puts one in by
  accident.

## Choosing a backend

| Backend     | Cost                        | Self-host? | Best for                                        |
| ----------- | --------------------------- | ---------- | ----------------------------------------------- |
| **Plausible** | $9 / mo (cloud)            | ✅ paid     | Simple, GDPR-clean, lightweight                |
| **Umami**     | Free (self-host) / $9 cloud | ✅ free     | OSS lovers; nice dashboard out of the box      |
| **PostHog**   | Free up to 1M events / mo  | ✅ free     | Funnels, retention, breakdowns                  |
| **noop**      | Free                       | n/a        | Default; no backend wired up yet                |

The recommendation for this repo is **PostHog Cloud** for the funnel /
retention features (we use the public capture endpoint, no SDK), or
**Umami** if you want to keep everything inside your own infra.

Switch backends by updating `VITE_ANALYTICS_BACKEND` and the
corresponding `VITE_*` env vars — no code changes needed.

## Event taxonomy

The complete list lives in `src/types/analytics.ts` as a discriminated
union. Adding a new event means extending that file — that's the only
way `track({ name: "..." })` will type-check.

### Naming conventions

- **Event names**: `snake_case`, verb-noun (`search_player`,
  `pin_player`, `ai_coach_request`). Past-tense for completed actions
  (`pwa_installed`, `goal_completed`) is also acceptable when the
  event truly fires after the fact.
- **Property names**: `snake_case`. Booleans get an affirmative
  prefix (`has_result`, `is_demo`). Durations get a `_ms` suffix.
  Counts are plain numbers.
- **No PII**: never include player tag, nickname, club name, exact
  coordinates, AI prompt content, or any user-typed text. The scrub
  layer is a defense-in-depth, not the primary contract.

### Event categories

The current taxonomy has the following groups (see
`src/types/analytics.ts` for exact shapes):

- **Discovery / search** — `search_player`, `view_battle_log`,
  `filter_battles`, `view_battle_detail`
- **Pinned profiles** — `pin_player`, `unpin_player`,
  `set_my_player`
- **Encyclopedia** — `open_brawler_detail`, `open_map_detail`,
  `open_game_mode_detail`
- **AI Coach** — `ai_coach_request`, `ai_coach_complete`,
  `ai_coach_cancel`, `ai_advice_save`
- **Comparison / leaderboards** — `compare_players`,
  `view_leaderboard`, `view_club`
- **Goals / streak / achievements** — `set_goal`, `complete_goal`,
  `unlock_achievement`, `checkin`
- **Sharing** — `share`
- **Settings & preferences** — `theme_change`, `locale_change`,
  `haptic_toggle`, `notification_subscribe`
- **Backup** — `backup_export`, `backup_import`
- **PWA lifecycle** — `pwa_install`, `pwa_install_dismissed`,
  `pwa_update_accepted`
- **Onboarding** — `onboarding_step`, `onboarding_complete`,
  `onboarding_skip`
- **Errors** — `error_recovered`

### Adding a new event

1. Open `src/types/analytics.ts`.
2. Add a new variant to the `AnalyticsEvent` union with the smallest
   property shape that answers your question.
3. Update `ANALYTICS.md` (this file) so reviewers see the change in
   the same PR.
4. Wire it in: import `track` from `src/lib/analytics`, call
   `track({ name: "...", properties: {...} })`. The compiler is your
   friend.
5. Add a test if there's non-obvious branching in the call site.

### Removing or renaming an event

Removing breaks dashboards that reference the old name. Two options:

- **Soft removal**: keep the variant in the union, stop calling it.
  Dashboards continue to work; no events arrive. Delete after one
  release cycle.
- **Rename**: deprecate the old name in `ANALYTICS.md`, ship the new
  one in parallel for one release, then remove the old.

## Implementation choices

### Why HTTP-only PostHog?

`posthog-js` is feature-rich (autocapture, session replay, surveys,
feature flags) — features we deliberately don't want for privacy
reasons. Speaking PostHog's `/capture/` endpoint directly:

- Saves ~30 KB gzipped on the bundle.
- Avoids autocapture (which would surveil every click).
- Avoids session replay (which records DOM mutations).
- Avoids cookie-based session tracking.

Trade-off: no `$session_id`, no live feature flags. Both can be added
later as a separate optional dependency if needed.

### Why split adapter chunks?

`vite.config.ts` declares `analytics-plausible`, `analytics-umami`,
`analytics-posthog` as named manual chunks. Combined with the dynamic
`import()` inside the facade, this guarantees:

- Default install ships **zero analytics code** in the eager bundle.
- Choosing a backend only ships **that backend's** adapter, not the
  others.
- Switching backends in env doesn't require a new release of the
  client code (it's the same source — different chunk loads).

### Why two consent toggles?

`src/lib/telemetryConsent.ts` is for Sentry; `src/lib/analytics/consent.ts`
is for product analytics. The threat models are different:

- **Crash reporting**: useful even for users who refuse analytics —
  they'd rather have you fix bugs than know what they clicked.
- **Analytics**: useful even when users don't trust your error
  pipeline — they understand "anonymous pageviews" but distrust
  "third-party crash collector".

Splitting the toggles respects both choices and matches the way GDPR
case law has trended over the last few years.

## Self-hosting Umami (recipe)

Save as `docker-compose.umami.yml` next to your other infra:

```yaml
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    ports: ["3001:3000"]
    environment:
      DATABASE_URL: postgresql://umami:umami@db:5432/umami
      DATABASE_TYPE: postgresql
      HASH_SALT: ${UMAMI_HASH_SALT}
      DISABLE_TELEMETRY: "1"
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: umami
    volumes:
      - umami-db:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  umami-db:
```

Bring it up:

```bash
docker compose -f docker-compose.umami.yml up -d
```

Create the website inside Umami's UI, copy the website ID, and set:

```bash
VITE_ANALYTICS_BACKEND=umami
VITE_UMAMI_WEBSITE_ID=<copied id>
VITE_UMAMI_HOST=https://your-umami.example.com
```

## Bypass the ad-blocker tax

Public CDNs for analytics (`plausible.io`, `us.i.posthog.com`) are on
most ad-blocker default lists. If you care about getting events from
the ~30 % of users who run uBlock, proxy the script through your own
domain. Recipe for our `server.ts`:

```ts
import { createProxyMiddleware } from "http-proxy-middleware";
app.use(
  "/p",
  createProxyMiddleware({
    target: "https://plausible.io",
    changeOrigin: true,
    pathRewrite: { "^/p": "" },
  })
);
```

Then point the script at `/p/js/script.tagged-events.js`. Same for
the `/api/event` POST. PostHog provides a [reverse-proxy
guide](https://posthog.com/docs/advanced/proxy) covering the same
trick.

## Operational dashboards (suggested)

Inside Plausible / Umami / PostHog, set up:

- **Top events**: `search_player`, `pin_player`, `ai_coach_complete`.
- **Funnels**:
  - Onboarding: `onboarding_step (step=0)` → `... (step=4)` →
    `onboarding_complete (skipped=false)`.
  - AI: `ai_coach_request` → `ai_coach_complete` vs `ai_coach_cancel`.
  - PWA: `pwa_install_dismissed` vs `pwa_install`.
- **Retention cohorts**: D1 / D7 / D30 by anonymous id.
- **Feature adoption**: % of weekly actives who fired
  `pin_player`, `set_goal`, `ai_coach_request`.
- **Distribution charts**: `locale`, `theme`, `is_pwa` from the
  `identify` traits.

### Target metrics

| Metric                      | Target | Why                                   |
| --------------------------- | ------ | ------------------------------------- |
| Onboarding completion rate  | > 60 % | Below this, the tour is friction      |
| AI Coach complete vs cancel | > 80 % | Cancels usually = bad streaming UX    |
| D7 retention                | > 30 % | Industry baseline for utility apps    |
| PWA install rate            | > 5 %  | Anything lower → install prompt issue |

## Local development

The facade is loaded in `src/main.tsx` regardless of dev/prod, but the
default adapter is `noop` and `import.meta.env.DEV` short-circuits the
real adapters' `init()`. So in dev:

- `track()` calls hit the `NoopAdapter`, which logs to `console.debug`.
- No script tag is injected; no `/capture/` call is made.

To test against a real backend locally, copy `.env.example` →
`.env.local`, fill in the relevant `VITE_ANALYTICS_*` vars, and
remove the `if (import.meta.env.DEV) return` guard temporarily in
the adapter you're testing.

## Tests

Unit tests live next to the source files:

- `src/lib/analytics/scrub.test.ts` — PII regex correctness.
- `src/lib/analytics/noop.test.ts` — adapter contract lock.
- `src/lib/analytics/consent.test.ts` — storage + subscriber logic.
- `src/lib/analytics/index.test.ts` — facade behaviour, fail-soft.

Run:

```bash
npm run test:run -- src/lib/analytics
```
