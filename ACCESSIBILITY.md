# Accessibility

This app targets **WCAG 2.2 Level AA** as the floor and Level AAA where
it's cheap to reach. The document below explains how the framework is
wired, what's already covered, what's still pending, and how to test
your own changes.

> Sister documents: [`PRIVACY.md`](./PRIVACY.md) — opt-in telemetry &
> analytics. [`ANALYTICS.md`](./ANALYTICS.md) — event taxonomy.

## Quick map

```
src/
├── utils/
│   └── a11y.ts                ← srOnly class, announce(), useA11yId
├── hooks/
│   ├── useReducedMotion.ts    ← system + user override (data attribute)
│   ├── useHighContrast.ts     ← system + user override (data attribute)
│   ├── useArrowNavigation.ts  ← keyboard for tab/list/grid widgets
│   ├── useFocusReturn.ts      ← restore focus after modal close
│   └── usePrefersReducedMotion.ts (raw OS-level signal)
├── components/
│   ├── a11y/
│   │   ├── LiveRegions.tsx    ← polite + assertive ARIA live regions
│   │   ├── SkipLink.tsx       ← keyboard "skip to main content"
│   │   └── FocusTrap.tsx      ← wrapper around focus-trap-react
│   └── settings/
│       └── AccessibilitySection.tsx
└── index.css                  ← :focus-visible, prefers-reduced-motion
                                  override, [data-contrast="more"]
                                  palette tokens, [data-font-mode]
                                  swap.
```

## What's wired today

| Concern                    | Status | How / where                                 |
| -------------------------- | ------ | ------------------------------------------- |
| `:focus-visible` outline   | ✅      | Global rule in `index.css` — yellow 2 px    |
| Skip-to-content link       | ✅      | `<SkipLink />` in `App.tsx`, target `#main-content` |
| ARIA live regions          | ✅      | `<LiveRegions />` mounted in `App.tsx`      |
| `announce()` API           | ✅      | `src/utils/a11y.ts`                         |
| Bottom nav as tablist      | ✅      | `BottomTabBar.tsx` — arrow keys, Home/End, `tabindex` rovers |
| Tab panels                 | ✅      | `SwipeableScreens.tsx` — `role="tabpanel"`, `aria-labelledby` |
| Focus trap in dialogs      | ✅      | `BottomSheet.tsx` via `<FocusTrap />`       |
| Focus return after dialog  | ✅      | `useFocusReturn` in `BottomSheet.tsx`       |
| Reduced-motion (system)    | ✅      | OS `prefers-reduced-motion` honored everywhere `motion/react` is used |
| Reduced-motion (override)  | ✅      | Settings → Accessibility, persists to `brawl_reduce_motion` |
| High contrast (system)     | ✅      | OS `prefers-contrast: more` triggers fatter rings |
| High contrast (override)   | ✅      | Settings → Accessibility, persists to `brawl_high_contrast` |
| Dyslexia-friendly font     | ✅      | Settings → Accessibility, swaps font stack via `[data-font-mode]` |
| Viewport allows pinch zoom | ✅      | `index.html` has no `user-scalable=no`      |
| `<html lang>` per locale   | ✅      | `I18nContext` toggles between `uk` and `en` |
| `axe-core` in dev          | ✅      | `src/main.tsx` lazy-loads `@axe-core/react` |
| `vitest-axe` matcher       | ✅      | `src/test/setup.ts`                         |
| Smoke a11y suite           | ✅      | `src/test/a11y.test.tsx`                    |

## What's still on the roadmap

| Concern                          | Pri | Notes                                       |
| -------------------------------- | --- | ------------------------------------------- |
| `eslint-plugin-jsx-a11y`         | M   | Project doesn't have an `eslint.config.*` yet (the `lint` script aliases `tsc`). Adding ESLint is its own scope; tracked separately. |
| Per-screen `<h1>` consistency    | M   | Most screens have an `<h1>`; HomeScreen and a couple of overlay views still use `<p className="font-black">`. |
| Form error association           | M   | `PlayerSearch` etc. use inline error text without `aria-describedby` |
| `<table>` for leaderboards       | M   | Leaderboards currently use flex/grid; a `role="table"` upgrade is queued |
| Charts: table alternative        | L   | Trophy chart has `aria-label` summary; a "show as table" toggle is a nice-to-have |
| Voice commands (STT)             | L   | Web Speech API integration; pairs with TTS already shipped |
| WCAG AAA pass                    | L   | After AA stabilises                         |
| ARIA Authoring Practices audit   | L   | Manual walkthrough of every composite widget |
| Public `accessibility.html`      | L   | Statement page; this `.md` is the working draft |

## How to write accessible components

### Buttons vs. links

- **Action that doesn't change URL** → `<button type="button">`.
- **Action that navigates anywhere** → `<a href>`. Even SPA links to
  another tab — drop a hash or route on it so the URL bar reflects
  the destination. The router already supports tab-state hashing.
- **Never** `<div onClick>`. The screen reader doesn't announce it
  as interactive and the keyboard can't reach it.

### Touch target size

Minimum **44 × 44 CSS px** for any tappable surface (icons, chips,
list rows). Our utility class `touchTarget` in `src/utils/a11y.ts`
adds an invisible `::before` to bring icon-only buttons up to the
floor without changing the visible artwork.

### ARIA labels for icon-only controls

```tsx
<button type="button" aria-label={t("share.copyLink")}>
  <Copy className="h-4 w-4" aria-hidden="true" />
</button>
```

Two non-obvious points:
- `aria-hidden` on the SVG itself, not on the parent button.
- The label text comes from the i18n catalogue — never hard-code
  English strings; the locale matters for screen-reader pronunciation.

### Modals and sheets

Use `<BottomSheet>` whenever possible. It already wires:
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (the
  title element).
- Focus trap via `<FocusTrap>`.
- Focus return via `useFocusReturn`.
- ESC key dismissal.
- Body scroll lock.

If you need a custom dialog, copy the same scaffold.

### Live announcements

```ts
import { announce } from "../utils/a11y";

announce(t("search.foundResultsCount", { count: 12 }));
```

- `priority: "polite"` for confirmations, status updates.
- `priority: "assertive"` only for failures the user must fix
  (broken connection, save error). Overuse is hostile.

### Reduced motion

```tsx
import { useReducedMotion } from "../hooks/useReducedMotion";

function MyComponent() {
  const { reduce } = useReducedMotion();
  return (
    <motion.div
      animate={{ x: 100 }}
      transition={reduce ? { duration: 0 } : { type: "spring" }}
    />
  );
}
```

### Color is never the only signal

Status (success / warn / error) must always carry **icon + text**, not
just colour:

```tsx
{result === "victory" ? (
  <span className="text-emerald-400">
    <Check aria-hidden="true" /> {t("battle.victory")}
  </span>
) : (
  <span className="text-rose-400">
    <X aria-hidden="true" /> {t("battle.defeat")}
  </span>
)}
```

Trophy delta: prefix with `+`/`−` so colour-blind users get the sign.

## Testing

### Automated

`npm run test:run` includes:
- **`src/test/a11y.test.tsx`** — smoke axe audit of shared primitives
  (LiveRegions, SkipLink). Add new component-level audits here.
- **`@axe-core/react`** in dev — open the browser console while
  running `npm run dev`; violations stream in real time.

### Manual screen reader walkthrough

| Platform | Reader      | Toggle                                        |
| -------- | ----------- | --------------------------------------------- |
| macOS    | VoiceOver   | Cmd + F5                                      |
| iOS      | VoiceOver   | Settings → Accessibility → VoiceOver          |
| Android  | TalkBack    | Settings → Accessibility → TalkBack           |
| Windows  | NVDA (free) | https://www.nvaccess.org/download/            |
| ChromeOS | ChromeVox   | Settings → Accessibility → ChromeVox          |

Walkthrough checklist (per major flow):

- [ ] All controls reach via Tab.
- [ ] Focus is always visible.
- [ ] Reader announces meaningful labels (no "button button button").
- [ ] Live updates (search, AI streaming) are announced.
- [ ] ESC dismisses modals and returns focus.
- [ ] Arrow keys navigate the bottom tab bar; Home / End jump.
- [ ] Reduce-motion override actually stills the app.
- [ ] High-contrast override visibly bumps the focus rings.

### Lighthouse target

`npm run audit` (after `npm run build && npm run start`) opens a full
Lighthouse report. The Accessibility score target is **≥ 95**.

### Color contrast

Use Chrome DevTools → Inspect element → `Accessibility` pane → the
contrast ratio is shown next to the colour swatch. Target ratios:

| Content                   | AA      | AAA     |
| ------------------------- | ------- | ------- |
| Body text                 | 4.5 : 1 | 7 : 1   |
| Large text (18 pt+ bold)  | 3 : 1   | 4.5 : 1 |
| UI / focus indicators     | 3 : 1   | n/a     |

### Color-blindness simulation

Chrome DevTools → ⋮ → "More tools" → Rendering → "Emulate vision
deficiencies". Run through Deuteranopia, Protanopia, Tritanopia.
Anything that depends only on hue should fail visibly — fix the
component before merging.

## Reporting accessibility issues

Open a GitHub issue with the `a11y` label. Include:

- Steps to reproduce, including which screen reader / browser.
- Expected vs. actual behaviour.
- A short screen recording or transcript of what the SR said.

Critical issues (full keyboard lock-out, undismissable dialog, content
hidden from SR) jump the queue.
