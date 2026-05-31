export interface FavoritePlayer {
  tag: string;
  customName?: string;
  iconEmoji?: string;
  /** Original name as last seen in API (used as fallback when customName missing). */
  originalName?: string;
  /** Hex accent color (e.g. `#facc15`) for border/glow. */
  color?: string;
  /** Optional reference to a `PinnedGroup.id`. Undefined = "ungrouped". */
  groupId?: string;
  /** Free-form note (markdown), max 500 chars enforced at write time. */
  note?: string;
  /** Lightweight labels (e.g. "competitor", "friend"). */
  tags?: string[];
  /** Lower number = higher in list (manual ordering). */
  priority?: number;
  /** When the user last opened the pinned profile. */
  lastViewedAt?: number;
  /** Number of times the user opened this pinned profile. */
  viewCount?: number;
  savedAt: number;
  lastTrophies?: number;
  /**
   * Last seen `highestTrophies` for this player. Mirrors `lastTrophies`
   * but tracks the personal-record value so the "new record" toast /
   * notification can dedup correctly. Optional + backward-compatible:
   * legacy LS entries that don't have the field continue to work.
   */
  lastHighest?: number;
  lastUpdated?: number;
}

export interface PinnedGroup {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  createdAt: number;
  /** Manual ordering; lower = earlier. */
  order: number;
}

export const PINNED_PLAYERS_LIMIT = 30;
export const PINNED_GROUPS_LIMIT = 10;
export const PIN_NOTE_LIMIT = 500;
export const PIN_NAME_LIMIT = 30;
export const PIN_GROUP_NAME_LIMIT = 24;

export const PIN_COLOR_PALETTE: ReadonlyArray<{ id: string; hex: string; label: string }> = [
  { id: "yellow", hex: "#facc15", label: "Жовтий" },
  { id: "purple", hex: "#7c3aed", label: "Фіолетовий" },
  { id: "blue", hex: "#3b82f6", label: "Синій" },
  { id: "green", hex: "#22c55e", label: "Зелений" },
  { id: "red", hex: "#ef4444", label: "Червоний" },
  { id: "pink", hex: "#ec4899", label: "Рожевий" },
  { id: "orange", hex: "#f97316", label: "Помаранчевий" },
  { id: "slate", hex: "#94a3b8", label: "Сірий" },
];

export const PIN_EMOJI_PALETTE: ReadonlyArray<string> = [
  "⭐", "🔥", "💪", "🎯", "👑", "💎",
  "🚀", "⚡", "🦾", "🏆", "🐺", "🎮",
  "🌟", "💫", "🎪", "🎲",
];

export interface MyPlayerSettings {
  tag: string | null;
  customName?: string;
}

export type TrophyGoalType = "auto" | "custom";

export interface TrophyGoal {
  id: string;
  tag: string;
  targetTrophies: number;
  createdAt: number;
  achievedAt?: number;
  startTrophies: number;
  type: TrophyGoalType;
  label?: string;
  reward?: string;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
  progress: number;
  seen: boolean;
}

export interface AchievementProgress {
  id: string;
  current: number;
  updatedAt: number;
}

export interface AchievementsAux {
  demoTagsSeen: string[];
  /** Unique AI Coach preset IDs the user has used at least once. */
  usedAiPresets: string[];
  /** Unique leaderboard country codes the user has opened. */
  leaderboardCountries: string[];
}

/**
 * Saved AI Coach advice (auto- or manually saved into local Library).
 */
export interface SavedAdvice {
  id: string;
  playerTag: string;
  playerName: string;
  playerTrophies: number;
  /** Full markdown advice text (capped to ~5kb, see useAiHistory). */
  advice: string;
  presetId?: string;
  presetTitle?: string;
  /** Category id with same set as `PromptCategory`. */
  presetCategory?: string;
  /** Lucide icon name forwarded from preset. */
  presetIcon?: string;
  brawlerId?: number;
  brawlerName?: string;
  createdAt: number;
  isPinned: boolean;
  isAutoSaved: boolean;
  tags?: string[];
  note?: string;
}

export interface AchievementsState {
  unlocked: UnlockedAchievement[];
  progress: Record<string, AchievementProgress>;
  stats: {
    totalUnlocked: number;
    totalXpFromAchievements: number;
  };
  aux: AchievementsAux;
}

export interface BrawlerInfo {
  id: number;
  name: string;
  power: number;
  rank: number;
  trophies: number;
  highestTrophies: number;
}

export interface PlayerClub {
  tag?: string;
  name?: string;
}

export type ClubRole = "president" | "vicePresident" | "senior" | "member";
export type ClubType = "open" | "inviteOnly" | "closed";

export interface ClubMember {
  tag: string;
  name: string;
  nameColor?: string;
  role: ClubRole;
  trophies: number;
  icon?: { id: number };
}

export interface ClubInfo {
  tag: string;
  name: string;
  description: string;
  type: ClubType;
  badgeId: number;
  requiredTrophies: number;
  trophies: number;
  members: ClubMember[];
}

/** Countries available for the public leaderboard endpoint. */
export interface LeaderboardCountry {
  /** ISO 3166-1 alpha-2 code uppercase, або зарезервоване "global". */
  code: string;
  /** Назва українською. */
  name: string;
  /** Емодзі-прапор (для прев’ю). */
  flag: string;
}

/** Player entry from `/v1/rankings/{country}/players` (Brawl Stars API). */
export interface PlayerRanking {
  tag: string;
  name: string;
  nameColor?: string;
  icon?: { id: number };
  trophies: number;
  rank: number;
  club?: { name?: string };
}

/** Club entry from `/v1/rankings/{country}/clubs` (опційно). */
export interface ClubRanking {
  tag: string;
  name: string;
  badgeId: number;
  trophies: number;
  memberCount: number;
  rank: number;
}

export interface PlayerStats {
  tag: string;
  name: string;
  nameColor?: string;
  icon?: {
    id: number;
  };
  trophies: number;
  highestTrophies: number;
  expLevel: number;
  expPoints?: number;
  "3vs3Victories": number;
  soloVictories: number;
  duoVictories: number;
  club?: PlayerClub;
  brawlers: BrawlerInfo[];
  isQualifiedFromChampionshipChallenge?: boolean;
}

// Популярні бравлери для відтворення ілюстрацій
export interface BrawlerMetadata {
  name: string;
  rarity: "COMMON" | "RARE" | "SUPER_RARE" | "EPIC" | "MYTHIC" | "LEGENDARY";
  class: string;
  color: string;
  imageFallback: string;
}

export const brawlersMetadata: Record<string, BrawlerMetadata> = {
  "SHELLY": { name: "Shelly", rarity: "COMMON", class: "Damage Dealer", color: "from-purple-500 to-purple-700", imageFallback: "🔫" },
  "COLT": { name: "Colt", rarity: "COMMON", class: "Damage Dealer", color: "from-purple-500 to-purple-700", imageFallback: "🤠" },
  "BULL": { name: "Bull", rarity: "COMMON", class: "Tank", color: "from-purple-500 to-purple-700", imageFallback: "🐂" },
  "EL PRIMO": { name: "El Primo", rarity: "RARE", class: "Tank", color: "from-emerald-500 to-emerald-700", imageFallback: "💪" },
  "BARLEY": { name: "Barley", rarity: "RARE", class: "Damage Dealer", color: "from-emerald-500 to-emerald-700", imageFallback: "🍾" },
  "POCO": { name: "Poco", rarity: "RARE", class: "Support", color: "from-emerald-500 to-emerald-700", imageFallback: "💀" },
  "ROSA": { name: "Rosa", rarity: "RARE", class: "Tank", color: "from-emerald-500 to-emerald-700", imageFallback: "🌿" },
  "NITA": { name: "Nita", rarity: "RARE", class: "Damage Dealer", color: "from-emerald-500 to-emerald-700", imageFallback: "🐻" },
  "BROCK": { name: "Brock", rarity: "COMMON", class: "Marksman", color: "from-purple-500 to-purple-700", imageFallback: "🚀" },
  "DARRYL": { name: "Darryl", rarity: "SUPER_RARE", class: "Tank", color: "from-blue-500 to-blue-700", imageFallback: "🛢️" },
  "PENNY": { name: "Penny", rarity: "SUPER_RARE", class: "Controller", color: "from-blue-500 to-blue-700", imageFallback: "🏴‍☠️" },
  "CARL": { name: "Carl", rarity: "SUPER_RARE", class: "Damage Dealer", color: "from-blue-500 to-blue-700", imageFallback: "⛏️" },
  "JACKY": { name: "Jacky", rarity: "SUPER_RARE", class: "Tank", color: "from-blue-500 to-blue-700", imageFallback: "⛑️" },
  "RICO": { name: "Rico", rarity: "SUPER_RARE", class: "Damage Dealer", color: "from-blue-500 to-blue-700", imageFallback: "🤖" },
  "PIPER": { name: "Piper", rarity: "EPIC", class: "Marksman", color: "from-rose-500 to-rose-700", imageFallback: "🌂" },
  "PAM": { name: "Pam", rarity: "EPIC", class: "Support", color: "from-rose-500 to-rose-700", imageFallback: "🔧" },
  "FRANK": { name: "Frank", rarity: "EPIC", class: "Tank", color: "from-rose-500 to-rose-700", imageFallback: "🔨" },
  "BIBI": { name: "Bibi", rarity: "EPIC", class: "Damage Dealer", color: "from-rose-500 to-rose-700", imageFallback: "🦹‍♀️" },
  "BEA": { name: "Bea", rarity: "EPIC", class: "Marksman", color: "from-rose-500 to-rose-700", imageFallback: "🐝" },
  "MORTIS": { name: "Mortis", rarity: "MYTHIC", class: "Assassin", color: "from-violet-600 to-violet-800", imageFallback: "🦇" },
  "TARA": { name: "Tara", rarity: "MYTHIC", class: "Damage Dealer", color: "from-violet-600 to-violet-800", imageFallback: "👁️" },
  "GENE": { name: "Gene", rarity: "MYTHIC", class: "Support", color: "from-violet-600 to-violet-800", imageFallback: "🧞" },
  "CROW": { name: "Crow", rarity: "LEGENDARY", class: "Assassin", color: "from-amber-400 to-amber-600", imageFallback: "🐦" },
  "SPIKE": { name: "Spike", rarity: "LEGENDARY", class: "Damage Dealer", color: "from-amber-400 to-amber-600", imageFallback: "🌵" },
  "LEON": { name: "Leon", rarity: "LEGENDARY", class: "Assassin", color: "from-amber-400 to-amber-600", imageFallback: "🦎" },
  "SANDY": { name: "Sandy", rarity: "LEGENDARY", class: "Support", color: "from-amber-400 to-amber-600", imageFallback: "😴" },
  "AMBER": { name: "Amber", rarity: "LEGENDARY", class: "Damage Dealer", color: "from-amber-400 to-amber-600", imageFallback: "🔥" },
  "MEG": { name: "Meg", rarity: "LEGENDARY", class: "Tank", color: "from-amber-400 to-amber-600", imageFallback: "🤖" },
  "FANG": { name: "Fang", rarity: "EPIC", class: "Assassin", color: "from-rose-500 to-rose-700", imageFallback: "👟" },
  "BUSTER": { name: "Buster", rarity: "MYTHIC", class: "Tank", color: "from-violet-600 to-violet-800", imageFallback: "📽️" },
  "EDGAR": { name: "Edgar", rarity: "EPIC", class: "Assassin", color: "from-rose-500 to-rose-700", imageFallback: "🧣" },
  "SURGE": { name: "Surge", rarity: "LEGENDARY", class: "Damage Dealer", color: "from-amber-400 to-amber-600", imageFallback: "🥤" },
  "MELODIE": { name: "Melodie", rarity: "MYTHIC", class: "Assassin", color: "from-violet-600 to-violet-800", imageFallback: "🎤" },
  "STU": { name: "Stu", rarity: "EPIC", class: "Assassin", color: "from-rose-500 to-rose-700", imageFallback: "🏎️" },
};

export const DEMO_PLAYERS: Record<string, PlayerStats> = {
  "Tensai": {
    tag: "#2LLR28CP",
    name: "Tensai | Savage",
    nameColor: "0xffffd700",
    trophies: 82450,
    highestTrophies: 85200,
    expLevel: 320,
    "3vs3Victories": 41250,
    soloVictories: 1205,
    duoVictories: 3840,
    club: {
      tag: "#CLUB_TENSAI",
      name: "ZETA DIVISION"
    },
    brawlers: [
      { id: 16000001, name: "MORTIS", power: 11, rank: 35, trophies: 1250, highestTrophies: 1260 },
      { id: 16000002, name: "SPIKE", power: 11, rank: 35, trophies: 1250, highestTrophies: 1250 },
      { id: 16000003, name: "COLT", power: 11, rank: 35, trophies: 1200, highestTrophies: 1250 },
      { id: 16000004, name: "CROW", power: 11, rank: 32, trophies: 1110, highestTrophies: 1150 },
      { id: 16000005, name: "LEON", power: 11, rank: 34, trophies: 1180, highestTrophies: 1200 },
      { id: 16000006, name: "SHELLY", power: 11, rank: 30, trophies: 1000, highestTrophies: 1050 },
      { id: 16000007, name: "EL PRIMO", power: 11, rank: 31, trophies: 1050, highestTrophies: 1100 },
      { id: 16000008, name: "SURGE", power: 11, rank: 35, trophies: 1250, highestTrophies: 1280 },
      { id: 16000009, name: "FANG", power: 11, rank: 33, trophies: 1150, highestTrophies: 1200 },
      { id: 16000010, name: "EDGAR", power: 11, rank: 30, trophies: 1010, highestTrophies: 1050 }
    ]
  },
  "SpenLC": {
    tag: "#Y0GPP0YY",
    name: "SpenLC",
    nameColor: "0xfffa8072",
    trophies: 76100,
    highestTrophies: 78500,
    expLevel: 285,
    "3vs3Victories": 38900,
    soloVictories: 940,
    duoVictories: 2150,
    club: {
      tag: "#CLUB_SPEN",
      name: "Tribe Gaming"
    },
    brawlers: [
      { id: 16000020, name: "PIPER", power: 11, rank: 35, trophies: 1250, highestTrophies: 1250 },
      { id: 16000021, name: "BEA", power: 11, rank: 33, trophies: 1140, highestTrophies: 1200 },
      { id: 16000022, name: "STU", power: 11, rank: 34, trophies: 1190, highestTrophies: 1210 },
      { id: 16000023, name: "CROW", power: 11, rank: 32, trophies: 1080, highestTrophies: 1150 },
      { id: 16000024, name: "SANDY", power: 11, rank: 31, trophies: 1050, highestTrophies: 1100 },
      { id: 16000025, name: "PAM", power: 11, rank: 30, trophies: 1000, highestTrophies: 1020 },
      { id: 16000026, name: "BIBI", power: 11, rank: 30, trophies: 1000, highestTrophies: 1040 }
    ]
  },
  "BrawlMaster": {
    tag: "#9VUU9YY9",
    name: "UKR_VibeCoder 🇺🇦",
    nameColor: "0x00ffffff",
    trophies: 48920,
    highestTrophies: 50100,
    expLevel: 198,
    "3vs3Victories": 18240,
    soloVictories: 4210,
    duoVictories: 5890,
    club: {
      tag: "#UKRVIBES",
      name: "VibeCoders UA"
    },
    brawlers: [
      { id: 16000001, name: "MORTIS", power: 11, rank: 30, trophies: 1005, highestTrophies: 1040 },
      { id: 16000030, name: "EL PRIMO", power: 11, rank: 28, trophies: 920, highestTrophies: 950 },
      { id: 16000031, name: "POCO", power: 10, rank: 27, trophies: 850, highestTrophies: 880 },
      { id: 16000032, name: "SPIKE", power: 11, rank: 31, trophies: 1020, highestTrophies: 1050 },
      { id: 16000033, name: "SHELLY", power: 11, rank: 26, trophies: 800, highestTrophies: 820 },
      { id: 16000034, name: "DARRYL", power: 9, rank: 25, trophies: 750, highestTrophies: 755 },
      { id: 16000035, name: "NITA", power: 10, rank: 25, trophies: 750, highestTrophies: 780 }
    ]
  }
};

// Демо-клуби для тестування без офіційного токена API.
// Теги нормалізуються до A-Z0-9 (без `_`), щоб задовольняти validation regex.
export const DEMO_CLUBS: Record<string, ClubInfo> = {
  "CLUBTENSAI": {
    tag: "#CLUBTENSAI",
    name: "ZETA DIVISION",
    description:
      "Професійна команда Brawl Stars. Тренування щодня о 20:00 за київським часом. Лише гравці з 80k+ кубків.",
    type: "inviteOnly",
    badgeId: 8000001,
    requiredTrophies: 80000,
    trophies: 1840500,
    members: [
      { tag: "#2LLR28CP", name: "Tensai | Savage", nameColor: "0xffffd700", role: "president", trophies: 82450, icon: { id: 28000000 } },
      { tag: "#ZETAVP1", name: "Zeta_Kage", role: "vicePresident", trophies: 78900, icon: { id: 28000001 } },
      { tag: "#ZETASR1", name: "Akihiko_BR", role: "senior", trophies: 74200, icon: { id: 28000002 } },
      { tag: "#ZETASR2", name: "RyuPro", role: "senior", trophies: 71800, icon: { id: 28000003 } },
      { tag: "#ZETAMB1", name: "ShiroKun", role: "member", trophies: 65300, icon: { id: 28000004 } },
      { tag: "#ZETAMB2", name: "Hana_Star", role: "member", trophies: 62100, icon: { id: 28000005 } },
      { tag: "#ZETAMB3", name: "DaiSamurai", role: "member", trophies: 60800, icon: { id: 28000006 } },
      { tag: "#ZETAMB4", name: "MisaChan", role: "member", trophies: 58900, icon: { id: 28000007 } },
      { tag: "#ZETAMB5", name: "TakeruX", role: "member", trophies: 55600, icon: { id: 28000008 } },
    ],
  },
  "CLUBSPEN": {
    tag: "#CLUBSPEN",
    name: "Tribe Gaming",
    description:
      "Open для всіх хто любить grind. Daily club battles. We have fun first, win second.",
    type: "open",
    badgeId: 8000002,
    requiredTrophies: 30000,
    trophies: 920400,
    members: [
      { tag: "#Y0GPP0YY", name: "SpenLC", nameColor: "0xfffa8072", role: "president", trophies: 76100, icon: { id: 28000010 } },
      { tag: "#TRIBEVP", name: "TribeAce", role: "vicePresident", trophies: 65000, icon: { id: 28000011 } },
      { tag: "#TRIBESR1", name: "Caelan", role: "senior", trophies: 58400, icon: { id: 28000012 } },
      { tag: "#TRIBEMB1", name: "Cooper", role: "member", trophies: 49200, icon: { id: 28000013 } },
      { tag: "#TRIBEMB2", name: "BabyRox", role: "member", trophies: 41100, icon: { id: 28000014 } },
      { tag: "#TRIBEMB3", name: "RippedPhil", role: "member", trophies: 38900, icon: { id: 28000015 } },
    ],
  },
  "UKRVIBES": {
    tag: "#UKRVIBES",
    name: "VibeCoders UA",
    description:
      "Український клуб для розробників. Спілкуємось українською, спільні ігри по вихідних. Glory to Ukraine 🇺🇦",
    type: "open",
    badgeId: 8000003,
    requiredTrophies: 10000,
    trophies: 580200,
    members: [
      { tag: "#9VUU9YY9", name: "UKR_VibeCoder 🇺🇦", nameColor: "0x00ffffff", role: "president", trophies: 48920, icon: { id: 28000020 } },
      { tag: "#VIBESVP1", name: "Олег_Дев", role: "vicePresident", trophies: 41200, icon: { id: 28000021 } },
      { tag: "#VIBESSR1", name: "Катя_React", role: "senior", trophies: 36800, icon: { id: 28000022 } },
      { tag: "#VIBESSR2", name: "Андрій_TS", role: "senior", trophies: 33500, icon: { id: 28000023 } },
      { tag: "#VIBESMB1", name: "Юлія_UI", role: "member", trophies: 28100, icon: { id: 28000024 } },
      { tag: "#VIBESMB2", name: "Богдан_GO", role: "member", trophies: 25400, icon: { id: 28000025 } },
      { tag: "#VIBESMB3", name: "Марта_QA", role: "member", trophies: 22300, icon: { id: 28000026 } },
      { tag: "#VIBESMB4", name: "Денис_Rust", role: "member", trophies: 19800, icon: { id: 28000027 } },
    ],
  },
};

/**
 * Демо-лідерборд для роботи без офіційного API. Топ починається з
 * відомих демо-гравців і доповнюється згенерованими записами для
 * демонстрації списку у ~50 рядків.
 */
function buildDemoLeaderboard(): PlayerRanking[] {
  const seed: PlayerRanking[] = [
    { rank: 1, tag: "#2LLR28CP", name: "Tensai | Savage", trophies: 82450, nameColor: "0xffffd700", icon: { id: 28000000 }, club: { name: "ZETA DIVISION" } },
    { rank: 2, tag: "#Y0GPP0YY", name: "SpenLC", trophies: 76100, nameColor: "0xfffa8072", icon: { id: 28000010 }, club: { name: "Tribe Gaming" } },
    { rank: 3, tag: "#KAIRO99", name: "KairoBR", trophies: 71800, icon: { id: 28000030 }, club: { name: "FNATIC" } },
    { rank: 4, tag: "#NANIWAY", name: "Naniway", trophies: 68200, icon: { id: 28000031 }, club: { name: "FNATIC" } },
    { rank: 5, tag: "#KOPENG7", name: "Koepenger", trophies: 65900, icon: { id: 28000032 }, club: { name: "BIG Clan" } },
    { rank: 6, tag: "#9VUU9YY9", name: "UKR_VibeCoder 🇺🇦", trophies: 48920, nameColor: "0x00ffffff", icon: { id: 28000020 }, club: { name: "VibeCoders UA" } },
    { rank: 7, tag: "#STORMSU", name: "StormSurge", trophies: 47280, icon: { id: 28000033 }, club: { name: "Tribe Gaming" } },
    { rank: 8, tag: "#WARSAWX", name: "WarsawX", trophies: 46010, icon: { id: 28000034 }, club: { name: "Tribe PL" } },
    { rank: 9, tag: "#AIRYU99", name: "Airyu", trophies: 45200, icon: { id: 28000035 }, club: { name: "Sakura JP" } },
    { rank: 10, tag: "#NEONACE", name: "NeonAce", trophies: 44150, icon: { id: 28000036 }, club: { name: "Cyberpunk" } },
  ];
  const filler = Array.from({ length: 40 }).map<PlayerRanking>((_, i) => {
    const rank = 11 + i;
    return {
      rank,
      tag: `#DEMO${(rank * 7919).toString(36).toUpperCase().slice(-6)}`,
      name: `Player_${rank}`,
      trophies: Math.max(1000, 44000 - rank * 600 - ((rank * 113) % 250)),
      icon: { id: 28000000 + (rank % 50) },
      club: { name: rank % 3 === 0 ? "VibeCoders UA" : rank % 3 === 1 ? "Tribe Gaming" : "Sakura JP" },
    };
  });
  return [...seed, ...filler];
}

export const DEMO_LEADERBOARD: PlayerRanking[] = buildDemoLeaderboard();

/**
 * Демо-рейтинг клубів. На вершині — клуби з `DEMO_CLUBS` (для звʼязності
 * між player profile, club sheet та лідербордом), далі — згенеровані.
 */
function buildDemoClubRankings(): ClubRanking[] {
  const seedFromDemo: ClubRanking[] = Object.values(DEMO_CLUBS).map((c, idx) => ({
    rank: idx + 1,
    tag: c.tag,
    name: c.name,
    badgeId: c.badgeId,
    trophies: c.trophies,
    memberCount: c.members.length,
  }));

  const extra: Array<{ name: string; badgeId: number; trophies: number; members: number }> = [
    { name: "FNATIC", badgeId: 8000010, trophies: 1620400, members: 30 },
    { name: "BIG Clan", badgeId: 8000011, trophies: 1480100, members: 29 },
    { name: "Sakura JP", badgeId: 8000012, trophies: 1340800, members: 28 },
    { name: "Tribe PL", badgeId: 8000013, trophies: 1210600, members: 30 },
    { name: "Cyberpunk", badgeId: 8000014, trophies: 1100200, members: 27 },
    { name: "OG Esports", badgeId: 8000015, trophies: 980500, members: 26 },
    { name: "Liquid", badgeId: 8000016, trophies: 870300, members: 25 },
    { name: "Phoenix UA", badgeId: 8000017, trophies: 760900, members: 30 },
    { name: "Karpaty", badgeId: 8000018, trophies: 690400, members: 22 },
    { name: "Kyiv Stars", badgeId: 8000019, trophies: 624000, members: 24 },
    { name: "Tokyo Squad", badgeId: 8000020, trophies: 581000, members: 18 },
    { name: "Berlin Walls", badgeId: 8000021, trophies: 540500, members: 28 },
    { name: "Madrid Fire", badgeId: 8000022, trophies: 498200, members: 19 },
    { name: "Saopaulo SP", badgeId: 8000023, trophies: 460300, members: 30 },
    { name: "Seoul Tigers", badgeId: 8000024, trophies: 432900, members: 17 },
    { name: "Roma Squad", badgeId: 8000025, trophies: 401100, members: 12 },
    { name: "Toronto NA", badgeId: 8000026, trophies: 372000, members: 9 },
  ];

  const seeded: ClubRanking[] = extra.map((e, i) => ({
    rank: seedFromDemo.length + i + 1,
    tag: `#DEMO${(i * 7919).toString(36).toUpperCase().padStart(4, "0")}`,
    name: e.name,
    badgeId: e.badgeId,
    trophies: e.trophies,
    memberCount: e.members,
  }));

  // Сортуємо за кубками і перепризначаємо ранги, щоб був консистентний топ.
  return [...seedFromDemo, ...seeded]
    .sort((a, b) => b.trophies - a.trophies)
    .map((c, idx) => ({ ...c, rank: idx + 1 }));
}

export const DEMO_CLUB_RANKINGS: ClubRanking[] = buildDemoClubRankings();
