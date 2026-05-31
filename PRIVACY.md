# Privacy

This document explains exactly what data leaves your device when you
use the Brawl Stars tracker, what stays local, and how to opt out at
any time.

## TL;DR

- **Default**: no analytics, no error reports, no third-party calls
  beyond the Brawl Stars / Brawlify CDNs needed to render the game data
  you're looking at.
- **Optional, independently toggleable**:
  - Anonymous **error and performance reporting** via Sentry.
  - Anonymous **product analytics** via Plausible / Umami / PostHog
    (whichever the operator picked).
- **Never collected**: player tag, nickname, club name, email, or IP
  address. Even when both toggles are on.
- **Opt-out anywhere**: Settings → Privacy. Two switches, fully
  independent.

## Data the app stores on your device

All persistent state is in `localStorage`, scoped to your browser /
profile. Clearing site data wipes everything below.

| Key | Contents | Reason |
| --- | --- | --- |
| `brawl_my_player` | Your player tag | "My profile" shortcut |
| `brawl_pinned_players`, `brawl_pinned_groups` | Tags + custom names you've pinned | Quick re-load |
| `brawl_search_history` | Last 10 tag searches | UX convenience |
| `brawl_daily_checkin`, `brawl_goals`, `brawl_achievements` | Local progress | Local-only gamification |
| `brawl_ai_history` | AI Coach saved advice | Personal library |
| `brawl_player_cache_*` | Stale-while-revalidate cache of API responses | Performance |
| `brawl_locale`, `brawl_haptic`, `brawl_voice_prefs`, … | UI preferences | Settings |
| `brawl_anon_id` | Random UUID generated locally | Telemetry user.id (only used after consent) |
| `brawl_telemetry_consent` | `"granted"` / `"denied"` | Records your error-reporting choice |
| `brawl_analytics_consent` | `"granted"` / `"denied"` | Records your analytics choice |

The full key list is the source of truth in `src/utils/backup/storage.ts`
(constants `USER_DATA_KEYS` + `PREFERENCE_KEYS`). Reset wipes the
matching prefix, including `brawl_player_cache_*`.

## Network calls the app always makes

- **Brawl Stars API** (proxied through `/api/*` to keep your token
  server-side): the player / club / leaderboard data you're viewing.
- **Brawlify CDN** (`cdn.brawlify.com`): brawler portraits and map
  images. Loaded directly by the `<img>` tags.
- **Google Gemini AI** (proxied through `/api/gemini/*`): only fires
  when you tap the AI Coach.

These calls are necessary for the app to function. There is no
alternative offline path beyond the local cache, which is itself
populated from these calls.

## Optional telemetry (off by default)

When you tap **Allow** on the consent banner — or turn the switch on
in Settings → Privacy — the app loads `@sentry/react` lazily and starts
reporting:

- **Crash data**: stack traces, browser/OS user agent, breadcrumbs of
  recent UI actions.
- **Performance**: Web Vitals (LCP, CLS, INP), navigation timings,
  HTTP response times.
- **Anonymous user id**: a UUID generated in your browser. Resets when
  you clear site data or uninstall.

### What is scrubbed before leaving your device

`src/lib/telemetry.ts` runs every event through `scrubEvent` before
Sentry is allowed to send it. The redactor:

1. **Replaces hash-prefixed player tags** like `#2PP0LJL8` with
   `#PLAYER_TAG`. Same for URL-encoded `%23ABCDEF`.
2. **Replaces email-shaped strings** with `[email]`.
3. **Deletes `request.headers` and `request.cookies`** entirely (they
   may carry auth tokens).

Unit tests in `src/lib/telemetry.test.ts` lock these rules in.

### What we never collect

- Player tag, nickname, club name, country.
- IP address (`sendDefaultPii: false`; Sentry's ingest also IP-scrubs).
- Email, phone, or any account identifier.
- Session replay video or input keystrokes (the replay integration is
  not enabled).

## Optional product analytics (off by default)

Independent of crash reporting. When you flip on **Analytics** in
Settings → Privacy, the app loads one of three lightweight backends
(whichever the operator configured via `VITE_ANALYTICS_BACKEND`):

- **Plausible** (`plausible.io`): single `<script>`, no cookies.
- **Umami**: same shape, runs on the operator's own server.
- **PostHog**: HTTP `POST` to `/capture/`. We deliberately don't
  load `posthog-js` so autocapture, session replay, and surveys
  remain off by construction.

### Events we send

The full list lives in `src/types/analytics.ts` and
`ANALYTICS.md`. They fall into a few buckets:

- **Page views** (`/tabs/home`, `/tabs/stats` …) — which screen you
  open, no parameters.
- **Feature usage** (`pin_player`, `ai_coach_request`,
  `share`, …) — the action and a small structured payload (boolean
  flags, durations in milliseconds, counts).
- **Onboarding funnel** (`onboarding_step`, `onboarding_complete`,
  `onboarding_skip`) — which step you reached.

Every payload runs through `src/lib/analytics/scrub.ts` before it
leaves the device, replacing anything that looks like a player tag
with a redacted token.

### What product analytics do not see

- Your search query (we only record _whether_ a search succeeded, not
  the tag you typed).
- Brawler / map / club names you tapped — the dashboard sees
  "encyclopedia entry opened", not _which_ entry.
- AI Coach questions or answers.
- Anything in `localStorage` (no `pinned_players`, no `goals`, no
  `ai_history`).

## Opting out

- **Banner**: tap **Essentials only** the first time you see it. The
  SDK is never loaded.
- **Settings → Privacy**: toggle off. The SDK shuts down (`Sentry.close`)
  and any in-flight events are discarded.
- **Hard reset**: Settings → "Reset all data" wipes both the consent
  flag and the anonymous id; you'll see the banner again on next boot.

Opting out at any point is reversible — and reversible without
penalty. Nothing in the app is gated behind telemetry consent.

## Data retention

When telemetry is on, error events live in Sentry's cloud for the
period your project's plan allows (typically 30–90 days for the free
tier). After that, Sentry's batch jobs delete them. Sentry's data
processing addendum: <https://sentry.io/legal/dpa/>.

If the project is self-hosted (GlitchTip on our infrastructure), the
retention is set by the operator — refer to the deployment configured
in your fork.

## Questions / contacts

- For implementation questions: see `OBSERVABILITY.md`.
- To ask us to delete a specific anonymous id from Sentry: open an
  issue with the id (visible in the ErrorBoundary fallback as
  `Event ID: xxxxxxxx`), and we'll process the deletion request.
