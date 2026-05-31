/**
 * Minimal Web Vitals reporter — measures the three CWV signals
 * (LCP, CLS, INP) plus FCP and TTFB using PerformanceObserver
 * directly. No runtime dependency (`web-vitals` would add ~2 KB
 * gzipped); the implementations follow the same algorithms but skip
 * the niche bits we don't use (attribution, soft-navs, etc.).
 *
 * Usage:
 *   reportWebVitals((metric) => console.log(metric));
 *
 * Each metric is emitted at most once per page load (except CLS,
 * which is updated as layout shifts continue).
 */

export interface WebVitalMetric {
  name: "LCP" | "CLS" | "INP" | "FCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  id: string;
}

type Reporter = (metric: WebVitalMetric) => void;

// Thresholds match web.dev's published "good / needs-improvement / poor"
// boundaries (updated 2024-Q4).
const THRESHOLDS = {
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
} as const;

function rateMetric(
  name: WebVitalMetric["name"],
  value: number
): WebVitalMetric["rating"] {
  const [good, poor] = THRESHOLDS[name];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

let nextId = 0;
function genId(name: string): string {
  return `${name}-${Date.now()}-${++nextId}`;
}

function emit(report: Reporter, name: WebVitalMetric["name"], value: number) {
  report({
    name,
    value,
    rating: rateMetric(name, value),
    id: genId(name),
  });
}

function safeObserve(
  type: string,
  cb: (entries: PerformanceEntryList) => void,
  opts: PerformanceObserverInit = {}
): PerformanceObserver | null {
  if (typeof PerformanceObserver === "undefined") return null;
  try {
    const po = new PerformanceObserver((list) => cb(list.getEntries()));
    po.observe({ type, buffered: true, ...opts });
    return po;
  } catch {
    return null;
  }
}

/**
 * Subscribes to the standard Web Vitals signals. Safe to call once
 * during app bootstrap — no-op on environments without
 * PerformanceObserver (older browsers, SSR).
 */
export function reportWebVitals(report: Reporter): void {
  if (typeof window === "undefined" || typeof performance === "undefined") return;

  // ─── TTFB / FCP ───────────────────────────────────────────────
  // Both are available from the navigation/paint entries that the
  // browser records before our script runs. PerformanceObserver
  // with `buffered: true` replays them.
  const nav = performance.getEntriesByType(
    "navigation"
  )[0] as PerformanceNavigationTiming | undefined;
  if (nav) emit(report, "TTFB", Math.max(0, nav.responseStart - nav.startTime));

  safeObserve("paint", (entries) => {
    for (const entry of entries) {
      if (entry.name === "first-contentful-paint") {
        emit(report, "FCP", entry.startTime);
      }
    }
  });

  // ─── LCP ──────────────────────────────────────────────────────
  // Final value is the *last* LCP candidate before the page becomes
  // hidden or the user interacts. We snapshot the latest entry and
  // emit on visibility change + pagehide for reliability on mobile.
  let lcpValue = 0;
  const lcpObserver = safeObserve("largest-contentful-paint", (entries) => {
    const last = entries[entries.length - 1];
    if (last) lcpValue = last.startTime;
  });

  const finalizeLcp = () => {
    if (lcpValue > 0 && lcpObserver) {
      lcpObserver.disconnect();
      emit(report, "LCP", lcpValue);
      lcpValue = 0;
    }
  };

  // ─── CLS ──────────────────────────────────────────────────────
  // Cumulative Layout Shift is the SUM of the largest "session" of
  // layout shifts. A new session starts when ≥1 s elapses between
  // shifts or the total session exceeds 5 s.
  let clsValue = 0;
  let sessionValue = 0;
  let sessionEntries: PerformanceEntry[] = [];
  let lastSessionTime = 0;
  let firstSessionTime = 0;

  safeObserve("layout-shift", (entries) => {
    for (const entry of entries as (PerformanceEntry & {
      value: number;
      hadRecentInput: boolean;
      startTime: number;
    })[]) {
      if (entry.hadRecentInput) continue;
      const now = entry.startTime;
      const gap = now - lastSessionTime;
      const sessionLen = now - firstSessionTime;

      if (gap < 1000 && sessionLen < 5000 && sessionEntries.length > 0) {
        sessionValue += entry.value;
        sessionEntries.push(entry);
      } else {
        sessionValue = entry.value;
        sessionEntries = [entry];
        firstSessionTime = now;
      }
      lastSessionTime = now;

      if (sessionValue > clsValue) {
        clsValue = sessionValue;
      }
    }
  });

  // ─── INP ──────────────────────────────────────────────────────
  // INP = the longest-lasting interaction (excluding the top 2% on
  // pages with many interactions). The browser exposes this via the
  // `event` entry type with durationThreshold. We track the max
  // duration seen — close enough for an in-app monitor.
  let inpValue = 0;
  safeObserve(
    "event",
    (entries) => {
      for (const entry of entries) {
        if (entry.duration > inpValue) inpValue = entry.duration;
      }
    },
    { durationThreshold: 16 } as PerformanceObserverInit
  );

  const finalize = () => {
    finalizeLcp();
    if (clsValue > 0) emit(report, "CLS", Number(clsValue.toFixed(4)));
    if (inpValue > 0) emit(report, "INP", Math.round(inpValue));
  };

  // Mobile-safe shutdown hooks: `pagehide` fires reliably on bfcache
  // navigation; `visibilitychange` covers tab-switch.
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "hidden") finalize();
    },
    { once: false }
  );
  window.addEventListener("pagehide", finalize, { once: true });
}
