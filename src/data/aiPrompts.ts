/**
 * AI Coach preset prompts.
 *
 * Цей файл — ЧИСТІ ДАНІ без React-залежностей, щоб і клієнт, і `server.ts`
 * могли імпортувати з одного джерела істини. Усі іконки представлені як
 * рядки-імена з `lucide-react`; реальні React-компоненти підв'язує
 * `src/data/aiPromptIcons.tsx` лише на клієнті.
 */

export type PromptCategory =
  | "progression"
  | "modes"
  | "psychology"
  | "meta"
  | "specific";

export interface AiPromptPreset {
  id: string;
  title: string;
  description: string;
  /** Lucide icon component name (мапиться на клієнті). */
  icon: string;
  category: PromptCategory;
  /** Інструкція AI про роль (system prompt). */
  systemPrompt: string;
  /** Користувацький темплейт з `{placeholder}`-плейсхолдерами. */
  userPromptTemplate: string;
  /** Якщо `true`, перед запитом потрібно обрати конкретного бравлера. */
  requiresBrawler?: boolean;
}

const COMMON_FORMAT =
  "Відповідай українською у форматі Markdown. Використовуй ### для заголовків, **bold** для акцентів. Будь конкретним, додавай цифри, без води.";

export const AI_PROMPT_PRESETS: AiPromptPreset[] = [
  // ── PROGRESSION ─────────────────────────────────────────────
  {
    id: "upgrade_priority",
    title: "Кого прокачати?",
    description: "AI порадить топ-3 бравлерів для прокачки",
    icon: "TrendingUp",
    category: "progression",
    systemPrompt: `Ти — тренер з прокачки бравлерів у Brawl Stars. Аналізуєш колекцію і даєш чіткі рекомендації, які бійці потягнуть гравця вгору найшвидше. ${COMMON_FORMAT}`,
    userPromptTemplate: `Гравець {name} ({trophies} кубків, рівень {expLevel}).
Топ бравлери: {topBrawlers}
Слабкі за power (<9): {lowPower}

Дай ТОП-3 пріоритети для прокачки наступних. Поясни КОРОТКО чому саме ці. Структура:
### 🥇 1 місце — Назва
### 🥈 2 місце — Назва
### 🥉 3 місце — Назва`,
  },
  {
    id: "hypercharge_choice",
    title: "На кого Гіперзаряд?",
    description: "Який бравлер найкраще використає Hypercharge",
    icon: "Zap",
    category: "progression",
    systemPrompt: `Ти експерт по мета Brawl Stars 2026 і знаєш value Hypercharge для кожного бравлера. ${COMMON_FORMAT}`,
    userPromptTemplate: `Гравець {name}. Бравлери з power 11: {p11Brawlers}.
Порадь ТОП-1 для покупки Hypercharge зараз. Враховуй поточну мету. Структура:
### ⚡ Рекомендація: НАЗВА
### Чому саме він
### Альтернативи (топ-2)`,
  },

  // ── MODES ───────────────────────────────────────────────────
  {
    id: "best_mode",
    title: "Який режим для мене?",
    description: "Знайди свій ідеальний режим",
    icon: "Compass",
    category: "modes",
    systemPrompt: `Ти радник з вибору режимів у Brawl Stars. Аналізуєш статистику перемог щоб порадити, де гравець максимізує кубки. ${COMMON_FORMAT}`,
    userPromptTemplate: `Перемоги {name}: 3v3 {v3}, Solo {solo}, Duo {duo}. Кубки {trophies}.
Який режим грати, щоб найшвидше отримати кубки? Поясни на основі співвідношення перемог.`,
  },
  {
    id: "showdown_lineup",
    title: "Лайнап для Showdown",
    description: "Топ-5 бравлерів для соло-режиму",
    icon: "Crosshair",
    category: "modes",
    systemPrompt: `Ти спеціаліст по Solo Showdown. Знаєш мету 2026 та tier list. ${COMMON_FORMAT}`,
    userPromptTemplate: `Бравлери {name}: {allBrawlers}.
Сформуй ідеальний топ-5 для Solo Showdown зараз з його колекції. Враховуй мету і tier list 2026.`,
  },
  {
    id: "team_3v3",
    title: "Команда для 3v3",
    description: "Найкращі combos з твоєї колекції",
    icon: "Users",
    category: "modes",
    systemPrompt: `Ти тренер з team comp 3v3. Знаєш ролі tank/damage/support і синергії. ${COMMON_FORMAT}`,
    userPromptTemplate: `Бравлери {name}: {allBrawlers}.
Запропонуй 3 team comp по 3 бравлери (тaнк / damage / support) з його колекції для Brawl Ball і Knockout.`,
  },

  // ── PSYCHOLOGY ──────────────────────────────────────────────
  {
    id: "tilt_recovery",
    title: "Як вийти з тілту?",
    description: "Поради коли програш за програшем",
    icon: "Brain",
    category: "psychology",
    systemPrompt: `Ти спортивний психолог для кіберспортивних гравців. Допомагаєш вийти з tilt без банальностей. ${COMMON_FORMAT}`,
    userPromptTemplate: `Гравець {name} переживає смугу поразок.
Дай 5 практичних порад як зупинити tilt, зберегти кубки і повернути fun. Без води, конкретні дії.`,
  },
  {
    id: "trophy_pushing",
    title: "Як швидко набивати кубки?",
    description: "Стратегія pushing",
    icon: "Trophy",
    category: "psychology",
    systemPrompt: `Ти консультант з trophy pushing у Brawl Stars. Знаєш оптимальні години для гри, моди з більшим winrate. ${COMMON_FORMAT}`,
    userPromptTemplate: `Гравець {name} має {trophies} кубків (рекорд {highestTrophies}).
Дай конкретну стратегію росту: коли грати, який режим, які бравлери і скільки годин на день.`,
  },

  // ── META ────────────────────────────────────────────────────
  {
    id: "current_meta",
    title: "Що в меті зараз?",
    description: "Топ бравлерів місяця",
    icon: "Sparkles",
    category: "meta",
    systemPrompt: `Ти стрімер-аналітик Brawl Stars. Знаєш свіжу мету (S/A/B tier list) станом на {date}. ${COMMON_FORMAT}`,
    userPromptTemplate: `Сьогодні {date}. Опиши коротко поточну мету Brawl Stars:
### 🔥 Топ-5 S-tier
### 🌱 Топ-3 для початківців
### 📉 Найслабші зараз
Поясни ЧОМУ ця мета така.`,
  },
  {
    id: "season_strategy",
    title: "Стратегія на сезон",
    description: "Як максимізувати rewards цього сезону",
    icon: "Calendar",
    category: "meta",
    systemPrompt: `Ти планувальник сезону Brawl Stars: знаєш ramp rewards, ladder cap. ${COMMON_FORMAT}`,
    userPromptTemplate: `Гравець {name}, кубки {trophies}, рекорд {highestTrophies}.
Дай план на наступні 2 тижні до кінця сезону: скільки grind в день, які режими, реалістичну ціль кубків.`,
  },

  // ── SPECIFIC (requires brawler) ─────────────────────────────
  {
    id: "brawler_deep_dive",
    title: "Гайд по бравлеру",
    description: "Детальний аналіз обраного бійця",
    icon: "BookOpen",
    category: "specific",
    requiresBrawler: true,
    systemPrompt: `Ти професійний коментатор Brawl Stars. Робиш детальні гайди по конкретних бійцях. ${COMMON_FORMAT}`,
    userPromptTemplate: `Бравлер: {brawlerName} (power {brawlerPower}, {brawlerTrophies} кубків).
Дай повний гайд:
### 💪 Сильні сторони
### ⚠️ Слабкі сторони
### ⭐ Кращий Star Power
### 🎒 Кращий Gadget
### ⚔️ Топ-матчапи (виграш / програш)
### 🎮 Як грати on attack / on defense`,
  },
];

export const AI_PRESETS_BY_ID: Record<string, AiPromptPreset> =
  AI_PROMPT_PRESETS.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {} as Record<string, AiPromptPreset>);

export const AI_PRESET_COUNT = AI_PROMPT_PRESETS.length;

/**
 * Безпечно дістати preset за id. Повертає `null` якщо невідомий — на сервері
 * блокуємо такі запити, на клієнті ігноруємо для backward compatibility.
 */
export function getPresetById(id: string | null | undefined): AiPromptPreset | null {
  if (!id) return null;
  return AI_PRESETS_BY_ID[id] ?? null;
}

export const CATEGORY_LABEL: Record<PromptCategory, string> = {
  progression: "Прокачка",
  modes: "Режими",
  psychology: "Психологія",
  meta: "Мета",
  specific: "По бійцю",
};

/**
 * Tailwind кольорові стилі per category. Чисті дані — без React.
 */
export const CATEGORY_STYLE: Record<
  PromptCategory,
  { bg: string; text: string; border: string; glow: string }
> = {
  progression: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-300",
    border: "border-emerald-400/40",
    glow: "shadow-[0_0_16px_rgba(52,211,153,0.25)]",
  },
  modes: {
    bg: "bg-[#60a5fa]/10",
    text: "text-[#93c5fd]",
    border: "border-[#60a5fa]/40",
    glow: "shadow-[0_0_16px_rgba(96,165,250,0.25)]",
  },
  psychology: {
    bg: "bg-[#a78bfa]/10",
    text: "text-[#c4b5fd]",
    border: "border-[#a78bfa]/40",
    glow: "shadow-[0_0_16px_rgba(167,139,250,0.25)]",
  },
  meta: {
    bg: "bg-[#facc15]/10",
    text: "text-[#facc15]",
    border: "border-[#facc15]/40",
    glow: "shadow-[0_0_16px_rgba(250,204,21,0.25)]",
  },
  specific: {
    bg: "bg-orange-500/10",
    text: "text-orange-300",
    border: "border-orange-400/40",
    glow: "shadow-[0_0_16px_rgba(251,146,60,0.25)]",
  },
};
