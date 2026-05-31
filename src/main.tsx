import {StrictMode} from 'react';
import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {reportWebVitals} from './utils/webVitals';
import {initTelemetry, addBreadcrumb} from './lib/telemetry';
import {hasConsent} from './lib/telemetryConsent';
import {initAnalytics, track} from './lib/analytics';

// ─── Restore persisted accessibility preferences ─────────────────
// Applied as `<html data-*>` attributes BEFORE React mounts so the
// global CSS in `index.css` styles the very first paint correctly —
// avoids a flash of wrong-contrast or wrong-font content.
try {
  const motion = localStorage.getItem('brawl_reduce_motion');
  if (motion === 'always') document.documentElement.dataset.reduceMotion = 'true';
  const contrast = localStorage.getItem('brawl_high_contrast');
  if (contrast === 'more') document.documentElement.dataset.contrast = 'more';
  const font = localStorage.getItem('brawl_font_mode');
  if (font === 'dyslexic') document.documentElement.dataset.fontMode = 'dyslexic';
} catch {
  /* private mode — fall back to system defaults */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// ─── Dev-only axe-core auditor ───────────────────────────────────
// Streams accessibility violations to the browser console while the
// app runs. Production builds skip this entirely (the import is
// gated on `import.meta.env.DEV`, and Vite tree-shakes the branch).
if (import.meta.env.DEV) {
  void import('@axe-core/react').then(({default: axe}) => {
    // 1000 ms debounce keeps the console quiet during rapid renders.
    axe(React, ReactDOM, 1000);
  });
}

// ─── Telemetry bootstrap ─────────────────────────────────────────
// Sentry is loaded lazily and ONLY when the user has explicitly
// granted consent (and a DSN is configured). Fire-and-forget — the
// app works perfectly fine while the SDK chunk is still loading.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn && hasConsent()) {
  void initTelemetry({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  });
}

// ─── Analytics bootstrap ─────────────────────────────────────────
// `initAnalytics` is safe to call unconditionally: when consent is
// missing or denied, it leaves the noop adapter in place. When
// consent flips on later (Settings → Privacy), the facade hot-swaps
// the adapter without a reload.
const analyticsBackend = import.meta.env.VITE_ANALYTICS_BACKEND as
  | 'plausible'
  | 'umami'
  | 'posthog'
  | undefined;
void initAnalytics({
  backend: analyticsBackend,
  traits: {
    locale: typeof navigator !== 'undefined' ? navigator.language : undefined,
    is_pwa:
      typeof window !== 'undefined' &&
      window.matchMedia?.('(display-mode: standalone)').matches,
  },
});

// PWA install events surface on `window`, not React state — track
// them here so the listener stays alive for the whole session.
if (typeof window !== 'undefined') {
  window.addEventListener('appinstalled', () => {
    track({
      name: 'pwa_install',
      properties: {
        platform: getInstallPlatform(),
      },
    });
  });
}

function getInstallPlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/macintosh/i.test(ua)) return 'macos';
  if (/windows/i.test(ua)) return 'windows';
  return 'other';
}

// ─── Web Vitals → console (dev) + Sentry breadcrumbs (prod) ─────
// Sentry's browserTracingIntegration auto-captures CWV as part of
// its pageload transaction, so we just need to keep the observer
// alive in production. In dev we log to console for quick lookup.
if (import.meta.env.DEV) {
  reportWebVitals((metric) => {
    // eslint-disable-next-line no-console
    console.info(
      `[web-vitals] ${metric.name} = ${metric.value.toFixed(2)} (${metric.rating})`,
    );
    addBreadcrumb({
      category: 'web-vitals',
      level: metric.rating === 'poor' ? 'warning' : 'info',
      message: `${metric.name} ${metric.value.toFixed(2)} (${metric.rating})`,
      data: { name: metric.name, value: metric.value, rating: metric.rating },
    });
  });
} else {
  reportWebVitals((metric) => {
    // Forwarded to Sentry as a breadcrumb so they show up alongside
    // the user's actions in any error event. The dedicated CWV
    // metrics ride on the pageload transaction directly.
    addBreadcrumb({
      category: 'web-vitals',
      level: metric.rating === 'poor' ? 'warning' : 'info',
      message: `${metric.name} ${metric.value.toFixed(2)} (${metric.rating})`,
      data: { name: metric.name, value: metric.value, rating: metric.rating },
    });
  });
}
