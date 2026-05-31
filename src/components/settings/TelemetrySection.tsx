import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import {
  getConsent,
  setConsent,
  subscribeConsent,
  type TelemetryConsent,
} from "../../lib/telemetryConsent";
import { initTelemetry, shutdownTelemetry } from "../../lib/telemetry";
import { haptic } from "../../hooks/useHaptic";

/**
 * Privacy & telemetry section in Settings — single source of truth
 * for the user's consent decision after the initial banner. Wired
 * to the same `telemetryConsent` store, so toggling here flips the
 * persisted state and the banner stays dismissed.
 *
 * Rendering rules:
 *   - DSN not configured → still show the toggle, but explain that
 *     no data leaves the device regardless. Honesty > convenience.
 *   - User toggles ON → lazy-load Sentry and `init`.
 *   - User toggles OFF → call `Sentry.close()` and discard any
 *     in-flight events.
 */
export default function TelemetrySection() {
  const { t } = useTranslation();
  const [consent, setLocalConsent] = useState<TelemetryConsent | null>(() =>
    getConsent()
  );
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const dsnConfigured = typeof dsn === "string" && dsn.length > 0;

  useEffect(() => subscribeConsent(setLocalConsent), []);

  const onToggle = async (next: boolean) => {
    haptic.light();
    setConsent(next ? "granted" : "denied");
    if (next && dsnConfigured) {
      await initTelemetry({
        dsn: dsn!,
        environment: import.meta.env.MODE,
        release: import.meta.env.VITE_APP_VERSION,
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      });
    } else {
      await shutdownTelemetry();
    }
  };

  const enabled = consent === "granted";

  return (
    <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-300">
          <Shield className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black uppercase tracking-widest text-white">
            {t("telemetry.settings.title")}
          </p>
          <p className="mt-1 text-[11.5px] leading-snug text-slate-400">
            {t("telemetry.settings.body")}
          </p>

          {!dsnConfigured && (
            <p className="mt-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-[10.5px] leading-snug text-slate-500">
              {t("telemetry.settings.noDsn")}
            </p>
          )}

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <span className="text-[11.5px] font-semibold text-slate-200">
              {enabled
                ? t("telemetry.settings.enabled")
                : t("telemetry.settings.disabled")}
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-checked={enabled}
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="relative h-6 w-10 cursor-pointer appearance-none rounded-full bg-slate-600 transition before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:transition checked:bg-yellow-400 checked:before:translate-x-4 checked:before:bg-[#1a0a2e]"
            />
          </label>

          <p className="mt-3 text-[10.5px] leading-snug text-slate-500">
            {t("telemetry.settings.privacyNote")}
          </p>
        </div>
      </div>
    </section>
  );
}
