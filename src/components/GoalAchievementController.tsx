import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import {
  getAutoGoalsEnabled,
  getOverlayEnabled,
  getProgress,
  useAutoGoalsEnabled,
  useGoals,
  useOverlayEnabled,
} from "../hooks/useGoals";
import type { TrophyGoal } from "../types";
import { haptic } from "../hooks/useHaptic";
import { goalProgressPreset } from "../utils/notificationPresets";
import CelebrationOverlay from "./CelebrationOverlay";

function pickPrimary(goals: TrophyGoal[]): TrophyGoal | null {
  if (goals.length === 0) return null;
  return goals.reduce((best, g) =>
    g.targetTrophies > best.targetTrophies ? g : best
  );
}

export default function GoalAchievementController() {
  const { playerData, lastUpdated, notifications, openNotificationsConsent } = usePlayer();
  const { showSuccess } = useToast();
  const { processTrophyUpdate, goals: allGoals } = useGoals();
  useAutoGoalsEnabled();
  useOverlayEnabled();

  const [queue, setQueue] = useState<TrophyGoal[]>([]);
  const lastProcessedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playerData || !lastUpdated) return;
    if (lastProcessedRef.current === lastUpdated) return;
    lastProcessedRef.current = lastUpdated;

    const autoEnabled = getAutoGoalsEnabled();
    const overlayEnabled = getOverlayEnabled();
    const { achievedNow } = processTrophyUpdate(
      playerData.tag,
      playerData.trophies,
      autoEnabled
    );

    // 90%+ progress notification for any active goal on this tag.
    const tagKey = playerData.tag.replace(/^#+/, "").toUpperCase();
    for (const g of allGoals) {
      if (g.achievedAt) continue;
      if (g.tag.replace(/^#+/, "").toUpperCase() !== tagKey) continue;
      const progress = getProgress(g, playerData.trophies);
      if (progress.percentage < 90 || progress.isAchieved) continue;
      if (notifications.hasNotifiedGoal(g.id)) continue;
      const sent = notifications.showNotification(
        goalProgressPreset(g, playerData.trophies)
      );
      if (sent) {
        notifications.markGoalNotified(g.id);
      }
    }

    if (achievedNow.length === 0) return;

    haptic.success();

    // First-goal-achieved → friendly consent prompt for future progress pings.
    if (notifications.shouldPromptUser() && achievedNow.length > 0) {
      openNotificationsConsent("first_goal");
    }

    if (overlayEnabled) {
      const primary = pickPrimary(achievedNow);
      const rest = achievedNow.filter((g) => g.id !== primary?.id);
      if (primary) {
        setQueue((q) => [...q, primary]);
      }
      rest.forEach((g) => {
        showSuccess(
          `🎯 Досягнута ціль: ${g.targetTrophies.toLocaleString("uk-UA")}`,
          { duration: 5000 }
        );
      });
    } else {
      achievedNow.forEach((g) => {
        showSuccess(
          `🎯 Досягнута ціль: ${g.targetTrophies.toLocaleString("uk-UA")}`,
          { duration: 5000 }
        );
      });
    }
  }, [playerData, lastUpdated, processTrophyUpdate, showSuccess, notifications, openNotificationsConsent, allGoals]);

  const current = queue[0] ?? null;
  const handleClose = () => setQueue((q) => q.slice(1));

  return (
    <CelebrationOverlay
      goal={current}
      playerName={playerData?.name}
      playerTag={playerData?.tag}
      onClose={handleClose}
    />
  );
}
