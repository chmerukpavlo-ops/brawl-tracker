import { useRef, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Loader2, Search, Sparkles, Upload, User } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { useTranslation } from "../../hooks/useTranslation";
import { haptic } from "../../hooks/useHaptic";
import { useBackup } from "../../hooks/useBackup";

interface FindTagStepProps {
  /** Called once a player (real or demo) has been loaded. */
  onLoaded: (info: { tag: string | null; playerName?: string }) => void;
  /** Called when the user explicitly skips this step. */
  onSkip: () => void;
}

const TAG_RE = /^[A-Z0-9]{3,15}$/;

function normalize(raw: string): string {
  return raw.trim().toUpperCase().replace(/^#+/, "");
}

/**
 * Step 4 — collects the user's player tag *or* loads the demo profile.
 * Doubles as a mini tutorial: numbered steps show where to find the
 * tag inside Brawl Stars itself.
 */
export default function FindTagStep({ onLoaded, onSkip }: FindTagStepProps) {
  const { t } = useTranslation();
  const { handleQuery, setMyPlayer, loadDemoPlayer, playerData } = usePlayer();
  const { previewBackup, applyPreview } = useBackup();
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [demo, setDemo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (submitting) return;

    if (demo) {
      haptic.light();
      loadDemoPlayer();
      onLoaded({ tag: null, playerName: playerData?.name });
      return;
    }

    const norm = normalize(input);
    if (!TAG_RE.test(norm)) {
      setValidationError(t("onboarding.findTag.invalidTag"));
      haptic.error();
      return;
    }

    setValidationError(null);
    setSubmitting(true);
    haptic.medium();
    const ok = await handleQuery(`#${norm}`, { navigateHome: false });
    setSubmitting(false);
    if (ok) {
      setMyPlayer(norm);
      haptic.success();
      onLoaded({ tag: `#${norm}`, playerName: playerData?.name });
    }
  };

  const trimmed = input.trim();

  return (
    <div className="flex h-full flex-col">
      <header className="space-y-2 pt-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          {t("onboarding.findTag.title")}
        </h1>
        <p className="text-[12.5px] leading-snug text-slate-400">
          {t("onboarding.findTag.subtitle")}
        </p>
      </header>

      {/* Inline "how to find your tag" tutorial. Lo-fi SVG illustrations
          would be ideal here — for now numbered icon chips keep it crisp
          and translation-friendly. */}
      <ol className="mt-6 space-y-2">
        {[
          { n: 1, text: t("onboarding.findTag.step1") },
          { n: 2, text: t("onboarding.findTag.step2") },
          { n: 3, text: t("onboarding.findTag.step3") },
        ].map((step) => (
          <motion.li
            key={step.n}
            initial={{ x: -8, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.05 * step.n }}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#facc15]/15 text-[11px] font-black text-[#facc15]">
              {step.n}
            </span>
            <p className="text-[12px] leading-snug text-slate-200">{step.text}</p>
          </motion.li>
        ))}
      </ol>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-[10.5px] font-black uppercase tracking-widest text-slate-500">
            {t("onboarding.findTag.inputLabel")}
          </span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={input}
              disabled={demo || submitting}
              placeholder={t("onboarding.findTag.inputPlaceholder")}
              onChange={(e) => {
                setInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              className={`w-full rounded-xl border bg-[#1a0a2e] py-3 pl-10 pr-3 text-sm font-mono uppercase tracking-wider text-white outline-none transition-colors disabled:opacity-50 ${
                validationError
                  ? "border-rose-500/60 focus:border-rose-400"
                  : "border-white/15 focus:border-[#facc15]/60"
              }`}
            />
          </div>
          {validationError && (
            <p className="mt-1.5 text-[11px] text-rose-300">{validationError}</p>
          )}
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <input
            type="checkbox"
            checked={demo}
            onChange={(e) => {
              setDemo(e.target.checked);
              if (e.target.checked) setValidationError(null);
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#facc15]"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wide text-white">
              <Sparkles className="h-3.5 w-3.5 text-[#facc15]" />
              {t("onboarding.findTag.demoToggle")}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
              {t("onboarding.findTag.demoHint")}
            </p>
          </div>
        </label>

        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={submitting || (!demo && trimmed.length === 0)}
            className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#facc15] text-[12px] font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_22px_rgba(250,204,21,0.35)] transition-opacity active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("onboarding.findTag.loading")}
              </>
            ) : demo ? (
              <>
                <Sparkles className="h-4 w-4" />
                {t("onboarding.findTag.submitDemo")}
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                {t("onboarding.findTag.submit")}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              haptic.light();
              onSkip();
            }}
            className="block w-full py-2 text-[11px] font-black uppercase tracking-wider text-slate-500 active:opacity-70"
          >
            {t("onboarding.findTag.skip")}
          </button>

          {/* Returning users: one-tap restore from a previously exported
              backup. Defaults to "merge" so existing local data (if any)
              survives. Reload happens inside applyPreview. */}
          <button
            type="button"
            onClick={() => restoreInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-1.5 py-1 text-[10.5px] font-black uppercase tracking-widest text-[#a78bfa] active:opacity-70"
          >
            <Upload className="h-3 w-3" />
            {t("onboarding.findTag.restoreBackup")}
          </button>
          <input
            ref={restoreInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              haptic.medium();
              const preview = await previewBackup(file);
              if (preview) {
                await applyPreview(preview, { strategy: "merge" });
              }
            }}
          />
        </div>
      </form>
    </div>
  );
}
