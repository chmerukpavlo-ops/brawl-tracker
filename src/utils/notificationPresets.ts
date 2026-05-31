import type { TrophyGoal } from "../types";
import type { AchievementDef } from "../data/achievements";

/**
 * Cross-locale-friendly notification payload.
 *
 * `tag` deduplicates: if a notification with the same `tag` is already
 * displayed, the browser will replace it instead of stacking. We always set
 * one to keep the notification stream tidy.
 *
 * `data.url` is consumed by `useNotifications#handleClick` to deep-link
 * back into the app on click.
 */
export interface NotificationPayload {
  title: string;
  body?: string;
  tag: string;
  /** Notification type; gates delivery against per-type user preferences. */
  type:
    | "streakReminder"
    | "goalProgress"
    | "favoritesUpdate"
    | "weeklyDigest"
    | "achievements"
    | "test";
  /** Bypasses quiet hours when true (used by streak rescue reminders). */
  bypassQuietHours?: boolean;
  /** Native `requireInteraction` — keeps the toast visible until dismissed. */
  requireInteraction?: boolean;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
}

const ICON_PATH = "/favicon.svg";

function baseIcons() {
  return { icon: ICON_PATH, badge: ICON_PATH };
}

export function streakReminderPreset(currentStreak: number): NotificationPayload {
  return {
    type: "streakReminder",
    title: `🔥 Streak: ${currentStreak} ${currentStreak === 1 ? "день" : "дн."}`,
    body: "Не загуби свою серію — відкрий додаток, щоб зарахувати сьогодні.",
    tag: "streak-reminder",
    bypassQuietHours: false,
    data: { url: "/", ...baseIcons() },
  };
}

export function goalProgressPreset(
  goal: TrophyGoal,
  currentTrophies: number
): NotificationPayload {
  const remaining = Math.max(0, goal.targetTrophies - currentTrophies);
  return {
    type: "goalProgress",
    title: "🎯 Майже у цілі!",
    body: `${remaining.toLocaleString("uk-UA")} кубків до ${goal.targetTrophies.toLocaleString(
      "uk-UA"
    )}`,
    tag: `goal-${goal.id}`,
    data: {
      url: `/?tab=stats&tag=${goal.tag.replace(/^#+/, "").toUpperCase()}`,
      ...baseIcons(),
    },
  };
}

export function favoriteRecordPreset(
  playerName: string,
  tag: string,
  newTrophies: number
): NotificationPayload {
  const safeTag = tag.replace(/^#+/, "").toUpperCase();
  return {
    type: "favoritesUpdate",
    title: `🏆 ${playerName} побив рекорд!`,
    body: `Новий рекорд: ${newTrophies.toLocaleString("uk-UA")} кубків`,
    tag: `record-${safeTag}`,
    data: { url: `/?tag=${safeTag}`, ...baseIcons() },
  };
}

export function achievementUnlockedPreset(
  achievement: AchievementDef
): NotificationPayload {
  return {
    type: "achievements",
    title: `${achievement.icon} Досягнення!`,
    body: achievement.title,
    tag: `achievement-${achievement.id}`,
    data: {
      url: `/?tab=settings&achievement=${achievement.id}`,
      ...baseIcons(),
    },
  };
}

export function weeklyDigestPreset(summary: {
  trophiesGained: number;
  topBrawler?: string;
}): NotificationPayload {
  return {
    type: "weeklyDigest",
    title: "📊 Тижневий звіт",
    body: summary.topBrawler
      ? `${summary.trophiesGained > 0 ? "+" : ""}${summary.trophiesGained} кубків · ${
          summary.topBrawler
        }`
      : `${summary.trophiesGained > 0 ? "+" : ""}${summary.trophiesGained} кубків за тиждень`,
    tag: "weekly-digest",
    data: { url: "/?tab=stats", ...baseIcons() },
  };
}

export function testPreset(): NotificationPayload {
  return {
    type: "test",
    title: "🔔 Тестове сповіщення",
    body: "Якщо ти це бачиш — все працює.",
    tag: "test-notification",
    bypassQuietHours: true,
    data: { url: "/?tab=settings", ...baseIcons() },
  };
}
