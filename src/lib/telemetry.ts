/**
 * Privacy-first telemetry wrapper.
 *
 * - Loads `@sentry/react` lazily via dynamic import → no bundle cost
 *   when the user opts out or no DSN is configured.
 * - Every public method is a no-op until {@link initTelemetry} has
 *   succeeded; safe to call from anywhere at any time.
 * - All payloads pass through `scrubPII` before they leave the
 *   browser — player tags, emails, anything that looks like PII is
 *   redacted defensively.
 *
 * Layout:
 *   getConsent() === "granted" + DSN set  →  init()  →  events flow
 *   anything else                          →  silent no-op
 *
 * Tests assert the no-op invariant in `telemetry.test.ts`.
 */

import { hasConsent } from "./telemetryConsent";
import { getOrCreateAnonId } from "./anonId";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SentryNS = any;

interface CaptureContext {
  tags?: Record<string, string | boolean | number>;
  extra?: Record<string, unknown>;
  level?: "fatal" | "error" | "warning" | "info" | "debug";
  /**
   * Optional stable fingerprint to control issue grouping. Pass an
   * array like `["api", "player-fetch", "404"]`.
   */
  fingerprint?: string[];
}

interface InitOptions {
  dsn: string;
  environment?: string;
  release?: string;
  /** 0–1.0; default 0.1 in prod, 1.0 in dev. */
  tracesSampleRate?: number;
}

let sentry: SentryNS | null = null;
let loadPromise: Promise<SentryNS | null> | null = null;
let initialized = false;

/**
 * Returns true once the SDK has been loaded AND `init()` succeeded.
 * Anything else is treated as "telemetry disabled".
 */
export function isInitialized(): boolean {
  return initialized;
}

/**
 * Loads `@sentry/react` lazily. Returns `null` if loading fails for
 * any reason (offline, blocked by ad-block, etc.) — callers MUST be
 * resilient to that.
 */
async function loadSentry(): Promise<SentryNS | null> {
  if (sentry) return sentry;
  if (!loadPromise) {
    loadPromise = import("@sentry/react")
      .then((mod) => {
        sentry = mod;
        return mod;
      })
      .catch(() => null);
  }
  return loadPromise;
}

/**
 * Boots the SDK if (and only if) consent is granted and a DSN is
 * configured. Idempotent and never throws.
 */
export async function initTelemetry(opts: InitOptions): Promise<void> {
  if (initialized) return;
  if (!opts.dsn) return;
  if (!hasConsent()) return;

  const Sentry = await loadSentry();
  if (!Sentry) return;

  try {
    Sentry.init({
      dsn: opts.dsn,
      environment: opts.environment ?? "production",
      release: opts.release || undefined,
      // browserTracingIntegration auto-records pageloads + Web Vitals
      // and attaches a transaction to outbound fetch/XHR. We rely on
      // the default integrations + add nothing else to keep the
      // chunk small (replay/profiling stay tree-shaken away).
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: opts.tracesSampleRate ?? 0.1,
      // Trace context is only attached to our own API; we never
      // propagate to brawlstars.com (their CORS rejects it anyway).
      tracePropagationTargets: [/^\/api\//],
      sendDefaultPii: false,
      ignoreErrors: [
        // Benign browser noise.
        "ResizeObserver loop limit exceeded",
        "ResizeObserver loop completed with undelivered notifications",
        "Non-Error promise rejection captured",
        // User-cancelled streams (AI coach abort, lazy chunk reload).
        /^AbortError/,
        "ChunkLoadError",
        // PWA offline path — we surface our own toast.
        "Network request failed",
        "Failed to fetch dynamically imported module",
      ],
      denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-extension:\/\//],
      beforeSend: scrubEvent,
      beforeBreadcrumb: scrubBreadcrumb,
    });

    Sentry.setUser({ id: getOrCreateAnonId() });
    initialized = true;
  } catch (err) {
    // Never let telemetry init crash the app.
    console.warn("[telemetry] init failed:", err);
  }
}

/**
 * Stops the SDK and discards any in-flight events. Used when the
 * user revokes consent in Settings.
 */
export async function shutdownTelemetry(): Promise<void> {
  if (!initialized || !sentry) return;
  try {
    await sentry.close(2_000);
  } finally {
    initialized = false;
  }
}

// ─── Public capture API ───────────────────────────────────────────

export function captureException(error: unknown, context?: CaptureContext): void {
  if (!initialized || !sentry) return;
  try {
    sentry.captureException(error, context);
  } catch {
    /* never throw from telemetry */
  }
}

export function captureMessage(
  message: string,
  context?: CaptureContext
): void {
  if (!initialized || !sentry) return;
  try {
    sentry.captureMessage(message, context);
  } catch {
    /* never throw from telemetry */
  }
}

export function addBreadcrumb(crumb: {
  category: string;
  message?: string;
  data?: Record<string, unknown>;
  level?: "fatal" | "error" | "warning" | "info" | "debug";
}): void {
  if (!initialized || !sentry) return;
  try {
    sentry.addBreadcrumb(crumb);
  } catch {
    /* */
  }
}

export function setTag(key: string, value: string | number | boolean): void {
  if (!initialized || !sentry) return;
  try {
    sentry.setTag(key, value);
  } catch {
    /* */
  }
}

/**
 * Open a span around an async operation. Returns a no-op pass-through
 * when the SDK isn't loaded, so call sites stay clean.
 */
export async function startSpan<T>(
  spec: { name: string; op: string; attributes?: Record<string, unknown> },
  fn: () => Promise<T>
): Promise<T> {
  if (!initialized || !sentry?.startSpan) return fn();
  try {
    return await sentry.startSpan(spec, () => fn());
  } catch (err) {
    // Sentry's startSpan re-throws — let it bubble after recording.
    throw err;
  }
}

// ─── PII scrubbing (also exported for unit tests) ─────────────────

// Brawl Stars tags use a restricted alphabet (no `1`, `3`, `4`, `5`,
// `6`, `7`, and letters like `A`, `B`, `D`, `E`, etc. are absent —
// only `0289PYLQGRJCUVO` are used). Matching the alphabet alone hits
// far too many English words, so we always require an explicit
// `#` / `%23` / `tag=` prefix to anchor the match.
const TAG_IN_URL_RE = /(?<=%23|#|tag=)[0289PYLQGRJCUVO]{4,12}\b/gi;
const HASH_TAG_RE = /#[0289PYLQGRJCUVO]{4,12}\b/gi;
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

/**
 * Replace anything that looks like a player tag, club tag, or email
 * inside a free-form string. Conservative — false positives just
 * mean we redact a coincidental code, never the other way around.
 */
export function scrubText(input: string): string {
  return input
    .replace(EMAIL_RE, "[email]")
    .replace(HASH_TAG_RE, "#PLAYER_TAG")
    .replace(TAG_IN_URL_RE, "PLAYER_TAG");
}

/**
 * Top-level Sentry `beforeSend` hook. Mutates the event in place and
 * returns it (or `null` to drop). Exported so it can be unit-tested
 * without spinning up Sentry.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scrubEvent(event: any): any {
  if (!event || typeof event !== "object") return event;

  if (typeof event.message === "string") {
    event.message = scrubText(event.message);
  }

  if (event.request?.url && typeof event.request.url === "string") {
    event.request.url = scrubText(event.request.url);
  }
  if (event.request?.headers) delete event.request.headers; // may carry auth cookies
  if (event.request?.cookies) delete event.request.cookies;

  if (event.exception?.values && Array.isArray(event.exception.values)) {
    for (const ex of event.exception.values) {
      if (typeof ex.value === "string") ex.value = scrubText(ex.value);
    }
  }

  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb).filter(Boolean);
  }

  return event;
}

/**
 * Top-level `beforeBreadcrumb` hook — strips PII from
 * fetch/xhr/navigation crumbs.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scrubBreadcrumb(crumb: any): any {
  if (!crumb || typeof crumb !== "object") return crumb;

  if (crumb.data?.url && typeof crumb.data.url === "string") {
    crumb.data.url = scrubText(crumb.data.url);
  }
  if (crumb.data?.to && typeof crumb.data.to === "string") {
    crumb.data.to = scrubText(crumb.data.to);
  }
  if (typeof crumb.message === "string") {
    crumb.message = scrubText(crumb.message);
  }

  return crumb;
}
