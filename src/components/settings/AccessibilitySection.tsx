import { Accessibility, MoonStar, Type, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { useReducedMotion, type ReduceMotionMode } from "../../hooks/useReducedMotion";
import { useHighContrast, type ContrastMode } from "../../hooks/useHighContrast";
import { haptic } from "../../hooks/useHaptic";
import { announce } from "../../utils/a11y";

const FONT_MODE_KEY = "brawl_font_mode";

type FontMode = "default" | "dyslexic";

function readFontMode(): FontMode {
  try {
    const v = localStorage.getItem(FONT_MODE_KEY);
    return v === "dyslexic" ? "dyslexic" : "default";
  } catch {
    return "default";
  }
}

function writeFontMode(mode: FontMode): void {
  try {
    if (mode === "default") localStorage.removeItem(FONT_MODE_KEY);
    else localStorage.setItem(FONT_MODE_KEY, mode);
  } catch {
    /* swallow */
  }
}

/**
 * Accessibility section in Settings. Three switches:
 *
 *   - **Reduce motion**: tri-state (system / always / never). Defaults
 *     to "system" so the OS preference wins out of the box.
 *   - **High contrast**: same tri-state shape, drives the
 *     `data-contrast="more"` palette override.
 *   - **Dyslexia-friendly font**: swaps in a system font stack
 *     recommended by the British Dyslexia Association. We don't ship
 *     OpenDyslexic itself — most users that need it have it installed
 *     system-wide, and we'd rather not add ~80 KB of woff2 to the
 *     bundle for a feature only ~5 % of users enable.
 *
 * Every change calls `announce()` so screen-reader users get
 * feedback that the toggle took effect — silent setting changes are
 * a known a11y annoyance.
 */
export default function AccessibilitySection() {
  const { t } = useTranslation();
  const motion = useReducedMotion();
  const contrast = useHighContrast();
  const [fontMode, setFontMode] = useState<FontMode>(readFontMode);

  // Reflect the font-mode onto `<html data-font-mode>` so the global
  // CSS rule in `index.css` picks it up. Mirror the pattern used by
  // the contrast and reduce-motion hooks.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (fontMode === "dyslexic") {
      document.documentElement.dataset.fontMode = "dyslexic";
    } else {
      delete document.documentElement.dataset.fontMode;
    }
  }, [fontMode]);

  const handleMotionChange = (next: ReduceMotionMode) => {
    haptic.selection();
    motion.setMode(next);
    announce(
      next === "always"
        ? t("a11y.announceMotionAlways")
        : next === "never"
        ? t("a11y.announceMotionNever")
        : t("a11y.announceMotionSystem")
    );
  };

  const handleContrastChange = (next: ContrastMode) => {
    haptic.selection();
    contrast.setMode(next);
    announce(
      next === "more"
        ? t("a11y.announceContrastMore")
        : next === "normal"
        ? t("a11y.announceContrastNormal")
        : t("a11y.announceContrastSystem")
    );
  };

  const handleFontModeChange = (next: FontMode) => {
    haptic.selection();
    setFontMode(next);
    writeFontMode(next);
    announce(
      next === "dyslexic"
        ? t("a11y.announceFontDyslexic")
        : t("a11y.announceFontDefault")
    );
  };

  return (
    <section
      aria-labelledby="a11y-section-heading"
      className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4"
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300">
          <Accessibility className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="a11y-section-heading"
            className="text-[12px] font-black uppercase tracking-widest text-white"
          >
            {t("a11y.settingsTitle")}
          </h2>
          <p className="mt-1 text-[11.5px] leading-snug text-slate-400">
            {t("a11y.settingsBody")}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <TriToggle
          icon={<MoonStar className="h-4 w-4 text-violet-300" aria-hidden="true" />}
          label={t("a11y.reduceMotion")}
          description={t("a11y.reduceMotionDesc")}
          value={motion.mode}
          onChange={handleMotionChange}
          options={[
            { value: "system", label: t("a11y.modeSystem") },
            { value: "always", label: t("a11y.modeAlways") },
            { value: "never", label: t("a11y.modeNever") },
          ]}
        />

        <TriToggle
          icon={<Eye className="h-4 w-4 text-yellow-300" aria-hidden="true" />}
          label={t("a11y.highContrast")}
          description={t("a11y.highContrastDesc")}
          value={contrast.mode}
          onChange={handleContrastChange}
          options={[
            { value: "system", label: t("a11y.modeSystem") },
            { value: "more", label: t("a11y.modeMore") },
            { value: "normal", label: t("a11y.modeNormal") },
          ]}
        />

        <TriToggle
          icon={<Type className="h-4 w-4 text-emerald-300" aria-hidden="true" />}
          label={t("a11y.fontMode")}
          description={t("a11y.fontModeDesc")}
          value={fontMode}
          onChange={handleFontModeChange}
          options={[
            { value: "default", label: t("a11y.fontDefault") },
            { value: "dyslexic", label: t("a11y.fontDyslexic") },
          ]}
        />
      </div>
    </section>
  );
}

interface TriToggleProps<T extends string> {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}

function TriToggle<T extends string>({
  icon,
  label,
  description,
  value,
  onChange,
  options,
}: TriToggleProps<T>) {
  // The widget is a `radiogroup` rather than three independent
  // checkboxes — semantically only one option can be selected at a
  // time. Each option is a `radio` so screen readers announce
  // "Selected, 1 of 3" et al.
  return (
    <div className="rounded-xl bg-[#1a0a2e] p-3">
      <div className="mb-2 flex items-start gap-2.5">
        <span className="mt-0.5">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-bold uppercase text-white">{label}</p>
          <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">
            {description}
          </p>
        </div>
      </div>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(opt.value)}
              className={`min-h-[40px] rounded-lg px-2 text-[11px] font-bold transition-colors ${
                active
                  ? "bg-yellow-400 text-[#1a0a2e]"
                  : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
