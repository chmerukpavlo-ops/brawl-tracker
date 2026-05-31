import { useI18n, syncLocaleToUrl } from "../context/I18nContext";
import { LOCALES, LOCALE_LABELS, type Locale } from "../i18n";

interface LanguageToggleProps {
  variant?: "segmented" | "compact";
  className?: string;
  /** Persist the choice to URL via `?lang=` so it can be shared. */
  syncToUrl?: boolean;
}

export default function LanguageToggle({
  variant = "segmented",
  className = "",
  syncToUrl = false,
}: LanguageToggleProps) {
  const { locale, setLocale } = useI18n();

  const handleChange = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
    if (syncToUrl) syncLocaleToUrl(next);
  };

  if (variant === "compact") {
    const meta = LOCALE_LABELS[locale];
    const next: Locale = locale === "uk" ? "en" : "uk";
    return (
      <button
        type="button"
        onClick={() => handleChange(next)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white active:scale-95 ${className}`}
        aria-label={`Language: ${meta.native}. Tap to switch.`}
      >
        <span aria-hidden>{meta.flag}</span>
        <span>{locale.toUpperCase()}</span>
      </button>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Language"
      className={`grid grid-cols-2 gap-1 rounded-2xl border border-white/5 bg-[#1a0a2e]/60 p-1 ${className}`}
    >
      {LOCALES.map((l) => {
        const isActive = l === locale;
        const meta = LOCALE_LABELS[l];
        return (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleChange(l)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-colors ${
              isActive
                ? "bg-[#facc15] text-[#1a0a2e] shadow-[0_0_18px_rgba(250,204,21,0.35)]"
                : "text-slate-300 active:text-white"
            }`}
          >
            <span aria-hidden className="text-base">
              {meta.flag}
            </span>
            <span>{meta.native}</span>
          </button>
        );
      })}
    </div>
  );
}
