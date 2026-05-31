import { useCallback, useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

/**
 * The native event the browser fires before showing its install banner.
 * We hold onto it so the user can trigger the prompt at a moment of our
 * choosing (e.g. from a friendly in-app banner).
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_DISMISSED_KEY = "brawl_pwa_install_dismissed";
const UPDATE_DISMISSED_KEY = "brawl_pwa_update_dismissed";
const INSTALL_AT_KEY = "brawl_pwa_installed_at";
const INSTALL_COOLDOWN_DAYS = 14;
const UPDATE_COOLDOWN_HOURS = 24;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function") {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: window-controls-overlay)").matches) return true;
  }
  // iOS Safari uses a non-standard property.
  return Boolean(
    (navigator as Navigator & { standalone?: boolean }).standalone
  );
}

function isIosLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function readDismissed(key: string): number {
  try {
    return Number(localStorage.getItem(key) ?? 0);
  } catch {
    return 0;
  }
}

function writeDismissed(key: string): void {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export interface UsePwaApi {
  isSupported: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  /** True for browsers without `beforeinstallprompt` (i.e. iOS Safari). */
  needsManualInstall: boolean;
  isOnline: boolean;
  /** New SW build is waiting to take over. */
  needRefresh: boolean;
  /** App shell is fully precached and offline-ready. */
  offlineReady: boolean;
  /** When the user installed the app (ms since epoch), if known. */
  installedAt: number | null;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  dismissInstallPrompt: () => void;
  /** Returns true when the install prompt should be surfaced now. */
  shouldShowInstallPrompt: () => boolean;
  applyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
  shouldShowUpdatePrompt: () => boolean;
  checkForUpdate: () => Promise<void>;
  /** Best-effort cache size estimate (bytes). Returns null if unavailable. */
  estimateStorage: () => Promise<{ usage: number; quota: number } | null>;
  clearCaches: () => Promise<void>;
}

export function usePWA(): UsePwaApi {
  const [isSupported] = useState<boolean>(
    () => typeof navigator !== "undefined" && "serviceWorker" in navigator
  );
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandalone());
  const [installedAt, setInstalledAt] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(INSTALL_AT_KEY);
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  });
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateSwRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  // Register SW + wire update/offline-ready callbacks once per mount.
  useEffect(() => {
    if (!isSupported) return;
    if (typeof window === "undefined") return;

    const updateSW = registerSW({
      immediate: false,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onRegisteredSW(_swUrl, registration) {
        // Re-check for updates every hour if the tab stays alive.
        if (!registration) return;
        const interval = window.setInterval(() => {
          registration.update().catch(() => {
            /* network errors are fine — try later */
          });
        }, 60 * 60 * 1000);
        return () => window.clearInterval(interval);
      },
      onRegisterError() {
        // Plugin already logs in dev; nothing else to do.
      },
    });
    updateSwRef.current = updateSW;

    return () => {
      updateSwRef.current = null;
    };
  }, [isSupported]);

  // beforeinstallprompt / appinstalled lifecycle.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      const now = Date.now();
      setIsInstalled(true);
      setDeferred(null);
      setInstalledAt(now);
      try {
        localStorage.setItem(INSTALL_AT_KEY, String(now));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Online/offline status.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Refresh standalone state when display-mode changes (some browsers fire it).
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mq = window.matchMedia("(display-mode: standalone)");
    const handler = () => setIsInstalled(isStandalone());
    if ("addEventListener" in mq) mq.addEventListener("change", handler);
    return () => {
      if ("removeEventListener" in mq) mq.removeEventListener("change", handler);
    };
  }, []);

  const promptInstall = useCallback<UsePwaApi["promptInstall"]>(async () => {
    if (!deferred) return "unavailable";
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "dismissed") {
        writeDismissed(INSTALL_DISMISSED_KEY);
      }
      return choice.outcome;
    } catch {
      return "unavailable";
    }
  }, [deferred]);

  const dismissInstallPrompt = useCallback(() => {
    writeDismissed(INSTALL_DISMISSED_KEY);
    setDeferred((cur) => cur);
  }, []);

  const shouldShowInstallPrompt = useCallback(() => {
    if (isInstalled) return false;
    if (!deferred && !isIosLike()) return false;
    const last = readDismissed(INSTALL_DISMISSED_KEY);
    if (last > 0) {
      const days = (Date.now() - last) / (24 * 60 * 60 * 1000);
      if (days < INSTALL_COOLDOWN_DAYS) return false;
    }
    return true;
  }, [deferred, isInstalled]);

  const applyUpdate = useCallback(async () => {
    const updateSW = updateSwRef.current;
    if (!updateSW) {
      window.location.reload();
      return;
    }
    try {
      await updateSW(true);
    } catch {
      window.location.reload();
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    writeDismissed(UPDATE_DISMISSED_KEY);
    setNeedRefresh(false);
  }, []);

  const shouldShowUpdatePrompt = useCallback(() => {
    if (!needRefresh) return false;
    const last = readDismissed(UPDATE_DISMISSED_KEY);
    if (last > 0) {
      const hours = (Date.now() - last) / (60 * 60 * 1000);
      if (hours < UPDATE_COOLDOWN_HOURS) return false;
    }
    return true;
  }, [needRefresh]);

  const checkForUpdate = useCallback(async () => {
    if (!isSupported) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
    } catch {
      /* network failure is fine */
    }
  }, [isSupported]);

  const estimateStorage = useCallback<UsePwaApi["estimateStorage"]>(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.storage ||
      !navigator.storage.estimate
    ) {
      return null;
    }
    try {
      const est = await navigator.storage.estimate();
      return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
    } catch {
      return null;
    }
  }, []);

  const clearCaches = useCallback<UsePwaApi["clearCaches"]>(async () => {
    if (typeof caches === "undefined") return;
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
  }, []);

  return {
    isSupported,
    isInstallable: !!deferred,
    isInstalled,
    needsManualInstall: !deferred && !isInstalled && isIosLike(),
    isOnline,
    needRefresh,
    offlineReady,
    installedAt,
    promptInstall,
    dismissInstallPrompt,
    shouldShowInstallPrompt,
    applyUpdate,
    dismissUpdate,
    shouldShowUpdatePrompt,
    checkForUpdate,
    estimateStorage,
    clearCaches,
  };
}
