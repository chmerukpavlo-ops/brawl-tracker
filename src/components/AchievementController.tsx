import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence } from "motion/react";
import {
  getAchievementNotifications,
  trackAchievementEvent,
  useAchievements,
} from "../hooks/useAchievements";
import { ACHIEVEMENTS_BY_ID } from "../data/achievements";
import { haptic } from "../hooks/useHaptic";
import AchievementUnlockToast from "./AchievementUnlockToast";
import { updateUrl } from "../navigation/urlState";
import { usePlayer } from "../context/PlayerContext";
import { achievementUnlockedPreset } from "../utils/notificationPresets";

let appOpenFired = false;

export default function AchievementController() {
  const { unseenUnlocks, markSeen } = useAchievements();
  const { notifications } = usePlayer();

  // The notifications object is rebuilt by `useNotifications` on every
  // permission / state change. Keeping it in the unlock-effect deps
  // would re-fire `showNotification` (and the haptic) every time —
  // duplicate OS-level notifications, multiple buzzes per unlock. The
  // ref pattern lets us read the latest value without re-subscribing.
  const notificationsRef = useRef(notifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (appOpenFired) return;
    appOpenFired = true;
    trackAchievementEvent("app_open", { hour: new Date().getHours() });
  }, []);

  const head = unseenUnlocks[0] ?? null;
  const headId = head?.id ?? null;
  const def = headId ? ACHIEVEMENTS_BY_ID[headId] ?? null : null;
  const defId = def?.id ?? null;

  // Side-effect (haptic + OS push). We depend ONLY on the primitive
  // `headId` / `defId` so a parent re-render that produces a fresh
  // `head` object reference (same id) doesn't re-trigger the effect.
  useEffect(() => {
    if (!headId) return;
    if (!getAchievementNotifications()) {
      markSeen(headId);
      return;
    }
    haptic.success();
    if (def) {
      notificationsRef.current.showNotification(achievementUnlockedPreset(def));
    }
    // `def` is intentionally read inside the effect rather than added
    // to deps — `defId` already gates the re-run, and `def` is
    // resolved synchronously from the same id, so reading it directly
    // can't go stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headId, defId, markSeen]);

  // Stable callbacks — passed into the toast which auto-dismisses on
  // a 5 s timer. Without `useCallback` every parent render produced a
  // new arrow function, the toast's effect re-ran, the timeout was
  // cleared and re-scheduled → the toast appeared to "stick" forever.
  const handleDismiss = useCallback(() => {
    if (headId) markSeen(headId);
  }, [headId, markSeen]);

  const handleTap = useCallback(() => {
    if (defId) updateUrl({ achievement: defId, tab: "settings" });
  }, [defId]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[55] mx-auto flex w-full max-w-[430px] flex-col gap-2 px-3"
      style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {head && def && (
          <AchievementUnlockToast
            key={head.id}
            achievement={def}
            onDismiss={handleDismiss}
            onTap={handleTap}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
