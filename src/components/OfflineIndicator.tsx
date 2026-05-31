import { AnimatePresence, motion } from "motion/react";
import { WifiOff } from "lucide-react";
import { usePwa } from "../context/PwaContext";
import { useTranslation } from "../hooks/useTranslation";

/**
 * Persistent slim status bar shown while `navigator.onLine` is false.
 * Animates in/out smoothly when connection state changes.
 */
export default function OfflineIndicator() {
  const pwa = usePwa();
  const { t } = useTranslation();
  const offline = !pwa.isOnline;

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          key="offline-indicator"
          role="status"
          aria-live="polite"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          style={{ paddingTop: "env(safe-area-inset-top)" }}
          className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center"
        >
          <div className="pointer-events-auto mx-3 mt-2 flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.25)] backdrop-blur">
            <WifiOff className="h-3.5 w-3.5" />
            <span>{t("pwa.offline.title")}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
