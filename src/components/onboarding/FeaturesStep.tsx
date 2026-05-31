import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  GitCompareArrows,
  Pin,
  Target,
  Trophy,
  User,
} from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import type { TranslationKey } from "../../i18n";

interface FeaturesStepProps {
  onNext: () => void;
}

interface FeatureCard {
  icon: LucideIcon;
  title: TranslationKey;
  body: TranslationKey;
  accent: string;
}

const CARDS: FeatureCard[] = [
  {
    icon: User,
    title: "onboarding.features.profileTitle",
    body: "onboarding.features.profileBody",
    accent: "from-sky-500/20 to-sky-500/5 text-sky-200",
  },
  {
    icon: Bot,
    title: "onboarding.features.coachTitle",
    body: "onboarding.features.coachBody",
    accent: "from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-200",
  },
  {
    icon: Pin,
    title: "onboarding.features.pinnedTitle",
    body: "onboarding.features.pinnedBody",
    accent: "from-amber-500/20 to-amber-500/5 text-amber-200",
  },
  {
    icon: Target,
    title: "onboarding.features.goalsTitle",
    body: "onboarding.features.goalsBody",
    accent: "from-emerald-500/20 to-emerald-500/5 text-emerald-200",
  },
  {
    icon: Trophy,
    title: "onboarding.features.leadersTitle",
    body: "onboarding.features.leadersBody",
    accent: "from-yellow-400/20 to-yellow-400/5 text-yellow-200",
  },
  {
    icon: GitCompareArrows,
    title: "onboarding.features.compareTitle",
    body: "onboarding.features.compareBody",
    accent: "from-rose-500/20 to-rose-500/5 text-rose-200",
  },
];

export default function FeaturesStep({ onNext }: FeaturesStepProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <header className="space-y-2 pt-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          {t("onboarding.features.title")}
        </h1>
        <p className="text-[12.5px] leading-snug text-slate-400">
          {t("onboarding.features.subtitle")}
        </p>
      </header>

      <ul className="mt-6 grid grid-cols-2 gap-2.5">
        {CARDS.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.li
              key={card.title}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 + idx * 0.04 }}
              className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${card.accent} p-3`}
            >
              <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
              </span>
              <p className="text-[12px] font-black uppercase tracking-wide text-white">
                {t(card.title)}
              </p>
              <p className="mt-1 text-[10.5px] leading-snug text-slate-200/85">
                {t(card.body)}
              </p>
            </motion.li>
          );
        })}
      </ul>

      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={onNext}
          className="flex w-full min-h-[48px] items-center justify-center rounded-2xl bg-[#facc15] text-[12px] font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_22px_rgba(250,204,21,0.35)] active:scale-95"
        >
          {t("onboarding.features.next")}
        </button>
      </div>
    </div>
  );
}
