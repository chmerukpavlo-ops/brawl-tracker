import { Check, Globe, Vibrate, VibrateOff } from "lucide-react";
import { useI18n } from "../../context/I18nContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useHapticEnabled, haptic } from "../../hooks/useHaptic";
import { LOCALE_LABELS } from "../../i18n";
import type { Locale } from "../../i18n";

interface PreferencesStepProps {
  onNext: () => void;
}

const LOCALE_OPTIONS: Array<{ value: Locale; flag: string }> = [
  { value: "uk", flag: "🇺🇦" },
  { value: "en", flag: "🇬🇧" },
];

/**
 * Locale + haptic toggle. Theme selector is intentionally omitted —
 * the app is single-themed (dark purple) so a chooser would dead-end.
 * Each change is applied instantly using the existing hooks so the
 * remaining steps reflect the new preferences immediately.
 */
export default function PreferencesStep({ onNext }: PreferencesStepProps) {
  const { t } = useTranslation();
  const { locale, setLocale } = useI18n();
  const [hapticOn, setHapticOn] = useHapticEnabled();

  const handleHapticChange = (next: boolean) => {
    setHapticOn(next);
    if (next) haptic.medium();
  };

  return (
    <div className="flex h-full flex-col">
      <header className="space-y-2 pt-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          {t("onboarding.preferences.title")}
        </h1>
        <p className="text-[12.5px] leading-snug text-slate-400">
          {t("onboarding.preferences.subtitle")}
        </p>
      </header>

      <section className="mt-8 space-y-3">
        <p className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-widest text-slate-500">
          <Globe className="h-3.5 w-3.5" />
          {t("onboarding.preferences.languageTitle")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {LOCALE_OPTIONS.map((opt) => {
            const selected = locale === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (selected) return;
                  setLocale(opt.value);
                }}
                aria-pressed={selected}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
                  selected
                    ? "border-[#facc15]/60 bg-[#facc15]/10 shadow-[0_0_18px_rgba(250,204,21,0.25)]"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span className="text-2xl leading-none">{opt.flag}</span>
                <span className="flex-1 text-[12px] font-black uppercase tracking-wider text-white">
                  {LOCALE_LABELS[opt.value].native}
                </span>
                {selected && <Check className="h-4 w-4 text-[#facc15]" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <p className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-widest text-slate-500">
          {hapticOn ? (
            <Vibrate className="h-3.5 w-3.5" />
          ) : (
            <VibrateOff className="h-3.5 w-3.5" />
          )}
          {t("onboarding.preferences.hapticTitle")}
        </p>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="min-w-0">
            <p className="text-[12.5px] font-black uppercase tracking-wide text-white">
              {hapticOn
                ? t("onboarding.preferences.hapticOn")
                : t("onboarding.preferences.hapticOff")}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
              {t("onboarding.preferences.hapticHint")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hapticOn}
            onClick={() => handleHapticChange(!hapticOn)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
              hapticOn ? "bg-[#facc15]" : "bg-white/15"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-[#1a0a2e] transition-transform ${
                hapticOn ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>

      <div className="mt-auto pt-10">
        <button
          type="button"
          onClick={onNext}
          className="flex w-full min-h-[48px] items-center justify-center rounded-2xl bg-[#facc15] text-[12px] font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_22px_rgba(250,204,21,0.35)] active:scale-95"
        >
          {t("onboarding.preferences.next")}
        </button>
      </div>
    </div>
  );
}
