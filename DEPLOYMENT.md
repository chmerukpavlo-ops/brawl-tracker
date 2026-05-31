# Deployment

This document covers how `brawl-stars-tracker` ships from a developer's
laptop to production, plus the rollback path when something breaks.

> The CI/CD pipeline is split across several workflows in
> `.github/workflows/`. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) first
> if you're new to the repo — it covers the local dev loop and commit
> conventions that drive automated releases.

## Environments

| Environment       | Purpose                          | Trigger                            | URL (set in repo vars)        |
| ----------------- | -------------------------------- | ---------------------------------- | ----------------------------- |
| `development`     | Local dev (`npm run dev`)        | Manual                             | `http://localhost:5173`       |
| `preview`         | Per-PR preview (Cloudflare Pages)| `pull_request` opened / synchronized | `pr-<number>.<project>.pages.dev` |
| `production`      | Live site                        | `push` to `main`                   | `vars.PRODUCTION_FRONTEND_URL`|
| `production-api`  | Live proxy (Fly.io)              | `push` to `main`                   | `vars.PRODUCTION_BACKEND_URL` |

Each environment is configured in **Settings → Environments** so we can
attach required reviewers and unique secrets per stage.

## First-time setup checklist

A fresh fork doesn't talk to any external service — every workflow
gracefully no-ops until you opt in. Flip these switches in order:

### 1. Repo variables (`Settings → Secrets and variables → Actions → Variables`)

| Variable                   | Values                       | Purpose                                 |
| -------------------------- | ---------------------------- | --------------------------------------- |
| `DEPLOY_TARGET`            | `cloudflare` / `vercel` / "" | Frontend deploy target                  |
| `BACKEND_TARGET`           | `fly` / ""                   | Backend deploy target                   |
| `CLOUDFLARE_PROJECT_NAME`  | e.g. `brawl-tracker`         | Cloudflare Pages project slug           |
| `PRODUCTION_FRONTEND_URL`  | full URL                     | Used for smoke tests + GH env URL       |
| `PRODUCTION_BACKEND_URL`   | full URL                     | Used for backend health check           |
| `LIGHTHOUSE_ENABLED`       | `true` / ""                  | Run Lighthouse on every preview         |
| `SEMANTIC_RELEASE_ENABLED` | `true` / ""                  | Auto-version + GitHub Release on `main` |
| `SLACK_NOTIFICATIONS`      | `true` / ""                  | Post deploy result to Slack             |

### 2. Repo secrets (same screen, "Secrets" tab)

Frontend (Cloudflare Pages):

- `CLOUDFLARE_API_TOKEN` — token with `Pages:Edit` scope.
- `CLOUDFLARE_ACCOUNT_ID`.

Frontend (Vercel, alternative):

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

Backend (Fly.io):

- `FLY_API_TOKEN` — generate via `flyctl auth token`.

Sentry (optional, see [`OBSERVABILITY.md`](./OBSERVABILITY.md)):

- `VITE_SENTRY_DSN_DEV`, `VITE_SENTRY_DSN_PROD` — frontend DSNs.
- `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` — for source-map upload.

Other:

- `CODECOV_TOKEN` — coverage uploads (optional, soft-fails on miss).
- `SLACK_WEBHOOK` — incoming-webhook URL for deploy alerts.

### 3. Branch protection (`Settings → Branches → main`)

Required for a healthy pipeline:

- ✅ Require pull request before merging
- ✅ Require status checks to pass before merging
  - **`CI`** (the aggregate job in `ci.yml`)
  - `e2e (chromium · shard 1/2)` and `e2e (chromium · shard 2/2)`
  - `audit`, `codeql`
- ✅ Require branches to be up to date before merging
- ✅ Require linear history (rebase / squash only)
- ✅ Do not allow bypassing the above settings (admins included)
- ✅ Require signed commits (optional but recommended)

### 4. External services to provision

- **Cloudflare Pages** — create a project named per your
  `CLOUDFLARE_PROJECT_NAME` variable. No build settings needed; we
  upload `dist/` directly via Wrangler.
- **Fly.io** — `flyctl launch --no-deploy` from the repo root reads
  `fly.toml` and creates the app. First deploy happens via
  `deploy-production.yml`.
- **Sentry** — two projects (frontend "react" platform, backend
  "node"). DSNs go into the secrets above.
- **Codecov** — connect the GitHub repo to Codecov and copy the upload
  token.

## What happens on a typical PR

```
┌────────────────────┐
│ git push origin … │
└─────────┬──────────┘
          ▼
┌────────────────────┐  ci.yml
│ lint + typecheck   │  ← <2 min
│ unit + integration │  ← <3 min
│ build + budget     │  ← <2 min
└─────────┬──────────┘
          ▼
┌────────────────────┐  e2e.yml
│ Playwright × 2     │  ← <10 min, parallel shards
│ (chromium + webkit)│
└─────────┬──────────┘
          ▼
┌────────────────────┐  preview.yml (if DEPLOY_TARGET set)
│ Build + deploy     │  ← <3 min
│ Cloudflare Pages   │
│ Comment URL on PR  │
└────────────────────┘
```

## Production deploy

`deploy-production.yml` runs in two parallel jobs:

- **Frontend** — build, upload Sentry sourcemaps, deploy to Cloudflare,
  notify Sentry of the new release, run a smoke test against
  `PRODUCTION_FRONTEND_URL`.
- **Backend** — `flyctl deploy --remote-only`, then hit
  `/api/health` with a 5-attempt retry loop.

Both jobs use the `production` (resp. `production-api`) GitHub
environments — add **required reviewers** there if you want a manual
approval gate.

## Releases

Releases are driven by [semantic-release](https://semantic-release.gitbook.io/)
based on Conventional Commits. Set `SEMANTIC_RELEASE_ENABLED=true` to
enable; the workflow then:

1. Reads commits since the last tag.
2. Picks the next semver bump (`feat:` → minor, `fix:` → patch,
   `feat!:` → major).
3. Generates `CHANGELOG.md`.
4. Pushes the tag, creates a GitHub Release with the auto-generated
   notes, bumps `package.json`, commits with `[skip ci]`.

The first release won't trigger until you have at least one
release-worthy commit on `main`. Until then the workflow stays green
but a no-op.

## Rollback

### Frontend (Cloudflare Pages)

```bash
# Via dashboard:
Cloudflare → Pages → <project> → Deployments
  → click previous green deployment → Manage deployment → Rollback
```

```bash
# Via CLI:
npx wrangler pages deployment list --project-name=brawl-tracker
npx wrangler pages deployment promote <deployment-id> --project-name=brawl-tracker
```

### Backend (Fly.io)

```bash
flyctl releases list -a brawl-tracker-api
flyctl releases rollback <version> -a brawl-tracker-api
```

### Sentry release

```bash
# Mark the broken release as archived so error groupings stop
# attributing new events to it.
sentry-cli releases archive <sha>
```

## Manual deploy (skipping the queue)

Both `deploy-production.yml` and `release.yml` accept
`workflow_dispatch`, so you can run them from
**Actions → Deploy Production → Run workflow** without an actual push.

## Debugging a failed deploy

1. Open the failed run from **Actions** and locate the failing step's
   logs.
2. If it's a deploy step (Cloudflare/Fly), most issues are bad secrets
   — re-check **Settings → Environments → \<env\> → Secrets**.
3. If smoke tests fail, the deploy itself succeeded but the new
   version is unhealthy. Roll back via the steps above and open a
   bug.

## Local CI dry-run

```bash
npm run ci:local
```

Runs `typecheck → test:run → build` exactly as the `ci.yml` workflow
does. Use this before pushing if you want fast feedback without
spending Actions minutes.
