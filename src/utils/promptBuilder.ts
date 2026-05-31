/**
 * Утиліти для побудови змінних і підстановки у preset-темплейти AI-Тренера.
 *
 * Тримаємо чистим TS без React-залежностей, щоб обидва (клієнт і `server.ts`)
 * могли імпортувати ту саму логіку.
 */

import type { BrawlerInfo, PlayerStats } from "../types";

export type PromptVariables = Record<string, string>;

const MAX_LIST_ITEMS = 12;

function formatBrawler(b: BrawlerInfo): string {
  return `${b.name} (lvl ${b.power}, ${b.trophies}🏆)`;
}

function topByTrophies(
  brawlers: BrawlerInfo[] | undefined,
  limit: number
): BrawlerInfo[] {
  if (!Array.isArray(brawlers)) return [];
  return [...brawlers].sort((a, b) => b.trophies - a.trophies).slice(0, limit);
}

/**
 * Витягує всі стандартні змінні з playerData + опційного brawler.
 * Усі значення — рядки (готові до підстановки у темплейт).
 */
export function buildPromptVariables(
  playerData: PlayerStats | null | undefined,
  brawler?: BrawlerInfo | null
): PromptVariables {
  const brawlers: BrawlerInfo[] = Array.isArray(playerData?.brawlers)
    ? playerData!.brawlers
    : [];

  const topBrawlers = topByTrophies(brawlers, 5).map(formatBrawler).join(", ");
  const allBrawlers = topByTrophies(brawlers, MAX_LIST_ITEMS)
    .map(formatBrawler)
    .join(", ");
  const lowPower = brawlers
    .filter((b) => b.power < 9)
    .slice(0, MAX_LIST_ITEMS)
    .map(formatBrawler)
    .join(", ");
  const p11Brawlers = brawlers
    .filter((b) => b.power >= 11)
    .slice(0, MAX_LIST_ITEMS)
    .map(formatBrawler)
    .join(", ");

  const today = new Date();
  const date = today.toLocaleDateString("uk-UA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const vars: PromptVariables = {
    name: playerData?.name ?? "Гравець",
    trophies: String(playerData?.trophies ?? 0),
    highestTrophies: String(playerData?.highestTrophies ?? 0),
    expLevel: String(playerData?.expLevel ?? 0),
    v3: String(playerData?.["3vs3Victories"] ?? 0),
    solo: String(playerData?.soloVictories ?? 0),
    duo: String(playerData?.duoVictories ?? 0),
    topBrawlers: topBrawlers || "немає даних",
    allBrawlers: allBrawlers || "немає даних",
    lowPower: lowPower || "усі вже прокачані",
    p11Brawlers: p11Brawlers || "ще немає бійців на p11",
    date,
    clubName: playerData?.club?.name ?? "—",
  };

  if (brawler) {
    vars.brawlerName = brawler.name;
    vars.brawlerPower = String(brawler.power);
    vars.brawlerTrophies = String(brawler.trophies);
    vars.brawlerHighest = String(brawler.highestTrophies);
    vars.brawlerRank = String(brawler.rank);
  }

  return vars;
}

const PLACEHOLDER_RE = /\{(\w+)\}/g;

/**
 * Заміняє `{key}` на значення з `vars`. Якщо ключа немає — лишає плейсхолдер
 * у вигляді `[невідомо]` щоб промпт залишався читабельним.
 */
export function fillTemplate(template: string, vars: PromptVariables): string {
  return template.replace(PLACEHOLDER_RE, (_, key: string) => {
    const v = vars[key];
    return v && v.length > 0 ? v : "[невідомо]";
  });
}
