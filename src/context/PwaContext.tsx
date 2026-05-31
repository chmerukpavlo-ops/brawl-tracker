import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { usePWA, type UsePwaApi } from "../hooks/usePWA";
import { trackAchievementEvent } from "../hooks/useAchievements";
import { useToast } from "./ToastContext";
import { useTranslation } from "../hooks/useTranslation";
import { haptic } from "../hooks/useHaptic";

const PwaContext = createContext<UsePwaApi | null>(null);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const pwa = usePWA();
  const { showInfo } = useToast();
  const { t } = useTranslation();
  const wasOnlineRef = useRef<boolean>(pwa.isOnline);
  const wasInstalledRef = useRef<boolean>(pwa.isInstalled);
  const trackedOfflineRef = useRef<boolean>(false);

  // Reconnection toast — fire only on transitions, not on first mount.
  useEffect(() => {
    if (wasOnlineRef.current === pwa.isOnline) return;
    if (!wasOnlineRef.current && pwa.isOnline) {
      showInfo(t("pwa.toast.online"));
      haptic.light();
    }
    wasOnlineRef.current = pwa.isOnline;
  }, [pwa.isOnline, showInfo, t]);

  // Track that user actually entered offline mode (achievement feed).
  useEffect(() => {
    if (!pwa.isOnline && !trackedOfflineRef.current) {
      trackedOfflineRef.current = true;
      trackAchievementEvent("pwa_offline_used");
    }
  }, [pwa.isOnline]);

  // Install transition — toast + haptic + achievement.
  useEffect(() => {
    if (wasInstalledRef.current === pwa.isInstalled) return;
    if (!wasInstalledRef.current && pwa.isInstalled) {
      showInfo(t("pwa.toast.installed"));
      haptic.success();
      trackAchievementEvent("pwa_installed");
    }
    wasInstalledRef.current = pwa.isInstalled;
  }, [pwa.isInstalled, showInfo, t]);

  const value = useMemo<UsePwaApi>(() => pwa, [pwa]);

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): UsePwaApi {
  const ctx = useContext(PwaContext);
  if (!ctx) {
    throw new Error("usePwa must be used within <PwaProvider>");
  }
  return ctx;
}
