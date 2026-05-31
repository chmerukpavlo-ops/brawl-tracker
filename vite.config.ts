/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {readFileSync} from 'fs';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
import {visualizer} from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';

const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')
) as {version?: string};
const APP_VERSION = pkg.version || '0.0.0';

export default defineConfig(({mode}) => {
  const isProd = mode === 'production';
  const enableVisualizer = process.env.ANALYZE === 'true';

  return {
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
    },
    // Drop console / debugger in production. esbuild is the default
    // minifier (faster, no extra dep), and supports `drop` natively
    // from esbuild ≥0.18.
    esbuild: isProd
      ? {drop: ['console', 'debugger']}
      : undefined,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        strategies: 'generateSW',
        includeAssets: [
          'favicon.svg',
          'icon.svg',
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/icon-maskable-192.png',
          'icons/icon-maskable-512.png',
          'icons/apple-touch-icon.png',
        ],
        manifest: {
          name: 'Brawl Stats Tracker',
          short_name: 'Brawl Stats',
          description: 'Відстежуй статистику Brawl Stars з AI-аналізом',
          id: '/?utm_source=pwa',
          start_url: '/?utm_source=pwa',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#1a0a2e',
          theme_color: '#1a0a2e',
          lang: 'uk',
          categories: ['games', 'utilities', 'entertainment'],
          icons: [
            {src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any'},
            {src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
            {src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
            {src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable'},
            {src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable'},
          ],
          shortcuts: [
            {
              name: 'Мій профіль',
              short_name: 'Профіль',
              url: '/?tab=home&utm_source=pwa-shortcut',
              icons: [{src: '/icons/icon-192.png', sizes: '192x192'}],
            },
            {
              name: 'Лідерборд',
              short_name: 'Топ',
              url: '/?tab=leaders&utm_source=pwa-shortcut',
              icons: [{src: '/icons/icon-192.png', sizes: '192x192'}],
            },
            {
              name: 'AI Coach',
              short_name: 'Coach',
              url: '/?tab=stats&coach=open&utm_source=pwa-shortcut',
              icons: [{src: '/icons/icon-192.png', sizes: '192x192'}],
            },
          ],
          share_target: {
            action: '/',
            method: 'GET',
            params: {
              title: 'title',
              text: 'text',
              url: 'url',
            },
          },
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          // Server bundle ships alongside the client; never precache it.
          globIgnores: ['**/server.cjs', '**/server.cjs.map', '**/sw.js', '**/workbox-*.js'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: {maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            {
              urlPattern: ({url}) => url.pathname.startsWith('/api/v1/player'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'player-api',
                networkTimeoutSeconds: 5,
                expiration: {maxEntries: 50, maxAgeSeconds: 60 * 5},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            {
              urlPattern: ({url}) => url.pathname.startsWith('/api/v1/leaderboards'),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'leaderboards-api',
                expiration: {maxEntries: 20, maxAgeSeconds: 60 * 5},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            {
              urlPattern: ({url}) => url.pathname.startsWith('/api/v1/club'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'club-api',
                networkTimeoutSeconds: 5,
                expiration: {maxEntries: 30, maxAgeSeconds: 60 * 10},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
            // AI streaming responses MUST NOT be cached (chunked SSE breaks).
            {
              urlPattern: ({url}) => url.pathname.startsWith('/api/gemini'),
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/cdn\.brawlify\.com\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'brawler-images',
                expiration: {maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30},
                cacheableResponse: {statuses: [0, 200]},
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
      // Brotli (.br) + Gzip (.gz) precompressed assets — node/express
      // serves them transparently when `Accept-Encoding` matches.
      // Skipped for HTML so the SW navigateFallback still works.
      isProd &&
        compression({
          algorithm: 'brotliCompress',
          ext: '.br',
          threshold: 1024,
          filter: /\.(js|css|svg|json|webmanifest)$/i,
        }),
      isProd &&
        compression({
          algorithm: 'gzip',
          ext: '.gz',
          threshold: 1024,
          filter: /\.(js|css|svg|json|webmanifest)$/i,
        }),
      // `ANALYZE=true npm run build` opens a treemap of the bundle.
      enableVisualizer &&
        visualizer({
          filename: 'dist/stats.html',
          gzipSize: true,
          brotliSize: true,
          template: 'treemap',
        }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // ES2020 covers iOS 14+ and Android Chrome 80+ — well above our
      // baseline. Skipping legacy syntax shaves a few KB per chunk.
      target: 'es2020',
      cssCodeSplit: true,
      // Hash filenames are content-addressed → safe to cache for a year.
      chunkSizeWarningLimit: 600,
      reportCompressedSize: false,
      sourcemap: false,
      rollupOptions: {
        output: {
          // Stable vendor splits so users only re-download what changed.
          // Order matters: more specific entries win first.
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              // Each non-noop analytics adapter is its own chunk so it
              // only ships when consent + backend are configured. The
              // facade dynamically `import()`s these on demand.
              if (id.includes('/src/lib/analytics/plausible'))
                return 'analytics-plausible';
              if (id.includes('/src/lib/analytics/umami'))
                return 'analytics-umami';
              if (id.includes('/src/lib/analytics/posthog'))
                return 'analytics-posthog';
              return undefined;
            }
            // Sentry MUST stay outside any manualChunk so the dynamic
            // `import("@sentry/react")` in src/lib/telemetry.ts splits
            // into its own lazy chunk. Bundling it into `vendor` would
            // ship the whole SDK (~70 KB gzipped) to every visitor —
            // exactly the opposite of what we want.
            if (id.includes('@sentry')) return undefined;
            if (id.includes('react-dom')) return 'vendor-react';
            if (id.includes('/react/') || id.includes('scheduler'))
              return 'vendor-react';
            if (id.includes('@tanstack')) return 'vendor-query';
            if (id.includes('/motion/') || id.includes('framer-motion'))
              return 'vendor-motion';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('workbox')) return 'vendor-workbox';
            return 'vendor';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      environment: 'happy-dom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.{test,spec}.{ts,tsx}',
          'src/test/**',
          'src/main.tsx',
          'src/**/*.d.ts',
          'src/**/types.ts',
          'src/**/types/**',
        ],
        thresholds: {
          // Global gates are intentionally low at MVP — the suite
          // covers a small slice of the codebase. They catch
          // regressions from "we wrote a test once" → "we deleted
          // it". Raise these in increments as broader coverage lands.
          statements: 5,
          branches: 3,
          functions: 3,
          lines: 5,
          // Per-file gates protect the fully-covered areas: any
          // deletion of an existing test will fail the build.
          'src/utils/backup/crypto.ts': { statements: 95, functions: 100, branches: 80, lines: 95 },
          'src/utils/backup/storage.ts': { statements: 85, functions: 90, branches: 60, lines: 90 },
          'src/utils/backup/exporter.ts': { statements: 50, functions: 70, branches: 60, lines: 55 },
          'src/utils/backup/importer.ts': { statements: 70, functions: 70, branches: 70, lines: 70 },
          'src/utils/backup/migrations.ts': { statements: 70, functions: 100, branches: 70, lines: 70 },
          'src/utils/battleHelpers.ts': { statements: 55, functions: 50, branches: 40, lines: 60 },
          'src/hooks/useMountOnce.ts': { statements: 90, functions: 90, branches: 80, lines: 90 },
        },
      },
    },
  };
});
