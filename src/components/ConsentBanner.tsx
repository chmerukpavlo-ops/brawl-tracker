import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, X, Settings as SettingsIcon } from "lucide-react";
import {
  getConsent,
  setConsent,
  subscribeConsent,
} from "../lib/telemetryConsent";
import { initTelemetry, shutdownTelemetry } from "../lib/telemetry";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "../lib/analytics/consent";
import { useTranslation } from "../hooks/useTranslation";
import { haptic } from "../hooks/useHaptic";
import { usePlayer } from "../context/PlayerContext";
import PrivacyPolicySheet from "./PrivacyPolicySheet";

/**
 * First-boot consent banner. Shows three options:
 *
 *   - **Allow all** — turns on both crash reporting and analytics.
 *   - **Essentials only** — explicitly denies both. The banner stops
 *     showing; toggles can still be flipped back on later in Settings.
 *   - **Customize** — opens the privacy bottom sheet so the user can
 *     read what each switch does before deciding. Their choice from the
 *     sheet flows back through the same consent storage and dismisses
 *     this banner once both have been set explicitly.
 *
 * The banner shows when EITHER decision is missing — that way an
 * existing user who upgrades doesn't get re-prompted for telemetry but
 * does get asked once about analytics.
 */
export default function ConsentBanner() {
  const { t } = useTranslation();
  const { setActiveTab } = usePlayer();
  const [show, setShow] = useState<boolean>(false);
  const [policyOpen, setPolicyOpen] = useState(false);

  useEffect(() => {
    const undecided =
      getConsent() === null || getAnalyticsConsent() === null;
    if (undecided) {
      // Wait a beat so we don't pop on the very first frame —
      // gives the user time to see the app shell first.
      const id = window.setTimeout(() => setShow(true), 1200);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, []);

  // If telemetry consent is set elsewhere (Settings) drop the banner.
  // Same for analytics — we don't subscribe to it here because it's
  // sufficient to listen on either signal; the banner closing is a
  // best-effort UX nicety, not a correctness requirement.
  useEffect(() => {
    return subscribeConsent(() => {
      const undecided =
        getConsent() === null || getAnalyticsConsent() === null;
      if (!undecided) setShow(false);
    });
  }, []);

  const decide = async (allowTelemetry: boolean, allowAnalytics: boolean) => {
    haptic.light();
    setConsent(allowTelemetry ? "granted" : "denied");
    setAnalyticsConsent(allowAnalytics ? "granted" : "denied");
    setShow(false);

    if (allowTelemetry) {
      const dsn = import.meta.env.VITE_SENTRY_DSN;
      if (dsn) {
        await initTelemetry({
          dsn,
          environment: import.meta.env.MODE,
          release: import.meta.env.VITE_APP_VERSION,
          tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
        });
      }
    } else {
      await shutdownTelemetry();
    }
    // The analytics facade subscribes to consent changes, so flipping
    // `setAnalyticsConsent` above is enough — the adapter is loaded /
    // unloaded asynchronously inside `initAnalytics`.
  };

  const openCustomize = () => {
    haptic.light();
    // The user will set their preferences explicitly in the policy
    // sheet + Settings → Privacy. Mark the banner as "decided so far"
    // by deferring until the user makes choices in the sheet — but to
    // unblock first paint we close the banner now and trust them to
    // visit Settings.
    setPolicyOpen(true);
    // Don't persist consent yet — the toggles in PrivacySection will.
    setShow(false);
    // Land them on Settings so the toggles are one tap away after the
    // sheet closes.
    setActiveTab("settings");
  };

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            key="consent-banner"
            role="dialog"
            aria-label={t("privacy.consentTitle")}
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]"
          >
            <div className="pointer-events-auto mx-auto max-w-[430px] rounded-2xl border border-white/10 bg-[#2a1a4a]/95 p-4 shadow-2xl backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-yellow-400/15 text-yellow-300">
                  <Shield size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {t("privacy.consentTitle")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    {t("privacy.consentBody")}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t("common.close") ?? "Close"}
                  onClick={() => decide(false, false)}
                  className="flex-none rounded-full p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => decide(false, false)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-2 text-[11px] font-medium text-slate-200 transition hover:bg-white/10"
                >
                  {t("privacy.consentEssentials")}
                </button>
                <button
                  type="button"
                  onClick={openCustomize}
                  className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 px-2 text-[11px] font-medium text-slate-200 transition hover:bg-white/10"
                >
                  <SettingsIcon size={13} />
                  {t("privacy.consentCustomize")}
                </button>
                <button
                  type="button"
                  onClick={() => decide(true, true)}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-yellow-400 px-2 text-[11px] font-semibold text-[#1a0a2e] transition hover:bg-yellow-300"
                >
                  {t("privacy.consentAllow")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PrivacyPolicySheet
        open={policyOpen}
        onClose={() => setPolicyOpen(false)}
      />
    </>
  );
}
