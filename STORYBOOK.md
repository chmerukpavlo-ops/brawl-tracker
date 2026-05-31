# Storybook

This repo ships a [Storybook 10](https://storybook.js.org/) (React +
Vite builder) instance for visual documentation, design-token
preview, and isolated component development.

> Sister docs: [`ACCESSIBILITY.md`](./ACCESSIBILITY.md),
> [`PRIVACY.md`](./PRIVACY.md), [`ANALYTICS.md`](./ANALYTICS.md).

## Quick start

```bash
npm install
npm run storybook          # http://localhost:6006
npm run build-storybook    # → storybook-static/
```

The first `dev` start takes ~10 s (Vite is fast, but `react-docgen-typescript`
parses every component for prop docs). Subsequent reloads are instant.

## What's wired today

| Concern                  | Status | Where                                         |
| ------------------------ | ------ | --------------------------------------------- |
| Storybook 10 + Vite      | ✅      | `.storybook/main.ts`                          |
| Provider decorators      | ✅      | `.storybook/preview.tsx` — I18n, QueryClient, Toast |
| Theme toolbar            | ✅      | `default` / `high-contrast` via `withThemeByDataAttribute` |
| Locale toolbar           | ✅      | UA / EN, persists via `localStorage`          |
| Viewport toolbar         | ✅      | iPhone SE / 13 / Pixel / iPad / Desktop       |
| Backgrounds toolbar      | ✅      | App violet, midnight, white                   |
| `addon-docs` MDX pages   | ✅      | `src/docs/Introduction.mdx`                   |
| `addon-a11y` (axe)       | ✅      | runs on every story render                    |
| Design tokens stories    | ✅      | `src/design-tokens/{Colors,Typography,Spacing}.stories.tsx` |
| Primitive stories        | ✅      | `Skeleton`, `EmptyState`, `RarityBadge`       |
| Feature story            | ✅      | `BrawlerCard`                                 |
| Brawler fixtures         | ✅      | `src/test/fixtures/brawler.ts`                |
| GitHub Pages deploy      | ✅      | `.github/workflows/storybook-deploy.yml`      |

## Roadmap

| Concern                                    | Pri | Notes                                  |
| ------------------------------------------ | --- | -------------------------------------- |
| Stories for `BottomSheet`, `Toast`, `ContextMenu` | M   | The interactive trio — needs portal + open-state controls. |
| Stories for `BrawlerAvatar`, `OptimizedImage`     | M   | Quick wins; mostly visual.             |
| Stories for `BattleListItem`, `LeaderboardRow`    | M   | Need extra fixture variants (victory/defeat/draw). |
| Stories for `TrophyChart`, `DonutChart`           | M   | Stress-test with big / flat / empty datasets. |
| Stories for AI flows (`CoachPanel`, etc.)         | L   | Mock the streaming generator via MSW. |
| `msw-storybook-addon` for API-driven stories      | M   | Re-uses the existing `src/test/msw/handlers.ts`. |
| `@storybook/addon-vitest` test runner             | L   | Run play functions in CI.              |
| Chromatic visual regression                       | L   | Public token in repo secrets.          |
| `composeStories` integration with `vitest`        | L   | One source of truth for UI states.     |

## How to write a story

```tsx
// src/components/MyThing.stories.tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import MyThing from "./MyThing";

const meta: Meta<typeof MyThing> = {
  title: "UI Primitives/MyThing",   // groups in sidebar
  component: MyThing,
  tags: ["autodocs"],                // generates a Docs page
  args: {
    onClick: fn(),                   // spy that shows in Actions panel
  },
  parameters: {
    layout: "centered",              // "fullscreen" | "padded" | "centered"
  },
};
export default meta;
type Story = StoryObj<typeof MyThing>;

export const Default: Story = {};
export const Loading: Story = { args: { loading: true } };
```

### Naming conventions

| Sidebar path            | Use for                                    |
| ----------------------- | ------------------------------------------ |
| `Docs/*`                | MDX guides (`Introduction.mdx`, etc.).     |
| `Design Tokens/*`       | Colors, typography, spacing visualisations. |
| `UI Primitives/*`       | Self-contained reusable atoms (Skeleton, Badge). |
| `Features/*`            | Composed feature components (BrawlerCard, BattleList). |
| `Screens/*`             | Whole-screen flows (later).                |

### Fixtures

Re-use `src/test/fixtures/*` — the same data drives Vitest suites and
stories. When a component needs new shapes, add a typed fixture
factory there before writing the story; that way both layers see
the same defaults.

```tsx
import { mockBrawler, BRAWLER_FIXTURES } from "../../test/fixtures/brawler";

export const Custom: Story = {
  args: { brawler: mockBrawler({ name: "Custom", rarity: BRAWLER_RARITIES.epic }) },
};
```

### Decorators

Provider wrapping is already handled globally in
`.storybook/preview.tsx`:

- `QueryClientProvider` — fresh client per story (`gcTime: 0`,
  `staleTime: 0`).
- `I18nProvider` — synced to the toolbar locale via a `LocaleSync`
  bridge.
- `ToastProvider` — so any component that calls `useToast` mounts.

If a story needs `PlayerProvider`, write a one-off decorator inside
the story file rather than polluting `preview.tsx`. Example pattern:

```tsx
const withPlayer: Decorator = (Story) => (
  <PlayerContext.Provider value={mockPlayerContext()}>
    <Story />
  </PlayerContext.Provider>
);

export const Pinned: Story = { decorators: [withPlayer], ... };
```

### Accessibility

`addon-a11y` is wired with `manual: false`, so axe runs on every
story render. The "Accessibility" panel highlights violations the
moment they appear. Fix them before merging — that's the whole
point of the addon.

If a violation is truly false-positive (e.g. you're showcasing a
deliberately broken state for documentation), disable the rule
per-story:

```tsx
parameters: {
  a11y: {
    config: { rules: [{ id: "color-contrast", enabled: false }] },
  },
},
```

## CI / deploy

`.github/workflows/storybook-deploy.yml` runs on every push to
`main`:

1. `npm ci`
2. `npm run build-storybook`
3. Uploads `storybook-static/` as a Pages artifact
4. Deploys to GitHub Pages — `https://<org>.github.io/brawl-stars-tracker/`

Preview the build locally with:

```bash
npm run build-storybook
npx http-server storybook-static -p 6007
```

## Production bundle isolation

`*.stories.tsx` files are picked up only by the Storybook builder.
Vite's production build (`npm run build`) doesn't import any of
them — they're not referenced from `src/main.tsx` or any route, so
tree-shaking removes them entirely. Same applies to fixtures
(imported by stories) — production builds drop them too. No bundle
overhead for end users.

## Troubleshooting

**`react-docgen-typescript` slow on first start**
Expected — it parses every prop interface. Keep the dev server
running; HMR is instant.

**Theme toolbar doesn't change anything**
The `high-contrast` swap relies on `<html data-contrast="more">`.
Stories that hard-code `bg-[#2a1a4a]` etc. ignore the data attribute
because Tailwind 4 inlines arbitrary values. Use `theme("colors.foo")`
or rely on `--color-fg-strong` defined under `[data-contrast="more"]`
in `index.css` for swatches you want to be theme-aware.

**Story renders blank / errors about missing context**
Most likely you imported a component that calls `usePlayer()` (or
similar). Wrap with a custom decorator (see *Decorators* above) or
extract a presentational sub-component without the context call.
