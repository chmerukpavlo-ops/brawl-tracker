export type AchievementCategory =
  | "exploration"
  | "mastery"
  | "collection"
  | "social"
  | "streak"
  | "special";

export type AchievementTier = "bronze" | "silver" | "gold" | "diamond";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: AchievementTier;
  target: number;
  xpReward?: number;
  secret?: boolean;
}

export const TIER_COLOR: Record<
  AchievementTier,
  { hex: string; glow: string; border: string; text: string; bg: string; label: string }
> = {
  bronze: {
    hex: "#cd7f32",
    glow: "shadow-[0_0_18px_rgba(205,127,50,0.35)]",
    border: "border-[#cd7f32]/50",
    text: "text-[#e0a572]",
    bg: "bg-[#cd7f32]/10",
    label: "Бронза",
  },
  silver: {
    hex: "#c0c0c0",
    glow: "shadow-[0_0_18px_rgba(192,192,192,0.35)]",
    border: "border-slate-300/50",
    text: "text-slate-200",
    bg: "bg-slate-300/10",
    label: "Срібло",
  },
  gold: {
    hex: "#ffd700",
    glow: "shadow-[0_0_22px_rgba(255,215,0,0.4)]",
    border: "border-[#ffd700]/60",
    text: "text-[#facc15]",
    bg: "bg-[#facc15]/10",
    label: "Золото",
  },
  diamond: {
    hex: "#b9f2ff",
    glow: "shadow-[0_0_28px_rgba(185,242,255,0.45)]",
    border: "border-[#b9f2ff]/60",
    text: "text-[#a5f3fc]",
    bg: "bg-cyan-200/10",
    label: "Діамант",
  },
};

export const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  exploration: "Дослідження",
  mastery: "Майстерність",
  collection: "Колекція",
  social: "Соціальне",
  streak: "Streak",
  special: "Спеціальні",
};

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── EXPLORATION ──────────────────────────────────────────────
  {
    id: "first_search",
    title: "Перший крок",
    description: "Знайди першого гравця",
    icon: "🔍",
    category: "exploration",
    tier: "bronze",
    target: 1,
    xpReward: 25,
  },
  {
    id: "search_10",
    title: "Дослідник",
    description: "10 успішних пошуків",
    icon: "🗺️",
    category: "exploration",
    tier: "silver",
    target: 10,
    xpReward: 75,
  },
  {
    id: "search_50",
    title: "Аналітик",
    description: "50 пошуків гравців",
    icon: "📊",
    category: "exploration",
    tier: "gold",
    target: 50,
    xpReward: 200,
  },
  {
    id: "search_200",
    title: "Маньяк статистики",
    description: "200 пошуків гравців",
    icon: "🧠",
    category: "exploration",
    tier: "diamond",
    target: 200,
    xpReward: 1000,
  },
  {
    id: "search_demo_all",
    title: "Demo-режим",
    description: "Спробуй demo-режим",
    icon: "🧪",
    category: "exploration",
    tier: "bronze",
    target: 1,
    xpReward: 15,
  },

  // ── MASTERY ──────────────────────────────────────────────────
  {
    id: "first_ai_advice",
    title: "AI вчиться",
    description: "Отримай першу пораду від AI-тренера",
    icon: "🤖",
    category: "mastery",
    tier: "bronze",
    target: 1,
    xpReward: 25,
  },
  {
    id: "ai_advice_10",
    title: "Тренувальний партнер",
    description: "10 запитів до AI-тренера",
    icon: "🧙",
    category: "mastery",
    tier: "silver",
    target: 10,
    xpReward: 100,
  },
  {
    id: "copy_tag",
    title: "Скопіюй тег",
    description: "Скопіюй тег вперше",
    icon: "📋",
    category: "mastery",
    tier: "bronze",
    target: 1,
    xpReward: 10,
  },
  {
    id: "share_first",
    title: "Шейр-майстер",
    description: "Поділись профілем вперше",
    icon: "📤",
    category: "mastery",
    tier: "bronze",
    target: 1,
    xpReward: 20,
  },
  {
    id: "compare_first",
    title: "Compare King",
    description: "Порівняй двох гравців",
    icon: "⚔️",
    category: "mastery",
    tier: "silver",
    target: 1,
    xpReward: 50,
  },
  {
    id: "compare_pro",
    title: "Pro Comparator",
    description: "10 порівнянь гравців",
    icon: "🆚",
    category: "mastery",
    tier: "gold",
    target: 10,
    xpReward: 200,
  },
  {
    id: "ai_explorer",
    title: "AI Explorer",
    description: "Скористайся 5 різними AI-пресетами",
    icon: "🧪",
    category: "mastery",
    tier: "silver",
    target: 5,
    xpReward: 100,
  },
  {
    id: "ai_scholar",
    title: "Brawl Scholar",
    description: "Скористайся всіма AI-пресетами",
    icon: "🎓",
    category: "mastery",
    tier: "gold",
    target: 10,
    xpReward: 250,
  },
  {
    id: "advice_first",
    title: "Перша порада",
    description: "Збережи першу пораду в бібліотеку",
    icon: "📚",
    category: "mastery",
    tier: "bronze",
    target: 1,
    xpReward: 25,
  },
  {
    id: "advice_collector",
    title: "AI бібліофіл",
    description: "Збережи 10 порад у бібліотеку",
    icon: "📖",
    category: "mastery",
    tier: "silver",
    target: 10,
    xpReward: 120,
  },
  {
    id: "advice_pinned",
    title: "Колекціонер мудрості",
    description: "Закріпи пораду",
    icon: "📌",
    category: "mastery",
    tier: "bronze",
    target: 1,
    xpReward: 30,
  },
  {
    id: "voice_listener",
    title: "Слухач",
    description: "Озвуч першу пораду",
    icon: "🎧",
    category: "mastery",
    tier: "bronze",
    target: 1,
    xpReward: 25,
  },
  {
    id: "voice_attentive",
    title: "Уважний слухач",
    description: "Слухай поради хоча б хвилину",
    icon: "👂",
    category: "mastery",
    tier: "silver",
    target: 1,
    xpReward: 80,
  },
  {
    id: "leaderboard_explorer",
    title: "Дослідник топу",
    description: "Відкрий лідерборд",
    icon: "📊",
    category: "exploration",
    tier: "bronze",
    target: 1,
    xpReward: 25,
  },
  {
    id: "leaderboard_globalist",
    title: "Глобаліст",
    description: "Переглянь рейтинг 5 різних регіонів",
    icon: "🌍",
    category: "exploration",
    tier: "silver",
    target: 5,
    xpReward: 120,
  },
  {
    id: "leaderboard_elite",
    title: "У топі!",
    description: "Знайди себе у топ-200 регіону",
    icon: "👑",
    category: "mastery",
    tier: "gold",
    target: 1,
    xpReward: 250,
  },
  {
    id: "club_leaderboard_explorer",
    title: "Дослідник клубів",
    description: "Подивись рейтинг клубів",
    icon: "🏰",
    category: "social",
    tier: "bronze",
    target: 1,
    xpReward: 30,
  },
  {
    id: "my_club_top_member",
    title: "Клуб у топі",
    description: "Знайди свій клуб у топ-200 регіону",
    icon: "🛡️",
    category: "social",
    tier: "gold",
    target: 1,
    xpReward: 200,
  },
  {
    id: "searcher_curious",
    title: "Допитливий",
    description: "Зроби 5 пошуків у лідерборді",
    icon: "🔎",
    category: "exploration",
    tier: "bronze",
    target: 5,
    xpReward: 60,
  },
  {
    id: "searcher_deep",
    title: "Поглиблений пошук",
    description: "Знайди 3 гравців через API з лідерборду",
    icon: "🛰️",
    category: "exploration",
    tier: "silver",
    target: 3,
    xpReward: 140,
  },
  {
    id: "club_explorer",
    title: "Дослідник клубів",
    description: "Переглянь сторінку клубу",
    icon: "🏰",
    category: "social",
    tier: "bronze",
    target: 1,
    xpReward: 25,
  },
  {
    id: "club_family",
    title: "Сімейний",
    description: "Відкрий профіль учасника клубу",
    icon: "👪",
    category: "social",
    tier: "silver",
    target: 1,
    xpReward: 50,
  },
  {
    id: "club_big",
    title: "Великий клуб",
    description: "Знайди клуб із 25+ учасниками",
    icon: "🏛️",
    category: "social",
    tier: "gold",
    target: 1,
    xpReward: 150,
  },
  {
    id: "settings_explorer",
    title: "Налаштовщик",
    description: "Відвідай Налаштування 5 разів",
    icon: "⚙️",
    category: "mastery",
    tier: "bronze",
    target: 5,
    xpReward: 20,
  },

  // ── COLLECTION ────────────────────────────────────────────────
  {
    id: "found_60k",
    title: "60K Club",
    description: "Знайди гравця з 60 000+ кубків",
    icon: "🏅",
    category: "collection",
    tier: "silver",
    target: 1,
    xpReward: 75,
  },
  {
    id: "found_80k",
    title: "Top Tier",
    description: "Знайди гравця з 80 000+ кубків",
    icon: "🥇",
    category: "collection",
    tier: "gold",
    target: 1,
    xpReward: 200,
  },
  {
    id: "found_100k",
    title: "Легенда",
    description: "Знайди гравця з 100 000+ кубків",
    icon: "👑",
    category: "collection",
    tier: "diamond",
    target: 1,
    xpReward: 1000,
    secret: true,
  },
  {
    id: "favorites_5",
    title: "Колекціонер",
    description: "Додай 5 улюблених гравців",
    icon: "⭐",
    category: "collection",
    tier: "silver",
    target: 5,
    xpReward: 75,
  },
  {
    id: "favorites_max",
    title: "Max Favorites",
    description: "Заповни список улюблених повністю",
    icon: "🌟",
    category: "collection",
    tier: "gold",
    target: 10,
    xpReward: 250,
  },
  {
    id: "my_player_set",
    title: "Це я",
    description: "Постав свій основний профіль",
    icon: "📌",
    category: "collection",
    tier: "bronze",
    target: 1,
    xpReward: 20,
  },

  // ── STREAK ────────────────────────────────────────────────────
  {
    id: "streak_3",
    title: "На розгоні",
    description: "3 дні підряд у застосунку",
    icon: "🔥",
    category: "streak",
    tier: "bronze",
    target: 3,
    xpReward: 30,
  },
  {
    id: "streak_7",
    title: "Тижневий герой",
    description: "7 днів підряд",
    icon: "💥",
    category: "streak",
    tier: "silver",
    target: 7,
    xpReward: 100,
  },
  {
    id: "streak_30",
    title: "Місячний марафон",
    description: "30 днів підряд",
    icon: "👑",
    category: "streak",
    tier: "gold",
    target: 30,
    xpReward: 500,
  },
  {
    id: "streak_100",
    title: "Сотня",
    description: "100 днів підряд",
    icon: "🏆",
    category: "streak",
    tier: "diamond",
    target: 100,
    xpReward: 2000,
  },

  // ── SPECIAL / EASTER EGGS ────────────────────────────────────
  {
    id: "night_owl",
    title: "Сова",
    description: "Запусти між 00:00 і 04:00",
    icon: "🦉",
    category: "special",
    tier: "bronze",
    target: 1,
    xpReward: 30,
    secret: true,
  },
  {
    id: "early_bird",
    title: "Жайворонок",
    description: "Запусти між 05:00 і 07:00",
    icon: "🐦",
    category: "special",
    tier: "bronze",
    target: 1,
    xpReward: 30,
    secret: true,
  },
  {
    id: "record_first",
    title: "Новий рекорд",
    description: "Побий свій рекорд кубків",
    icon: "📈",
    category: "special",
    tier: "silver",
    target: 1,
    xpReward: 75,
  },
  {
    id: "record_5",
    title: "Стабільний прогрес",
    description: "Побий рекорд 5 разів",
    icon: "🚀",
    category: "special",
    tier: "gold",
    target: 5,
    xpReward: 250,
  },
  {
    id: "haptic_off",
    title: "Тихий режим",
    description: "Вимкни вібрацію",
    icon: "🤫",
    category: "special",
    tier: "bronze",
    target: 1,
    xpReward: 10,
  },
  {
    id: "long_press_first",
    title: "Прихована функція",
    description: "Використай long-press вперше",
    icon: "👆",
    category: "special",
    tier: "bronze",
    target: 1,
    xpReward: 20,
    secret: true,
  },
  {
    id: "swipe_master",
    title: "Свайпер",
    description: "Перемкни таб через swipe 10 разів",
    icon: "👈",
    category: "special",
    tier: "silver",
    target: 10,
    xpReward: 50,
  },
  {
    id: "ach_curator",
    title: "Куратор",
    description: "Створи свою першу групу для закріплених",
    icon: "📁",
    category: "social",
    tier: "silver",
    target: 1,
    xpReward: 80,
  },
  {
    id: "ach_collector",
    title: "Колекціонер",
    description: "Закріпи 5 гравців",
    icon: "📌",
    category: "social",
    tier: "silver",
    target: 5,
    xpReward: 100,
  },
  {
    id: "ach_archivist",
    title: "Архіваріус",
    description: "Додай нотатку до закріпленого гравця",
    icon: "📝",
    category: "social",
    tier: "bronze",
    target: 1,
    xpReward: 40,
  },
  {
    id: "ach_super_fan",
    title: "Топ-фан",
    description: "Перегляни одного закріпленого гравця 50 разів",
    icon: "🌟",
    category: "mastery",
    tier: "gold",
    target: 50,
    xpReward: 250,
  },
  {
    id: "ach_connected",
    title: "На звʼязку",
    description: "Увімкни сповіщення",
    icon: "🔔",
    category: "social",
    tier: "bronze",
    target: 1,
    xpReward: 50,
  },
  {
    id: "ach_tester",
    title: "Тестувальник",
    description: "Надішли тестове сповіщення з налаштувань",
    icon: "🧪",
    category: "exploration",
    tier: "bronze",
    target: 1,
    xpReward: 30,
  },
  {
    id: "ach_real_fan",
    title: "Справжній фан",
    description: "Встанови застосунок на пристрій",
    icon: "📱",
    category: "special",
    tier: "silver",
    target: 1,
    xpReward: 100,
  },
  {
    id: "ach_always_connected",
    title: "Завжди на звʼязку",
    description: "Користуйся застосунком офлайн",
    icon: "📡",
    category: "special",
    tier: "bronze",
    target: 1,
    xpReward: 50,
  },
];

export const ACHIEVEMENTS_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);

export type AchievementEventType =
  | "search_success"
  | "ai_advice"
  | "ai_preset_used"
  | "advice_saved"
  | "advice_pinned"
  | "voice_play"
  | "voice_long_session"
  | "leaderboard_view"
  | "leaderboard_country_change"
  | "leaderboard_self_found"
  | "club_leaderboard_view"
  | "my_club_found"
  | "leaderboard_search"
  | "leaderboard_api_search"
  | "copy_tag"
  | "share"
  | "compare"
  | "club_view"
  | "club_member_open"
  | "settings_visit"
  | "favorite_added"
  | "pin_collector_5"
  | "pin_group_created"
  | "pin_note_added"
  | "pin_view"
  | "notifications_enabled"
  | "notifications_test"
  | "pwa_installed"
  | "pwa_offline_used"
  | "my_player_set"
  | "streak_check"
  | "trophy_record"
  | "haptic_toggle"
  | "long_press"
  | "swipe_tab"
  | "app_open";

export interface AchievementEventPayloadMap {
  search_success: { trophies?: number; isDemo?: boolean; tag?: string };
  ai_advice: undefined;
  ai_preset_used: { presetId: string };
  advice_saved: { totalAfter: number };
  advice_pinned: undefined;
  voice_play: undefined;
  voice_long_session: { durationSec: number };
  leaderboard_view: undefined;
  leaderboard_country_change: { country: string };
  leaderboard_self_found: { rank: number };
  club_leaderboard_view: undefined;
  my_club_found: { rank: number };
  leaderboard_search: undefined;
  leaderboard_api_search: { found: boolean };
  copy_tag: undefined;
  share: undefined;
  compare: undefined;
  club_view: { memberCount?: number };
  club_member_open: undefined;
  settings_visit: undefined;
  favorite_added: { totalAfter: number };
  pin_collector_5: { totalAfter: number };
  pin_group_created: undefined;
  pin_note_added: undefined;
  pin_view: { tag: string; totalAfter: number };
  notifications_enabled: undefined;
  notifications_test: undefined;
  pwa_installed: undefined;
  pwa_offline_used: undefined;
  my_player_set: undefined;
  streak_check: { streak: number };
  trophy_record: { newRecord: number };
  haptic_toggle: { enabled: boolean };
  long_press: undefined;
  swipe_tab: undefined;
  app_open: { hour: number };
}
