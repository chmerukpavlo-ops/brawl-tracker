import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, X } from "lucide-react";
import { usePwa } from "../context/PwaContext";
import { useTranslation } from "../hooks/useTranslation";
import { haptic } from "../hooks/useHaptic";

/**
 * Top banner shown when a new service-worker build is waiting. Tapping
 * "Update" calls `applyUpdate()` which `skipWaiting`s and reloads.
 */
export default function UpdatePrompt() {
  const pwa = usePwa();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(pwa.shouldShowUpdatePrompt());
  }, [pwa]);

  const handleApply = async () => {
    haptic.medium();
    setVisible(false);
    await pwa.applyUpdate();
  };

  const handleLater = () => {
    haptic.light();
    pwa.dismissUpdate();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="update-prompt"
          role="status"
          aria-live="polite"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          style={{ paddingTop: "env(safe-area-inset-top)" }}
          className="pointer-events-auto absolute inset-x-3 top-3 z-40 rounded-2xl border border-[#22c55e]/40 bg-gradient-to-br from-[#0f3a23] via-[#0a2c1a] to-[#06170f] p-3 shadow-[0_18px_42px_rgba(0,0,0,0.45)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#22c55e]/15 text-[#4ade80] shadow-[0_0_18px_rgba(74,222,128,0.35)]">
              <RefreshCw className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-black uppercase tracking-wide text-white">
                {t("pwa.update.title")}
              </p>
              <p className="truncate text-[10.5px] text-slate-300">
                {t("pwa.update.subtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-xl bg-[#22c55e] px-3 py-2 text-[11px] font-black uppercase tracking-wider text-[#06170f] shadow-[0_0_16px_rgba(34,197,94,0.35)] active:scale-95"
            >
              {t("pwa.update.apply")}
            </button>
            <button
              type="button"
              aria-label={t("pwa.update.later")}
              onClick={handleLater}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 active:opacity-70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
