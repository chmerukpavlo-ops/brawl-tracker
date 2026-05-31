import { useEffect, useState } from "react";
import { Shield, FileText } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import {
  getConsent as getTelemetryConsent,
  setConsent as setTelemetryConsent,
  subscribeConsent as subscribeTelemetryConsent,
  type TelemetryConsent,
} from "../../lib/telemetryConsent";
import { initTelemetry, shutdownTelemetry } from "../../lib/telemetry";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  subscribeAnalyticsConsent,
  type AnalyticsConsent,
} from "../../lib/analytics/consent";
import { haptic } from "../../hooks/useHaptic";
import PrivacyPolicySheet from "../PrivacyPolicySheet";

/**
 * Combined privacy section: two independent toggles, one for crash
 * reporting (Sentry) and one for product analytics. Replaces the
 * standalone `TelemetrySection`.
 *
 * Independence matters: a user might want crash reports but not usage
 * analytics, or vice versa. Folding both into a single switch would
 * either over-collect (privacy-friendly users opt out completely) or
 * under-collect (we miss crashes from users who'd happily share them).
 *
 * Both adapters are loaded lazily. Toggling on triggers a dynamic
 * import; toggling off calls `shutdown` / `setOptOut(true)` and the
 * SDK chunk stays in cache but stops sending.
 */
export default function PrivacySection() {
  const { t } = useTranslation();
  const [telemetry, setTelemetry] = useState<TelemetryConsent | null>(() =>
    getTelemetryConsent()
  );
  const [analytics, setAnalytics] = useState<AnalyticsConsent | null>(() =>
    getAnalyticsConsent()
  );
  const [policyOpen, setPolicyOpen] = useState(false);

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const dsnConfigured = typeof dsn === "string" && dsn.length > 0;
  const analyticsBackend = import.meta.env.VITE_ANALYTICS_BACKEND ?? "";
  const analyticsConfigured = analyticsBackend.length > 0;

  useEffect(() => subscribeTelemetryConsent(setTelemetry), []);
  useEffect(() => subscribeAnalyticsConsent(setAnalytics), []);

  const onTelemetryToggle = async (next: boolean) => {
    haptic.light();
    setTelemetryConsent(next ? "granted" : "denied");
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

  const onAnalyticsToggle = (next: boolean) => {
    haptic.light();
    // The facade subscribes to consent changes and (re)loads / unloads
    // the adapter automatically, so we only need to flip the flag.
    setAnalyticsConsent(next ? "granted" : "denied");
  };

  const telemetryEnabled = telemetry === "granted";
  const analyticsEnabled = analytics === "granted";

  return (
    <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-300">
          <Shield className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black uppercase tracking-widest text-white">
            {t("privacy.title")}
          </p>
          <p className="mt-1 text-[11.5px] leading-snug text-slate-400">
            {t("privacy.body")}
          </p>

          <div className="mt-3 space-y-2">
            <ToggleRow
              label={t("privacy.errorTracking")}
              description={t("privacy.errorTrackingDesc")}
              checked={telemetryEnabled}
              onChange={onTelemetryToggle}
              note={
                !dsnConfigured ? t("privacy.errorTrackingNoDsn") : undefined
              }
            />

            <ToggleRow
              label={t("privacy.analytics")}
              description={t("privacy.analyticsDesc")}
              checked={analyticsEnabled}
              onChange={onAnalyticsToggle}
              note={
                !analyticsConfigured
                  ? t("privacy.analyticsNoBackend")
                  : undefined
              }
            />
          </div>

          <button
            type="button"
            onClick={() => setPolicyOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-yellow-300 transition hover:text-yellow-200"
          >
            <FileText className="h-3.5 w-3.5" />
            {t("privacy.readPolicy")}
          </button>

          <p className="mt-3 text-[10.5px] leading-snug text-slate-500">
            {t("privacy.note")}
          </p>
        </div>
      </div>

      <PrivacyPolicySheet open={policyOpen} onClose={() => setPolicyOpen(false)} />
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  note,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  note?: string;
}) {
  return (
    <div className="rounded-xl bg-[#1a0a2e] p-3">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-bold uppercase text-white">{label}</p>
          <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
            {description}
          </p>
        </div>
        <input
          type="checkbox"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="relative h-6 w-10 cursor-pointer appearance-none rounded-full bg-slate-600 transition before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:transition checked:bg-yellow-400 checked:before:translate-x-4 checked:before:bg-[#1a0a2e]"
        />
      </label>
      {note && (
        <p className="mt-2 rounded-lg bg-black/30 px-2.5 py-1.5 text-[10.5px] leading-snug text-slate-500">
          {note}
        </p>
      )}
    </div>
  );
}
