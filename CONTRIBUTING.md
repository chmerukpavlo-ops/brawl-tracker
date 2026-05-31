# Contributing to Brawl Stars Tracker

Thanks for taking the time to contribute! This guide covers everything
you need to make a successful PR — from local setup to commit
conventions that drive the automated release pipeline.

## Table of contents

- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [Development loop](#development-loop)
- [Testing](#testing)
- [Code style](#code-style)
- [Commit conventions](#commit-conventions)
- [Pull request flow](#pull-request-flow)
- [Optional: install local git hooks](#optional-install-local-git-hooks)

## Quick start

```bash
# Node 20+ (we test against 20 and 22 in CI). Use nvm:
nvm use   # picks up .nvmrc when available, otherwise:
nvm install 20

git clone https://github.com/your-org/brawl-stars-tracker.git
cd brawl-stars-tracker
npm ci

# Optional — only needed if you want real Brawl Stars data:
cp .env.example .env
# Then edit .env with your tokens. The app falls back to demo data
# automatically if BRAWL_STARS_API_TOKEN is missing.

npm run dev   # http://localhost:5173
```

The dev server is the same `tsx server.ts` process that runs in
production, with Vite middleware-mode for the SPA. There's no separate
"frontend dev server" — everything ships from the proxy.

## Project structure

```
src/
  components/        — UI building blocks
    encyclopedia/    — Brawlify-backed Brawler / mode / map browser
    ai/              — Gemini AI coach widgets
    ...
  context/           — React contexts (Player, Pwa, I18n, Toast)
  hooks/             — Custom hooks (incl. queries/ for React Query)
  i18n/locales/      — Ukrainian + English translations
  lib/               — Cross-cutting utilities (api, queryClient, telemetry)
  navigation/        — Tab bar, swipe screens, URL state
  screens/           — Top-level screens (lazy-loaded except Home)
  test/              — Vitest setup, MSW handlers, test fixtures
  utils/             — Pure helpers (battle parsing, search index, …)

server.ts            — Express proxy + dev Vite middleware
e2e/                 — Playwright tests
```

## Development loop

| Command                   | What it does                                       |
| ------------------------- | -------------------------------------------------- |
| `npm run dev`             | Start the dev server with HMR                      |
| `npm run typecheck`       | `tsc --noEmit`                                     |
| `npm run test`            | Vitest in watch mode                               |
| `npm run test:run`        | Vitest, single run                                 |
| `npm run test:coverage`   | Same + coverage HTML report under `coverage/`      |
| `npm run test:e2e`        | Playwright (auto-starts the dev server)            |
| `npm run test:e2e:ui`     | Playwright UI mode (debugger)                      |
| `npm run build`           | Production build (frontend + bundled `server.cjs`) |
| `npm run analyze`         | Build + open the bundle visualizer                 |
| `npm run audit`           | Local Lighthouse audit (desktop preset)            |
| `npm run ci:local`        | Full CI dry-run (typecheck → test → build)         |

Running `npm run ci:local` before pushing catches almost every CI
failure locally — it executes the same commands the `CI` workflow
does.

## Testing

We split tests into three layers:

1. **Unit / integration** — `src/**/*.test.{ts,tsx}` via Vitest +
   `@testing-library/react` + MSW. These run on every PR (`ci.yml`).
2. **End-to-end** — `e2e/*.spec.ts` via Playwright. These run on
   every PR (`e2e.yml`).
3. **Smoke** — runs after a production deploy hits the live URLs.

When you add a new utility module, add a `*.test.ts` next to it. When
you add a new screen, an e2e test that simply opens it is usually
enough — UX assertions belong in unit tests.

See [`TESTING.md`](./TESTING.md) for the deeper test-strategy guide.

## Code style

- TypeScript strict mode is on. No `any` unless interfacing with a
  third-party API that has no types — and even then, narrow it ASAP.
- React function components only. No class components except
  `<ErrorBoundary>` (because React still requires a class for the
  `componentDidCatch` API).
- Tailwind 4 utility-first styling. Custom CSS lives in `src/index.css`
  only when a utility chain becomes unreadable.
- Comments explain **why**, not **what**. Avoid `// increment counter`.
- Prefer `motion/react` for animation, never raw CSS keyframes for
  interactive UI (a11y reasons — we hook into `prefers-reduced-motion`).
- All user-visible strings go through `t('key')` — never inline.
- Tests use **explicit** imports (`import { describe, it, expect } from "vitest"`)
  rather than `globals: true`.

## Commit conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/)
because semantic-release uses commit messages to compute the next
version number. Format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type       | When                                       | Release impact         |
| ---------- | ------------------------------------------ | ---------------------- |
| `feat`     | New user-facing functionality              | **minor** version bump |
| `fix`      | Bug fix                                    | **patch** version bump |
| `perf`     | Performance improvement                    | **patch**              |
| `refactor` | Internal cleanup, no behaviour change      | **patch**              |
| `docs`     | Documentation only                         | none                   |
| `test`     | Test changes only                          | none                   |
| `ci`       | CI / pipeline changes                      | none                   |
| `build`    | Build tooling                              | none                   |
| `chore`    | Routine maintenance, repo hygiene          | none                   |
| `deps`     | Dependency updates (Dependabot uses this)  | **patch** if prod dep  |

### Breaking changes

Append `!` to the type *or* add a `BREAKING CHANGE:` footer:

```
feat(api)!: rename `getPlayer` → `fetchPlayer`

BREAKING CHANGE: callers of `api.getPlayer` must rename to
`api.fetchPlayer`. The shape of the response is unchanged.
```

This triggers a **major** version bump.

### Examples

```
feat(encyclopedia): add brawler stats sheet
fix(player): handle empty battle log without crashing
perf(stats): memoize chart data computation
docs: explain how to run e2e tests offline
chore(deps): bump @sentry/react to 10.55.0
```

### Local validation (optional)

```bash
echo "feat: my message" | npx --yes commitlint
```

If you want this enforced on every commit, see the next section.

## Pull request flow

1. **Branch** off `main` (or `develop` for prerelease work):
   `git switch -c feat/encyclopedia-search`.
2. **Code + test**. Run `npm run ci:local` until green.
3. **Commit** with a Conventional Commits message.
4. **Push** and open a PR. The PR template will guide you through the
   checklist.
5. **CI runs**: lint, unit, build, e2e, security, preview deploy.
   Wait for the green "CI" status check.
6. **Review**. CODEOWNERS-listed reviewers are auto-requested.
7. **Merge** with squash + rebase (linear history is enforced).

## Optional: install local git hooks

We don't auto-install [husky](https://typicode.github.io/husky/)
because it modifies your git config — but if you want commit messages
linted before they hit CI, run:

```bash
npm install --save-dev --no-save husky @commitlint/cli @commitlint/config-conventional
npx husky init
echo 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg
echo 'npm run ci:local' > .husky/pre-push
chmod +x .husky/commit-msg .husky/pre-push
```

That gives you:

- `commit-msg` hook: blocks commits with a non-Conventional message.
- `pre-push` hook: blocks pushes that wouldn't pass CI.

Skip the hook for a one-off:

```bash
git commit --no-verify -m "wip"
```

## Reporting bugs / requesting features

Use the issue templates under
[**Issues → New issue**](https://github.com/your-org/brawl-stars-tracker/issues/new/choose).
Security issues go through
[GitHub Security Advisories](https://github.com/your-org/brawl-stars-tracker/security/advisories/new),
**not** public issues.

Thanks again — happy hacking! ⭐
