import { useEffect, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useDailyCheckin, type Milestone } from "../hooks/useDailyCheckin";
import { haptic } from "../hooks/useHaptic";
import { trackAchievementEvent } from "../hooks/useAchievements";
import { streakReminderPreset } from "../utils/notificationPresets";
import StreakCelebrationSheet from "./StreakCelebrationSheet";

let sessionConsumed = false;
let reminderScheduled = false;

const REGULAR_DELAY_MS = 1500;
const FIRST_EVER_DELAY_MS = 5000;

function vibrateMilestone(): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([50, 100, 50, 100, 100]);
    }
  } catch {
    /* ignore */
  }
}

export default function DailyCheckinController() {
  const { checkIn, state } = useDailyCheckin();
  const { setActiveTab, notifications, openNotificationsConsent } = usePlayer();
  const { showSuccess, showInfo } = useToast();
  const [celebrationMilestone, setCelebrationMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    if (sessionConsumed) return;
    sessionConsumed = true;

    const result = checkIn();
    if (!result.isFirstToday) return;

    trackAchievementEvent("streak_check", { streak: result.newStreak });

    // Schedule a streak reminder for tomorrow at 20:00 — fires only if the
    // tab is still alive (foreground-only until #34 service worker lands).
    if (!reminderScheduled && notifications.permission === "granted") {
      reminderScheduled = true;
      const tomorrow8pm = new Date();
      tomorrow8pm.setDate(tomorrow8pm.getDate() + 1);
      tomorrow8pm.setHours(20, 0, 0, 0);
      notifications.scheduleAt(
        streakReminderPreset(result.newStreak),
        tomorrow8pm.getTime()
      );
    }

    // Streak milestone (>= 7) is a great moment to surface the consent prompt.
    if (
      result.newStreak >= 7 &&
      !result.milestoneReached &&
      notifications.shouldPromptUser()
    ) {
      window.setTimeout(() => {
        openNotificationsConsent("streak_milestone");
      }, REGULAR_DELAY_MS);
    }

    if (result.brokenStreak >= 7) {
      window.setTimeout(() => {
        showInfo(
          `З поверненням! Твій streak скинуто (попередній: ${result.brokenStreak}). Почнімо знову!`,
          { duration: 6000 }
        );
      }, REGULAR_DELAY_MS);
    }

    if (result.milestoneReached) {
      window.setTimeout(() => {
        vibrateMilestone();
        setCelebrationMilestone(result.milestoneReached);
      }, REGULAR_DELAY_MS);
      return;
    }

    const delay = result.isFirstEver ? FIRST_EVER_DELAY_MS : REGULAR_DELAY_MS;
    if (result.isFirstEver) {
      window.setTimeout(() => {
        haptic.success();
        showInfo("Раді тебе бачити! Заходь щодня — будуть бонуси 🔥", {
          duration: 5000,
        });
      }, delay);
      return;
    }

    window.setTimeout(() => {
      haptic.success();
      showSuccess(`🔥 Day ${result.newStreak} streak! +${result.gainedXp} XP`, {
        duration: 4500,
        action: {
          label: "Деталі",
          onClick: () => setActiveTab("settings"),
        },
      });
    }, delay);
  }, [checkIn, showSuccess, showInfo, setActiveTab, notifications, openNotificationsConsent]);

  return (
    <StreakCelebrationSheet
      milestone={celebrationMilestone}
      streak={state.currentStreak}
      onClose={() => setCelebrationMilestone(null)}
    />
  );
}
