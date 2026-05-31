import type {
  BrawlerInfo,
  ClubInfo,
  PlayerStats,
  SavedAdvice,
  TrophyGoal,
} from "../types";
import type { AchievementDef } from "../data/achievements";
import { buildPlayerShareUrl, getBaseUrl, type ShareDataPayload } from "./share";
import { getCurrentShareableUrl, getShareableUrl } from "../navigation/urlState";
import type { ComparisonResult } from "./compareMetrics";

function cleanTag(tag: string): string {
  return tag.trim().replace(/^#+/, "");
}

function urlWithParams(
  tag: string,
  extra?: Record<string, string>
): string {
  const base = buildPlayerShareUrl(tag);
  if (!extra) return base;
  const sep = base.includes("?") ? "&" : "?";
  const qs = Object.entries(extra)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return qs ? `${base}${sep}${qs}` : base;
}

export function sharePlayerPreset(player: PlayerStats): ShareDataPayload {
  const club = player.club?.name ? `Клуб: ${player.club.name}\n` : "";
  return {
    title: `${player.name} — Brawl Stats`,
    text:
      `🏆 ${player.name} (${player.tag})\n` +
      `${player.trophies.toLocaleString("uk-UA")} кубків · Lvl ${player.expLevel}\n` +
      `${club}Переглянь профіль:`,
    url: buildPlayerShareUrl(player.tag),
  };
}

export function shareBrawlerPreset(
  brawler: BrawlerInfo,
  player: { name: string; tag: string }
): ShareDataPayload {
  return {
    title: `${brawler.name} — ${player.name}`,
    text:
      `🎯 ${brawler.name}\n` +
      `⚡ Power ${brawler.power} · 🏆 ${brawler.trophies.toLocaleString("uk-UA")} кубків\n` +
      `Гравець: ${player.name}`,
    url: urlWithParams(player.tag, {
      tab: "stats",
      brawler: String(brawler.id),
    }),
  };
}

export function shareAchievementPreset(
  achievement: AchievementDef,
  playerName?: string
): ShareDataPayload {
  const who = playerName ? `${playerName} ` : "";
  const base = getBaseUrl();
  return {
    title: `🏆 ${achievement.title} — Brawl Stats`,
    text:
      `${who}розблокував(ла) досягнення «${achievement.title}»\n` +
      `${achievement.description}` +
      (achievement.xpReward ? `\n+${achievement.xpReward} XP` : ""),
    url: `${base}/?tab=settings&achievement=${encodeURIComponent(achievement.id)}`,
  };
}

export function shareGoalAchievedPreset(
  goal: TrophyGoal,
  player?: { name: string; tag: string }
): ShareDataPayload {
  const lines: string[] = [];
  lines.push(
    `🏆 Підкорив ${goal.targetTrophies.toLocaleString("uk-UA")} кубків!`
  );
  if (goal.label) lines.push(goal.label);
  if (goal.reward) lines.push(`🎁 ${goal.reward}`);
  return {
    title: `🏆 Ціль досягнута — ${goal.targetTrophies.toLocaleString("uk-UA")} кубків`,
    text: lines.join("\n"),
    url: player ? buildPlayerShareUrl(player.tag) : getBaseUrl(),
  };
}

export function shareStreakPreset(
  currentStreak: number,
  longestStreak?: number
): ShareDataPayload {
  const ext =
    longestStreak && longestStreak > currentStreak
      ? `\nРекорд: ${longestStreak} днів`
      : "";
  return {
    title: `🔥 Streak ${currentStreak} днів — Brawl Stats`,
    text: `Я тримаю streak ${currentStreak} днів у Brawl Stats!${ext}`,
    url: getBaseUrl(),
  };
}

export function shareAppPreset(): ShareDataPayload {
  return {
    title: "Brawl Stats — статистика Brawl Stars",
    text: "🎮 Спробуй Brawl Stats — швидкий перегляд профілю, цілі та досягнення.",
    url: getBaseUrl(),
  };
}

export function shareAdvicePreset(advice: SavedAdvice): ShareDataPayload {
  const presetLabel = advice.presetTitle ? `🤖 ${advice.presetTitle}` : "🤖 AI порада";
  const plainPreview = advice.advice
    .replace(/[#*_>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  return {
    title: `Поради AI Coach для ${advice.playerName}`,
    text: `${presetLabel}\n\n${plainPreview}${plainPreview.length >= 240 ? "…" : ""}`,
    url: getShareableUrl({
      tab: "stats",
      tag: cleanTag(advice.playerTag),
      advice: advice.id,
    }),
  };
}

export function shareClubPreset(club: ClubInfo): ShareDataPayload {
  const memberCount = club.members?.length ?? 0;
  const url = getShareableUrl({ club: cleanTag(club.tag) });
  return {
    title: `${club.name} — клуб у Brawl Stars`,
    text:
      `🏰 ${club.name} (${club.tag})\n` +
      `${club.trophies.toLocaleString("uk-UA")} кубків · ${memberCount} учасників\n` +
      `Вимога: ${club.requiredTrophies.toLocaleString("uk-UA")}+`,
    url,
  };
}

export function shareComparisonPreset(
  result: ComparisonResult
): ShareDataPayload {
  const { playerA, playerB, overall } = result;
  const winnerName =
    overall.winner === "a"
      ? playerA.name
      : overall.winner === "b"
      ? playerB.name
      : "нічия";
  const tagA = cleanTag(playerA.tag);
  const tagB = cleanTag(playerB.tag);
  const url = getShareableUrl({
    tab: "stats",
    tag: tagA,
    compare: tagB,
  });
  return {
    title: "Порівняння у Brawl Stars",
    text:
      `⚔️ ${playerA.name} vs ${playerB.name}\n` +
      `🏆 Переможець: ${overall.winner === "tie" ? "🤝 нічия" : winnerName}\n` +
      `${playerA.trophies.toLocaleString("uk-UA")} vs ${playerB.trophies.toLocaleString("uk-UA")} кубків`,
    url,
  };
}

/**
 * Share whatever screen the user is currently viewing (preserves tab/tag/brawler
 * params in the URL). The text is contextual based on player presence.
 */
export function shareCurrentScreenPreset(
  player?: PlayerStats | null
): ShareDataPayload {
  const url = getCurrentShareableUrl();
  const text = player
    ? `🏆 ${player.name} — ${player.trophies.toLocaleString("uk-UA")} кубків у Brawl Stats`
    : "🎮 Brawl Stats — статистика Brawl Stars";
  return {
    title: player ? `${player.name} — Brawl Stats` : "Brawl Stats",
    text,
    url,
  };
}

export { cleanTag };
