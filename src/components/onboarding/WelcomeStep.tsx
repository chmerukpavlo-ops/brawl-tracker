import { motion } from "motion/react";
import { Trophy, Zap } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

interface WelcomeStepProps {
  onNext: () => void;
}

/**
 * Hero step — purpose statement + single primary CTA. Keeps copy short
 * so first impressions don't read like a wall of text.
 */
export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      {/* Hero glow + lightning glyph. Matches the brand favicon. */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 24, delay: 0.05 }}
        className="relative mb-8"
      >
        <div className="absolute -inset-8 rounded-full bg-[#facc15]/15 blur-3xl" />
        <div className="absolute -inset-2 rounded-full bg-[#7c3aed]/30 blur-2xl" />
        <div className="relative flex h-28 w-28 items-center justify-center rounded-[28px] border border-[#facc15]/40 bg-gradient-to-br from-[#1a0a2e] via-[#3a1f6b] to-[#1a0a2e] shadow-[0_0_36px_rgba(250,204,21,0.45)]">
          <Zap className="h-14 w-14 fill-[#facc15] text-[#facc15] drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" />
        </div>
        <motion.span
          initial={{ scale: 0, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 320, damping: 22 }}
          className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#facc15] text-[#1a0a2e] shadow-[0_0_18px_rgba(250,204,21,0.6)]"
        >
          <Trophy className="h-4 w-4" />
        </motion.span>
      </motion.div>

      <motion.h1
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.12 }}
        className="px-2 text-2xl font-black uppercase tracking-tight text-white"
      >
        {t("onboarding.welcome.title")}
      </motion.h1>

      <motion.p
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-3 max-w-[320px] text-[13px] leading-relaxed text-slate-300"
      >
        {t("onboarding.welcome.subtitle")}
      </motion.p>

      <motion.button
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.32 }}
        type="button"
        onClick={onNext}
        className="mt-10 inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-[#facc15] px-7 text-[12.5px] font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_24px_rgba(250,204,21,0.4)] active:scale-95"
      >
        {t("onboarding.welcome.cta")}
      </motion.button>
    </div>
  );
}
