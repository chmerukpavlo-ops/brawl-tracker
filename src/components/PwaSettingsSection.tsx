import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleDot,
  Download,
  HardDrive,
  RefreshCw,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { motion } from "motion/react";
import { usePwa } from "../context/PwaContext";
import { useTranslation } from "../hooks/useTranslation";
import { useToast } from "../context/ToastContext";
import { haptic } from "../hooks/useHaptic";
import IosInstallInstructions from "./IosInstallInstructions";

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "1.0.0";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatInstalledDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString();
  } catch {
    return "—";
  }
}

export default function PwaSettingsSection() {
  const pwa = usePwa();
  const { t } = useTranslation();
  const { showSuccess, showInfo } = useToast();
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [iosOpen, setIosOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<"none" | "ok" | "found">("none");

  useEffect(() => {
    let cancelled = false;
    pwa.estimateStorage().then((s) => {
      if (!cancelled) setStorage(s);
    });
    return () => {
      cancelled = true;
    };
  }, [pwa]);

  const refreshStorage = async () => {
    const s = await pwa.estimateStorage();
    setStorage(s);
  };

  const handleCheckUpdate = async () => {
    haptic.light();
    setChecking(true);
    setCheckResult("none");
    await pwa.checkForUpdate();
    setChecking(false);
    setCheckResult(pwa.needRefresh ? "found" : "ok");
    if (pwa.needRefresh) {
      haptic.success();
    }
  };

  const handleClearCache = async () => {
    if (!window.confirm(t("pwa.settings.clearCacheConfirm"))) return;
    haptic.medium();
    await pwa.clearCaches();
    showSuccess(t("pwa.toast.cacheCleared"));
    setTimeout(() => window.location.reload(), 400);
  };

  const handleInstall = async () => {
    haptic.medium();
    const outcome = await pwa.promptInstall();
    if (outcome === "accepted") {
      haptic.success();
      showSuccess(t("pwa.toast.installed"));
    } else if (outcome === "unavailable") {
      showInfo(t("pwa.install.iosHint"));
    }
  };

  const renderStatusBadge = () => {
    if (pwa.isInstalled) {
      return (
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-200">
          {t("pwa.settings.installedBadge")}
        </span>
      );
    }
    return (
      <span
        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
          pwa.isOnline
            ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
            : "border-amber-500/40 bg-amber-500/10 text-amber-200"
        }`}
      >
        {pwa.isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            {t("pwa.settings.onlineNow")}
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            {t("pwa.settings.offlineNow")}
          </>
        )}
      </span>
    );
  };

  return (
    <motion.section
      layout
      className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4"
      id="pwa-app"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
          <Smartphone className="h-3.5 w-3.5 text-[#facc15]" />
          {t("pwa.settings.title")}
        </p>
        {renderStatusBadge()}
      </div>

      {!pwa.isSupported ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] text-slate-400">
          {t("pwa.settings.notSupported")}
        </p>
      ) : (
        <div className="space-y-4">
          {/* Install / installed banner. */}
          {pwa.isInstalled ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              <div className="min-w-0 text-[11.5px] leading-snug text-slate-200">
                <p className="font-black uppercase tracking-wider text-emerald-200">
                  {t("pwa.settings.installedBadge")}
                </p>
                {pwa.installedAt && (
                  <p className="text-[10.5px] text-slate-400">
                    {t("pwa.settings.installedAt", {
                      date: formatInstalledDate(pwa.installedAt),
                    })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-[#facc15]/30 bg-[#facc15]/5 p-3">
              <p className="text-[11.5px] leading-snug text-slate-200">
                {t("pwa.settings.installPrompt")}
              </p>
              {pwa.isInstallable ? (
                <button
                  type="button"
                  onClick={handleInstall}
                  className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl bg-[#facc15] text-[11px] font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_18px_rgba(250,204,21,0.3)] active:scale-95"
                >
                  <Download className="h-4 w-4" />
                  {t("pwa.settings.installCta")}
                </button>
              ) : pwa.needsManualInstall ? (
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setIosOpen(true);
                  }}
                  className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-[11px] font-black uppercase tracking-wider text-slate-200 active:scale-95"
                >
                  <Smartphone className="h-4 w-4" />
                  {t("pwa.settings.iosInstallCta")}
                </button>
              ) : null}
            </div>
          )}

          {/* Version + update check. */}
          <div className="space-y-2 rounded-xl border border-white/10 bg-[#1a0a2e]/40 p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {t("pwa.settings.version")}
              </span>
              <span className="font-mono">{APP_VERSION}</span>
            </div>
            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={checking}
              className="flex w-full min-h-[36px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-[11px] font-black uppercase tracking-wider text-slate-200 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
              {checking
                ? t("pwa.settings.checkUpdateInProgress")
                : t("pwa.settings.checkUpdate")}
            </button>
            {checkResult === "ok" && (
              <p className="flex items-center gap-1.5 text-[10.5px] text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                {t("pwa.settings.noUpdates")}
              </p>
            )}
            {checkResult === "found" && (
              <p className="flex items-center gap-1.5 text-[10.5px] text-[#facc15]">
                <CircleDot className="h-3 w-3" />
                {t("pwa.update.title")}
              </p>
            )}
          </div>

          {/* Offline readiness. */}
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1a0a2e]/40 p-3 text-[11px] text-slate-300">
            {pwa.offlineReady ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
            ) : (
              <CircleDot className="h-4 w-4 shrink-0 text-slate-500" />
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {t("pwa.settings.offlineTitle")}
              </p>
              <p className="text-[11px] leading-snug">
                {pwa.offlineReady
                  ? t("pwa.settings.offlineReady")
                  : t("pwa.settings.offlineNotReady")}
              </p>
            </div>
          </div>

          {/* Cache controls. */}
          <div className="space-y-2 rounded-xl border border-white/10 bg-[#1a0a2e]/40 p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <HardDrive className="h-3 w-3" />
                {t("pwa.settings.cacheTitle")}
              </span>
              <button
                type="button"
                onClick={refreshStorage}
                aria-label={t("common.refresh")}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] active:opacity-70"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300">
              {storage
                ? t("pwa.settings.cacheUsage", {
                    usage: formatBytes(storage.usage),
                    quota: formatBytes(storage.quota),
                  })
                : t("pwa.settings.cacheUnknown")}
            </p>
            <button
              type="button"
              onClick={handleClearCache}
              className="flex w-full min-h-[36px] items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-[10px] font-black uppercase tracking-wider text-rose-200 active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("pwa.settings.clearCache")}
            </button>
          </div>
        </div>
      )}

      <IosInstallInstructions open={iosOpen} onClose={() => setIosOpen(false)} />
    </motion.section>
  );
}
