# Brawl Stats Tracker

[![CI](https://github.com/your-org/brawl-stars-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/brawl-stars-tracker/actions/workflows/ci.yml)
[![E2E](https://github.com/your-org/brawl-stars-tracker/actions/workflows/e2e.yml/badge.svg)](https://github.com/your-org/brawl-stars-tracker/actions/workflows/e2e.yml)
[![Security](https://github.com/your-org/brawl-stars-tracker/actions/workflows/security.yml/badge.svg)](https://github.com/your-org/brawl-stars-tracker/actions/workflows/security.yml)
[![codecov](https://codecov.io/gh/your-org/brawl-stars-tracker/graph/badge.svg)](https://codecov.io/gh/your-org/brawl-stars-tracker)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Mobile-first PWA для відстеження статистики Brawl Stars з AI-аналізом,
лідербордами, закріпленими гравцями та офлайн-режимом.

> 💡 [`CONTRIBUTING.md`](./CONTRIBUTING.md) — як розробляти локально та
> писати коміти.
> 🚀 [`DEPLOYMENT.md`](./DEPLOYMENT.md) — як виглядає CI/CD пайплайн і
> як rollback'ати.
> 📈 [`ANALYTICS.md`](./ANALYTICS.md) — privacy-first product analytics
> (event taxonomy, backend swap, self-host рецепти).
> 🔒 [`PRIVACY.md`](./PRIVACY.md) — що збирається, що ні, як вимкнути.
> ♿ [`ACCESSIBILITY.md`](./ACCESSIBILITY.md) — WCAG 2.2 AA: keyboard,
> screen readers, motion / contrast / font preferences.
> 📚 [`STORYBOOK.md`](./STORYBOOK.md) — UI Kit на Storybook 10:
> design tokens, primitives, фічі, GitHub Pages деплой.

## Стек

- **React 19 + Vite 6** — клієнт
- **Tailwind v4** — стилі
- **Express** — проксі для Brawl Stars API + Gemini AI
- **vite-plugin-pwa + workbox-window** — Service Worker, манифест,
  offline runtime caching

## Швидкий старт

```bash
npm install
npm run dev      # localhost:3000 (Express + Vite middleware)
```

PWA вимкнено в dev (`devOptions.enabled: false` у `vite.config.ts`), щоб
не заважати hot-reload. Для тесту PWA-флоу:

```bash
npm run build
npm run start    # node dist/server.cjs — production режим з SW
```

## PWA

### Що увімкнено

- **Web App Manifest** (`public/manifest.webmanifest`) — генерується
  vite-plugin-pwa з конфіга у `vite.config.ts`. Містить:
  - `name`, `short_name`, `description`, `id`, `start_url`, `scope`
  - `display: standalone`, `orientation: portrait`
  - `background_color` + `theme_color` (`#1a0a2e`) збігаються з
    `<meta name="theme-color">` у `index.html`
  - PNG- та SVG-іконки (any + maskable)
  - 3 `shortcuts` (Профіль, Лідерборд, AI Coach) для long-press на
    встановленій іконці у Android
  - `share_target` — застосунок з'являється у системному share-меню;
    тег гравця автоматично витягується з тексту посилання
- **Service Worker** (`dist/sw.js`) — генерується Workbox у production:
  - precache всього app shell (HTML, CSS, JS, шрифти, іконки)
  - runtime cache:
    - `CacheFirst` — Google Fonts, CDN-зображення бійців (Brawlify)
    - `NetworkFirst` — `/api/v1/player`, `/api/v1/club` (5–10 хв TTL)
    - `StaleWhileRevalidate` — `/api/v1/leaderboards`
    - `NetworkOnly` — `/api/gemini` (стрімінг не кешується)
  - `navigateFallback: /index.html` (SPA-режим), окрім `/api/*`
- **Install prompt** (`InstallPrompt.tsx`) — кастомний банер з'являється
  після ≥3 сесій АБО ≥1 закріпленого гравця АБО 90 секунд активності.
  Cooldown після відмови — 14 днів.
- **Update prompt** (`UpdatePrompt.tsx`) — top-banner коли нова версія
  готова. Cooldown після "Пізніше" — 24 години.
- **Offline indicator** (`OfflineIndicator.tsx`) — тонкий бар угорі,
  з'являється коли `navigator.onLine === false`.
- **iOS instructions** (`IosInstallInstructions.tsx`) — нижня шторка з
  трьома кроками для Safari (Share → Add to Home Screen). Доступна
  з Settings → Застосунок → "Інструкція для iOS".
- **Settings → Застосунок** (`PwaSettingsSection.tsx`) — статус
  установки, версія, перевірка оновлень, розмір кеша, кнопка очищення
  кеша.

### Іконки

`public/icons/` містить **placeholder** PNG-файли, згенеровані
автоматично з `public/favicon.svg`:

| Файл                              | Розмір  | Призначення                |
| --------------------------------- | ------- | -------------------------- |
| `icon-192.png`                    | 192×192 | стандартна іконка          |
| `icon-512.png`                    | 512×512 | splash + adaptive          |
| `icon-maskable-192.png`           | 192×192 | maskable з ~20% padding    |
| `icon-maskable-512.png`           | 512×512 | maskable з ~20% padding    |
| `apple-touch-icon.png`            | 180×180 | iOS home screen (opaque)   |

Файли регенеруються через:

```bash
npm run icons     # ручний запуск
npm run build     # автоматично перед vite build (prebuild hook)
```

Скрипт `scripts/generate-icons.mjs` працює без зовнішніх залежностей
(чистий Node + `zlib`) і **пропускає файли, які вже існують**. Коли
дизайнер віддасть готові PNG-и — просто покладіть їх у `public/icons/`
і generator більше нічого не перезапише.

Детальні інструкції для дизайнера: [`public/icons/README.md`](public/icons/README.md).

### Тестування PWA локально

```bash
npm run build && npm run start
# відкрийте http://localhost:3000 у Chrome
```

1. **DevTools → Application → Manifest** — перевірте всі поля.
2. **DevTools → Application → Service Workers** — `sw.js` має бути
   `activated and is running`.
3. **DevTools → Application → Cache Storage** — мають з'явитися
   `workbox-precache-*` + runtime caches після кількох запитів.
4. **Install** — у URL-барі з'явиться іконка `+` / Install. Натисніть.
5. **Offline mode** — DevTools → Network → Offline. App має далі
   працювати з кешу; `OfflineIndicator` має з'явитися.
6. **Update flow** — змініть будь-який файл, `npm run build`,
   рефрешніть вкладку — має з'явитися `UpdatePrompt`.

### Lighthouse

```bash
npm run build && npm run start
# у Chrome: DevTools → Lighthouse → PWA → Analyze page
```

Очікуваний результат: **PWA score ≥ 90**. Якщо менше — найчастіші
причини:
- Apple touch icon відсутній (перевірте `public/icons/apple-touch-icon.png`).
- HTTP замість HTTPS у проді (SW не реєструється на HTTP, крім localhost).
- `start_url` не закешований (зазвичай це баг конфігурації scope).

### iOS особливості

- iOS Safari **не показує `beforeinstallprompt`** — тільки через
  Share → Add to Home Screen.
- iOS 16.4+ підтримує **сповіщення тільки в installed PWA**, не в Safari.
- `apple-mobile-web-app-status-bar-style: black-translucent` робить
  статус-бар прозорим. Layout уже використовує `env(safe-area-inset-*)`.
- Splash screens для кожного device size — окрема серія (не обов'язково
  для Lighthouse 90+, але корисно). Згенерувати через
  [`pwa-asset-generator`](https://github.com/elegantapp/pwa-asset-generator).

### Edge cases

- **HTTP / приватний IP** → SW не реєструється, prompt не показується.
  Усе працює як звичайний веб-сайт.
- **Storage quota exceeded** → старі кеші чистяться через `expiration:
  maxEntries` правила Workbox.
- **User clear browser data** → застосунок стартує "як з нуля";
  pinned/notifications/achievements у localStorage очищаються разом.
- **In-app browsers** (Telegram, Instagram WebView) — манифест
  ігнорується, install prompt не з'являється. Користувача нічого не
  тригерить.

## Скрипти

| Команда           | Що робить                                              |
| ----------------- | ------------------------------------------------------ |
| `npm run dev`     | Express + Vite middleware на `localhost:3000`          |
| `npm run lint`    | `tsc --noEmit`                                         |
| `npm run icons`   | Генерує placeholder PNG-іконки                         |
| `npm run build`   | `vite build` (з prebuild icons) + bundle серверa       |
| `npm run start`   | Запуск production сервера (`dist/server.cjs`)          |
| `npm run clean`   | Видалити `dist/`                                       |
