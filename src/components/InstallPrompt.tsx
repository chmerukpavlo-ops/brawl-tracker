import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Smartphone, Wifi, Bell, Zap, X } from "lucide-react";
import { usePwa } from "../context/PwaContext";
import { usePlayer } from "../context/PlayerContext";
import { useTranslation } from "../hooks/useTranslation";
import { haptic } from "../hooks/useHaptic";
import { useToast } from "../context/ToastContext";

const SESSION_COUNT_KEY = "brawl_pwa_session_count";
const MIN_SESSIONS_BEFORE_PROMPT = 3;
const MIN_PINNED_BEFORE_PROMPT = 1;
const MIN_DWELL_MS = 90 * 1000;

function bumpSessionCount(): number {
  try {
    const next = Number(localStorage.getItem(SESSION_COUNT_KEY) ?? 0) + 1;
    localStorage.setItem(SESSION_COUNT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

function readSessionCount(): number {
  try {
    return Number(localStorage.getItem(SESSION_COUNT_KEY) ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Contextual install banner shown above the bottom tab bar once the user
 * has demonstrated engagement (sessions, pinned players, or time dwelt).
 *
 * Hidden on iOS Safari — `IosInstallInstructions` covers that path.
 */
export default function InstallPrompt() {
  const pwa = usePwa();
  const { favorites } = usePlayer();
  const { showInfo } = useToast();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [sessions, setSessions] = useState<number>(() => readSessionCount());

  useEffect(() => {
    const next = bumpSessionCount();
    setSessions(next);
  }, []);

  useEffect(() => {
    if (!pwa.isInstallable) return;
    if (!pwa.shouldShowInstallPrompt()) return;

    const eligibleNow =
      sessions >= MIN_SESSIONS_BEFORE_PROMPT ||
      favorites.length >= MIN_PINNED_BEFORE_PROMPT;
    if (eligibleNow) {
      setVisible(true);
      return;
    }

    const timer = window.setTimeout(() => {
      if (pwa.isInstallable && pwa.shouldShowInstallPrompt()) {
        setVisible(true);
      }
    }, MIN_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [pwa, sessions, favorites.length]);

  const handleInstall = async () => {
    haptic.medium();
    const outcome = await pwa.promptInstall();
    if (outcome === "accepted") {
      haptic.success();
      showInfo(t("pwa.toast.installed"));
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    haptic.light();
    pwa.dismissInstallPrompt();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="install-prompt"
          role="dialog"
          aria-label={t("pwa.install.title")}
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          className="pointer-events-auto absolute inset-x-3 bottom-20 z-30 rounded-2xl border border-[#facc15]/40 bg-gradient-to-br from-[#2a1a4a] via-[#1f1438] to-[#1a0a2e] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.45)]"
        >
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={handleDismiss}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 active:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 pr-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#facc15]/15 text-[#facc15] shadow-[0_0_22px_rgba(250,204,21,0.35)]">
              <Download className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h3 className="text-[13px] font-black uppercase tracking-wide text-white">
                {t("pwa.install.title")}
              </h3>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-300">
                {t("pwa.install.subtitle")}
              </p>
            </div>
          </div>

          <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[10.5px] text-slate-300">
            <li className="flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-[#a78bfa]" />
              {t("pwa.install.bulletHome")}
            </li>
            <li className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#facc15]" />
              {t("pwa.install.bulletFast")}
            </li>
            <li className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-[#22c55e]" />
              {t("pwa.install.bulletOffline")}
            </li>
            <li className="flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5 text-[#f97316]" />
              {t("pwa.install.bulletNotifications")}
            </li>
          </ul>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 rounded-xl bg-[#facc15] py-2.5 text-[11px] font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_18px_rgba(250,204,21,0.3)] active:scale-95"
            >
              {t("pwa.install.install")}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-300 active:scale-95"
            >
              {t("pwa.install.notNow")}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
