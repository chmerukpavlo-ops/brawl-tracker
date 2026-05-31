import { useCallback, useEffect, useState } from "react";
import type { NotificationPayload } from "../utils/notificationPresets";

/**
 * Per-type opt-in flags. Defaults are conservative: everything _on_ once the
 * user has explicitly granted browser permission. Master `enabled` allows a
 * single switch to silence all delivery without revoking the OS permission.
 */
export interface NotificationSettings {
  enabled: boolean;
  types: {
    streakReminder: boolean;
    goalProgress: boolean;
    favoritesUpdate: boolean;
    weeklyDigest: boolean;
    achievements: boolean;
  };
  /** Inclusive-start, exclusive-end window in `HH:MM` 24h. */
  quietHours: {
    enabled: boolean;
    from: string;
    to: string;
    /** Streak reminders bypass quiet hours when true (default false). */
    allowStreakReminder: boolean;
  };
}

const SETTINGS_KEY = "brawl_notification_settings";
const PROMPTED_AT_KEY = "brawl_notification_prompted_at";
const DISMISSED_KEY = "brawl_notification_dismissed";
const STATE_KEY = "brawl_notifications_state";
const SUPPRESSION_DAYS = 7;
const RATE_LIMIT_PER_HOUR = 5;

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  types: {
    streakReminder: true,
    goalProgress: true,
    favoritesUpdate: true,
    weeklyDigest: false,
    achievements: true,
  },
  quietHours: {
    enabled: false,
    from: "22:00",
    to: "08:00",
    allowStreakReminder: true,
  },
};

interface DeliveryStateRecord {
  recentDeliveries: number[]; // Unix ms timestamps within last hour
  lastStreakNotification?: number;
  notifiedGoals?: Record<string, number>;
  notifiedRecords?: Record<string, { trophies: number; at: number }>;
}

const DEFAULT_STATE: DeliveryStateRecord = {
  recentDeliveries: [],
  notifiedGoals: {},
  notifiedRecords: {},
};

function readSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      enabled: parsed.enabled ?? DEFAULT_SETTINGS.enabled,
      types: {
        ...DEFAULT_SETTINGS.types,
        ...(parsed.types ?? {}),
      },
      quietHours: {
        ...DEFAULT_SETTINGS.quietHours,
        ...(parsed.quietHours ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(s: NotificationSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
}

function readState(): DeliveryStateRecord {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as DeliveryStateRecord) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writeState(s: DeliveryStateRecord): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function parseHHMM(value: string): { h: number; m: number } | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

/**
 * Returns minutes-since-midnight from a `Date`, used for quiet-hour math.
 */
function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * True when `now` falls inside `[from, to)`. Handles wrap-around windows
 * (e.g. 22:00 → 08:00) by treating them as a union of two intervals.
 */
export function isInQuietHours(
  settings: NotificationSettings,
  now: Date = new Date()
): boolean {
  if (!settings.quietHours.enabled) return false;
  const from = parseHHMM(settings.quietHours.from);
  const to = parseHHMM(settings.quietHours.to);
  if (!from || !to) return false;
  const nowM = minutesOfDay(now);
  const fromM = from.h * 60 + from.m;
  const toM = to.h * 60 + to.m;
  if (fromM === toM) return false;
  if (fromM < toM) return nowM >= fromM && nowM < toM;
  return nowM >= fromM || nowM < toM;
}

/**
 * Returns the timestamp at which the next quiet window ends. Used for
 * deferring scheduled notifications.
 */
export function quietHoursEndsAt(
  settings: NotificationSettings,
  now: Date = new Date()
): number {
  const to = parseHHMM(settings.quietHours.to);
  if (!to) return now.getTime();
  const next = new Date(now);
  next.setHours(to.h, to.m, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

function nowSupportsNotifications(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window && typeof window.Notification === "function";
}

function getCurrentPermission(): NotificationPermission {
  if (!nowSupportsNotifications()) return "denied";
  return window.Notification.permission;
}

/**
 * Apple Safari / iOS Safari only deliver Notification API events when the
 * page is launched as an installed PWA. We surface this so the UI can show a
 * "Install as PWA" hint instead of silently failing.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const navStandalone =
    typeof navigator !== "undefined" &&
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  const matchMedia =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return navStandalone || matchMedia;
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

interface ScheduleHandle {
  id: string;
  timeout: ReturnType<typeof setTimeout>;
}

const scheduledTimers = new Map<string, ScheduleHandle>();

function generateScheduleId(): string {
  return `sched_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function pruneRecentDeliveries(state: DeliveryStateRecord, now: number): void {
  const HOUR = 60 * 60 * 1000;
  state.recentDeliveries = state.recentDeliveries.filter((t) => now - t < HOUR);
}

function cleanupOldRecords(state: DeliveryStateRecord, now: number): void {
  const TTL = 30 * 24 * 60 * 60 * 1000;
  if (state.notifiedRecords) {
    for (const [k, v] of Object.entries(state.notifiedRecords)) {
      if (now - v.at > TTL) delete state.notifiedRecords[k];
    }
  }
  if (state.notifiedGoals) {
    for (const [k, v] of Object.entries(state.notifiedGoals)) {
      if (now - v > TTL) delete state.notifiedGoals[k];
    }
  }
}

function deliverNow(
  payload: NotificationPayload,
  settings: NotificationSettings
): Notification | null {
  if (!nowSupportsNotifications()) return null;
  if (!settings.enabled) return null;
  if (payload.type !== "test" && !settings.types[payload.type as keyof NotificationSettings["types"]]) {
    return null;
  }
  if (window.Notification.permission !== "granted") return null;

  const inQuiet =
    payload.type !== "test" &&
    isInQuietHours(settings) &&
    !payload.bypassQuietHours &&
    !(payload.type === "streakReminder" && settings.quietHours.allowStreakReminder);
  if (inQuiet) return null;

  const state = readState();
  const now = Date.now();
  pruneRecentDeliveries(state, now);
  if (state.recentDeliveries.length >= RATE_LIMIT_PER_HOUR) return null;

  try {
    const n = new window.Notification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction,
      data: payload.data,
    });
    state.recentDeliveries.push(now);
    cleanupOldRecords(state, now);
    writeState(state);

    n.onclick = () => {
      try {
        window.focus();
      } catch {
        /* noop */
      }
      const url = (payload.data?.url as string | undefined) ?? null;
      if (url) {
        try {
          const target = new URL(url, window.location.origin);
          if (target.origin === window.location.origin) {
            window.history.pushState({}, "", `${target.pathname}${target.search}${target.hash}`);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
        } catch {
          /* invalid url, ignore */
        }
      }
      n.close();
    };
    return n;
  } catch {
    return null;
  }
}

export interface UseNotificationsApi {
  permission: NotificationPermission;
  isSupported: boolean;
  isStandalone: boolean;
  isIos: boolean;
  settings: NotificationSettings;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (payload: NotificationPayload) => Notification | null;
  scheduleLocal: (payload: NotificationPayload, delayMs: number) => string | null;
  scheduleAt: (payload: NotificationPayload, timestampMs: number) => string | null;
  cancelScheduled: (id: string) => void;
  updateSettings: (patch: Partial<NotificationSettings>) => void;
  updateTypeSetting: (
    type: keyof NotificationSettings["types"],
    enabled: boolean
  ) => void;
  shouldPromptUser: () => boolean;
  recordPromptShown: () => void;
  recordPromptDismissed: () => void;
  /** Tracks "already-notified" sentinels per scope (goals, records). */
  hasNotifiedGoal: (goalId: string) => boolean;
  markGoalNotified: (goalId: string) => void;
  hasNotifiedRecord: (tag: string, trophies: number) => boolean;
  markRecordNotified: (tag: string, trophies: number) => void;
}

export function useNotifications(): UseNotificationsApi {
  const isSupported = nowSupportsNotifications();
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    getCurrentPermission()
  );
  const [settings, setSettings] = useState<NotificationSettings>(() =>
    readSettings()
  );

  // Refresh state when the tab regains focus (user might have toggled it
  // from the browser settings page in the meantime).
  useEffect(() => {
    if (!isSupported) return;
    const refresh = () => setPermission(getCurrentPermission());
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [isSupported]);

  // Also rely on the Permissions API when available — it fires on revoke.
  useEffect(() => {
    if (!isSupported) return;
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let ignored = false;
    navigator.permissions
      .query({ name: "notifications" as PermissionName })
      .then((status) => {
        if (ignored) return;
        const handler = () =>
          setPermission(status.state as NotificationPermission);
        status.addEventListener?.("change", handler);
        // initial sync
        setPermission(status.state as NotificationPermission);
        return () => status.removeEventListener?.("change", handler);
      })
      .catch(() => {
        /* not all browsers list "notifications" — fail silently */
      });
    return () => {
      ignored = true;
    };
  }, [isSupported]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return "denied" as NotificationPermission;
    const result = await window.Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  const showNotification = useCallback(
    (payload: NotificationPayload) => deliverNow(payload, settings),
    [settings]
  );

  const scheduleAt = useCallback(
    (payload: NotificationPayload, timestampMs: number) => {
      if (!isSupported) return null;
      const now = Date.now();
      const delay = Math.max(0, timestampMs - now);
      return scheduleInternal(payload, delay, settings);
    },
    [isSupported, settings]
  );

  const scheduleLocal = useCallback(
    (payload: NotificationPayload, delayMs: number) => {
      if (!isSupported) return null;
      return scheduleInternal(payload, delayMs, settings);
    },
    [isSupported, settings]
  );

  const cancelScheduled = useCallback((id: string) => {
    const handle = scheduledTimers.get(id);
    if (handle) {
      clearTimeout(handle.timeout);
      scheduledTimers.delete(id);
    }
  }, []);

  const updateSettings = useCallback((patch: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const next: NotificationSettings = {
        ...prev,
        ...patch,
        types: { ...prev.types, ...(patch.types ?? {}) },
        quietHours: { ...prev.quietHours, ...(patch.quietHours ?? {}) },
      };
      writeSettings(next);
      return next;
    });
  }, []);

  const updateTypeSetting = useCallback(
    (type: keyof NotificationSettings["types"], enabled: boolean) => {
      updateSettings({ types: { [type]: enabled } as NotificationSettings["types"] });
    },
    [updateSettings]
  );

  const shouldPromptUser = useCallback(() => {
    if (!isSupported) return false;
    if (permission !== "default") return false;
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
      if (dismissedAt > 0) {
        const days = (Date.now() - dismissedAt) / (24 * 60 * 60 * 1000);
        if (days < SUPPRESSION_DAYS) return false;
      }
    } catch {
      /* ignore */
    }
    return true;
  }, [isSupported, permission]);

  const recordPromptShown = useCallback(() => {
    try {
      localStorage.setItem(PROMPTED_AT_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, []);

  const recordPromptDismissed = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, []);

  const hasNotifiedGoal = useCallback((goalId: string) => {
    const state = readState();
    return Boolean(state.notifiedGoals?.[goalId]);
  }, []);

  const markGoalNotified = useCallback((goalId: string) => {
    const state = readState();
    state.notifiedGoals = { ...(state.notifiedGoals ?? {}), [goalId]: Date.now() };
    cleanupOldRecords(state, Date.now());
    writeState(state);
  }, []);

  const hasNotifiedRecord = useCallback((tag: string, trophies: number) => {
    const state = readState();
    const rec = state.notifiedRecords?.[tag];
    return Boolean(rec && rec.trophies >= trophies);
  }, []);

  const markRecordNotified = useCallback((tag: string, trophies: number) => {
    const state = readState();
    state.notifiedRecords = {
      ...(state.notifiedRecords ?? {}),
      [tag]: { trophies, at: Date.now() },
    };
    cleanupOldRecords(state, Date.now());
    writeState(state);
  }, []);

  return {
    permission,
    isSupported,
    isStandalone: isStandalonePwa(),
    isIos: isIosSafari(),
    settings,
    requestPermission,
    showNotification,
    scheduleLocal,
    scheduleAt,
    cancelScheduled,
    updateSettings,
    updateTypeSetting,
    shouldPromptUser,
    recordPromptShown,
    recordPromptDismissed,
    hasNotifiedGoal,
    markGoalNotified,
    hasNotifiedRecord,
    markRecordNotified,
  };
}

function scheduleInternal(
  payload: NotificationPayload,
  delayMs: number,
  settings: NotificationSettings
): string {
  let effectiveDelay = Math.max(0, delayMs);
  // Defer past quiet hours unless the payload explicitly bypasses them.
  if (
    !payload.bypassQuietHours &&
    !(payload.type === "streakReminder" && settings.quietHours.allowStreakReminder)
  ) {
    const targetAt = Date.now() + effectiveDelay;
    if (isInQuietHours(settings, new Date(targetAt))) {
      effectiveDelay = quietHoursEndsAt(settings, new Date(targetAt)) - Date.now();
    }
  }

  const id = generateScheduleId();
  const timeout = setTimeout(() => {
    scheduledTimers.delete(id);
    deliverNow(payload, readSettings());
  }, effectiveDelay);
  scheduledTimers.set(id, { id, timeout });
  return id;
}

export const NOTIFICATION_KEYS = {
  SETTINGS_KEY,
  PROMPTED_AT_KEY,
  DISMISSED_KEY,
  STATE_KEY,
} as const;
