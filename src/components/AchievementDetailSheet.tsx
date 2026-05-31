import { useMemo } from "react";
import BottomSheet from "./BottomSheet";
import {
  CATEGORY_LABEL,
  TIER_COLOR,
  type AchievementDef,
} from "../data/achievements";
import { useAchievements } from "../hooks/useAchievements";
import { usePlayer } from "../context/PlayerContext";
import ShareButton from "./ShareButton";
import { shareAchievementPreset } from "../utils/sharePresets";
import { formatRelativeTime } from "../utils/formatTime";

interface AchievementDetailSheetProps {
  achievement: AchievementDef | null;
  onClose: () => void;
}

export default function AchievementDetailSheet({
  achievement,
  onClose,
}: AchievementDetailSheetProps) {
  const { isUnlocked, getProgress, state } = useAchievements();
  const { playerData } = usePlayer();
  const open = !!achievement;
  const now = useMemo(() => Date.now(), [achievement?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!achievement) {
    return (
      <BottomSheet open={false} onClose={onClose}>
        {null}
      </BottomSheet>
    );
  }

  const tier = TIER_COLOR[achievement.tier];
  const unlocked = isUnlocked(achievement.id);
  const hidden = achievement.secret && !unlocked;
  const progress = getProgress(achievement.id);
  const unlockedEntry = state.unlocked.find((u) => u.id === achievement.id);

  return (
    <BottomSheet open={open} onClose={onClose} title="Досягнення">
      <div className="space-y-4 text-center">
        <div
          className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl text-4xl ring-2 ${
            unlocked
              ? `${tier.bg} ring-white/10 ${tier.glow}`
              : "bg-[#1a0a2e] ring-white/10 grayscale opacity-60"
          }`}
        >
          {hidden ? "❓" : achievement.icon}
        </div>

        <div className="space-y-1">
          <p
            className={`text-[10px] font-black uppercase tracking-widest ${tier.text}`}
          >
            {tier.label} · {CATEGORY_LABEL[achievement.category]}
          </p>
          <h3 className="text-xl font-black uppercase text-white">
            {hidden ? "Прихована" : achievement.title}
          </h3>
          <p className="text-sm text-slate-300">
            {hidden ? "Виконай певну дію, щоб дізнатись опис." : achievement.description}
          </p>
        </div>

        {!unlocked && !hidden && (
          <div className="rounded-2xl border border-white/10 bg-[#1a0a2e] p-3">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
              Прогрес
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#facc15] to-[#f97316]"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-bold tabular-nums text-slate-300">
              {progress.current} / {progress.target}
            </p>
          </div>
        )}

        {unlocked && unlockedEntry && (
          <p className="text-xs font-bold text-slate-300">
            Розблоковано {formatRelativeTime(unlockedEntry.unlockedAt, now)}
          </p>
        )}

        {achievement.xpReward !== undefined && (
          <div className={`inline-block rounded-xl border border-[#facc15]/30 bg-[#facc15]/10 px-3 py-1.5 text-xs font-black uppercase text-[#facc15]`}>
            +{achievement.xpReward} XP
          </div>
        )}

        {unlocked && (
          <ShareButton
            payload={() =>
              shareAchievementPreset(achievement, playerData?.name)
            }
            variant="pill"
            size="md"
            label="Поділитися"
            className="w-full justify-center"
            ariaLabel={`Поділитися досягненням ${achievement.title}`}
          />
        )}
      </div>
    </BottomSheet>
  );
}
