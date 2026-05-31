import type { LeaderboardCountry } from "../types";

/**
 * Список регіонів, доступних у `/v1/rankings/{country}/players`.
 * `code === "global"` — спецзначення для глобального топу.
 */
export const LEADERBOARD_COUNTRIES: LeaderboardCountry[] = [
  { code: "global", name: "Глобальний", flag: "🌍" },
  { code: "UA", name: "Україна", flag: "🇺🇦" },
  { code: "PL", name: "Польща", flag: "🇵🇱" },
  { code: "DE", name: "Німеччина", flag: "🇩🇪" },
  { code: "FR", name: "Франція", flag: "🇫🇷" },
  { code: "GB", name: "Велика Британія", flag: "🇬🇧" },
  { code: "IT", name: "Італія", flag: "🇮🇹" },
  { code: "ES", name: "Іспанія", flag: "🇪🇸" },
  { code: "NL", name: "Нідерланди", flag: "🇳🇱" },
  { code: "SE", name: "Швеція", flag: "🇸🇪" },
  { code: "FI", name: "Фінляндія", flag: "🇫🇮" },
  { code: "TR", name: "Туреччина", flag: "🇹🇷" },
  { code: "US", name: "США", flag: "🇺🇸" },
  { code: "CA", name: "Канада", flag: "🇨🇦" },
  { code: "MX", name: "Мексика", flag: "🇲🇽" },
  { code: "BR", name: "Бразилія", flag: "🇧🇷" },
  { code: "AR", name: "Аргентина", flag: "🇦🇷" },
  { code: "CL", name: "Чилі", flag: "🇨🇱" },
  { code: "JP", name: "Японія", flag: "🇯🇵" },
  { code: "KR", name: "Південна Корея", flag: "🇰🇷" },
  { code: "CN", name: "Китай", flag: "🇨🇳" },
  { code: "TH", name: "Таїланд", flag: "🇹🇭" },
  { code: "VN", name: "Вʼєтнам", flag: "🇻🇳" },
  { code: "ID", name: "Індонезія", flag: "🇮🇩" },
  { code: "PH", name: "Філіппіни", flag: "🇵🇭" },
  { code: "IN", name: "Індія", flag: "🇮🇳" },
  { code: "AU", name: "Австралія", flag: "🇦🇺" },
  { code: "SA", name: "Саудівська Аравія", flag: "🇸🇦" },
  { code: "AE", name: "ОАЕ", flag: "🇦🇪" },
  { code: "EG", name: "Єгипет", flag: "🇪🇬" },
];

export const LEADERBOARD_COUNTRIES_BY_CODE: Record<string, LeaderboardCountry> =
  LEADERBOARD_COUNTRIES.reduce<Record<string, LeaderboardCountry>>((acc, c) => {
    acc[c.code] = c;
    return acc;
  }, {});

export const DEFAULT_COUNTRY = "global";

export function getCountryMeta(code: string): LeaderboardCountry {
  return (
    LEADERBOARD_COUNTRIES_BY_CODE[code] ?? {
      code,
      name: code,
      flag: "🏳️",
    }
  );
}

const COUNTRY_RE = /^(global|[A-Z]{2})$/;

/** Validates and normalizes a country code coming from URL/userland. */
export function normalizeCountryCode(input: string | null | undefined): string {
  if (!input) return DEFAULT_COUNTRY;
  const upper = input.toUpperCase();
  if (upper === "GLOBAL") return "global";
  return COUNTRY_RE.test(upper) ? upper : DEFAULT_COUNTRY;
}
