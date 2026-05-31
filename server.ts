import "dotenv/config";

// Sentry must be initialized before any other module imports Express
// or registers routes; @sentry/node patches at require/import time.
// Init is conditional on `SENTRY_DSN_BACKEND` so dev / self-host
// stays zero-cost.
import * as Sentry from "@sentry/node";
if (process.env.SENTRY_DSN_BACKEND) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN_BACKEND,
    environment: process.env.NODE_ENV ?? "production",
    release: process.env.APP_VERSION ?? process.env.VITE_APP_VERSION,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    sendDefaultPii: false,
    // Server-side scrub: same player-tag redaction as the frontend
    // wrapper, but inlined to avoid pulling the Vite-only bundle.
    beforeSend(event) {
      if (event.request?.url) {
        event.request.url = event.request.url
          .replace(/(%23|#)[0289PYLQGRJCUVO]{4,12}/gi, "$1PLAYER_TAG");
      }
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });
  console.log("[Sentry] node SDK initialized");
}

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Імпортуємо Демо-гравців і клуби для безпечного бекапу та швидкого тестування без API ключа
import {
  DEMO_CLUBS,
  DEMO_CLUB_RANKINGS,
  DEMO_LEADERBOARD,
  DEMO_PLAYERS,
} from "./src/types";
import { generateDemoBattleLog } from "./src/data/demoBattleLog";
import { getPresetById } from "./src/data/aiPrompts";
import { getCoachMock } from "./src/data/aiPromptMocks";
import { buildPromptVariables, fillTemplate } from "./src/utils/promptBuilder";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const BRAWL_API_BASE = process.env.BRAWL_API_BASE || "https://api.brawlstars.com/v1";

  app.use(express.json());

  // Ручне налаштування CORS-заголовків для свободи підключення мобільних додатків та фронтенду
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Логування запитів для зручності розробки
  app.use((req, res, next) => {
    console.log(`[Proxy Server] [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Ендпоінт для статусу сервера
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      time: new Date().toISOString(),
      apiTokenConfigured: !!process.env.BRAWL_STARS_API_TOKEN
    });
  });

  // Головний ендпоінт проксі: /api/v1/player/:tag
  app.get("/api/v1/player/:tag", async (req, res) => {
    let originalTag = req.params.tag.toUpperCase().trim();
    
    // Очищаємо тег від зайвих пробілів чи можливих %23 з фронтенду
    let cleanTag = originalTag;
    if (cleanTag.startsWith("%23")) {
      cleanTag = cleanTag.replace("%23", "#");
    }
    
    if (!cleanTag.startsWith("#")) {
      cleanTag = "#" + cleanTag;
    }

    console.log(`[Proxy API] Отримано запит для гравця: ${cleanTag}`);

    // Перевірка на демо-гравця у разі відсутності токена або увімкненого демо-режиму
    const demoKey = Object.keys(DEMO_PLAYERS).find(
      key => key.toLowerCase() === cleanTag.toLowerCase() || 
             DEMO_PLAYERS[key].tag === cleanTag ||
             DEMO_PLAYERS[key].tag.replace("#", "") === cleanTag.replace("#", "")
    );

    const token = process.env.BRAWL_STARS_API_TOKEN;

    // Якщо токен не налаштований, або надіслано запит на демо-тег, імітуємо швидку та красиву відповідь
    if (!token || token === "YOUR_BRAWL_STARS_API_TOKEN" || req.query.demo === "true" || cleanTag === "#DEMO") {
      if (demoKey) {
        console.log(`[Proxy API] Повертаємо демо-гравця: ${demoKey}`);
        return res.json(DEMO_PLAYERS[demoKey]);
      }
      
      // Якщо запрошено інший невідомий тег у демо-режимі, повертаємо дефолтного Demo-гравця
      console.log(`[Proxy API] Токен відсутній. Повертаємо тренувального гравця для демонстрації.`);
      return res.json(DEMO_PLAYERS["BrawlMaster"]);
    }

    // Заміна '#' на '%23' для запиту на офіційне API Supercell
    const apiTag = cleanTag.replace("#", "%23");
    const apiUrl = `${BRAWL_API_BASE}/players/${apiTag}`;

    try {
      console.log(`[Proxy API] Надсилаємо запит до Brawl Stars API: ${apiUrl}`);
      const apiResponse = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`[Proxy API] Помилка офіційного API: Код ${apiResponse.status} - ${errorText}`);
        
        // Спеціальні підказки для відомих помилок Brawl Stars API (наприклад, блокування IP або невірний токен)
        let errorHint = "Сталася помилка при зверненні до API Supercell.";
        if (apiResponse.status === 403) {
          errorHint = "Помилка авторизації (403 Forbidden). Ймовірно, ваш Brawl Stars API токен не розрахований на IP-адресу цього сервера. Supercell вимагає прив'язку токена до конкретного IP.";
        } else if (apiResponse.status === 404) {
          errorHint = `Гравця з тегом ${cleanTag} не знайдено в базі даних Brawl Stars.`;
        } else if (apiResponse.status === 429) {
          errorHint = "Занадто багато запитів (Rate limit). Спробуйте пізніше.";
        }

        return res.status(apiResponse.status).json({
          error: true,
          status: apiResponse.status,
          message: errorHint,
          rawError: errorText,
          tag: cleanTag,
          suggestion: "Ви можете увімкнути Демо-режим (додавши параметр ?demo=true), щоб протестувати інтерфейс із прикладовими даними!"
        });
      }

      const playerData = await apiResponse.json();
      console.log(`[Proxy API] Дані гравця ${cleanTag} успішно завантажено!`);
      return res.json(playerData);
    } catch (error: any) {
      console.error(`[Proxy API] Мережева помилка проксі:`, error);
      return res.status(500).json({
        error: true,
        status: 500,
        message: "Не вдалося з'єднатися з офіційним API Brawl Stars (Мережева помилка).",
        details: error.message || error,
        tag: cleanTag,
        suggestion: "Перевірте підключення або використовуйте інтерактивний демо-режим, додавши ?demo=true."
      });
    }
  });

  // ── Battle log proxy: /api/v1/player/:tag/battlelog ─────────────
  // Brawl Stars API повертає `/v1/players/{tag}/battlelog` (останні 25
  // боїв) окремо від профайла. У демо-режимі повертаємо детермінований
  // згенерований лог, щоб UI працював без токена.
  app.get("/api/v1/player/:tag/battlelog", async (req, res) => {
    let cleanTag = req.params.tag.toUpperCase().trim();
    if (cleanTag.startsWith("%23")) cleanTag = cleanTag.replace("%23", "#");
    if (!cleanTag.startsWith("#")) cleanTag = "#" + cleanTag;

    console.log(`[Proxy API] Battle log запит: ${cleanTag}`);

    const demoKey = Object.keys(DEMO_PLAYERS).find(
      (k) =>
        DEMO_PLAYERS[k].tag === cleanTag ||
        DEMO_PLAYERS[k].tag.replace("#", "") === cleanTag.replace("#", "")
    );
    const token = process.env.BRAWL_STARS_API_TOKEN;
    const isDemoForced =
      !token ||
      token === "YOUR_BRAWL_STARS_API_TOKEN" ||
      req.query.demo === "true" ||
      cleanTag === "#DEMO";

    if (isDemoForced) {
      const seedPlayer =
        (demoKey && DEMO_PLAYERS[demoKey]) ||
        ({ tag: cleanTag, name: "Demo", brawlers: [] } as any);
      const items = generateDemoBattleLog(seedPlayer);
      console.log(
        `[Proxy API] Battle log (${cleanTag}): демо ${items.length} entries`
      );
      return res.json({ items, isDemo: true });
    }

    const apiTag = cleanTag.replace("#", "%23");
    const apiUrl = `${BRAWL_API_BASE}/players/${apiTag}/battlelog`;
    try {
      const apiResponse = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(
          `[Proxy API] Battle log помилка ${apiResponse.status}: ${errorText}`
        );
        let errorHint = "Не вдалося отримати лог матчів.";
        if (apiResponse.status === 403) {
          errorHint =
            "Помилка авторизації (403). Перевірте токен та прив'язку IP.";
        } else if (apiResponse.status === 404) {
          errorHint = `Гравця ${cleanTag} не знайдено для логу матчів.`;
        } else if (apiResponse.status === 429) {
          errorHint = "Занадто багато запитів. Спробуй за хвилину.";
        }
        return res.status(apiResponse.status).json({
          error: true,
          status: apiResponse.status,
          message: errorHint,
          rawError: errorText,
          tag: cleanTag,
          suggestion: "Спробуй увімкнути демо-режим (?demo=true).",
        });
      }
      const json = (await apiResponse.json()) as { items?: unknown[] };
      const items = Array.isArray(json.items) ? json.items : [];
      console.log(
        `[Proxy API] Battle log (${cleanTag}): ${items.length} entries`
      );
      return res.json({ items });
    } catch (error: any) {
      console.error(`[Proxy API] Мережева помилка battle log:`, error);
      return res.status(500).json({
        error: true,
        status: 500,
        message: "Не вдалося звернутися до Brawl Stars API (battle log).",
        details: error?.message ?? String(error),
        tag: cleanTag,
        suggestion: "Перевірте підключення або увімкніть демо-режим.",
      });
    }
  });

  // Ендпоінт проксі для клубу: /api/v1/club/:tag
  app.get("/api/v1/club/:tag", async (req, res) => {
    let cleanTag = req.params.tag.toUpperCase().trim();
    if (cleanTag.startsWith("%23")) {
      cleanTag = cleanTag.replace("%23", "#");
    }
    if (!cleanTag.startsWith("#")) {
      cleanTag = "#" + cleanTag;
    }

    console.log(`[Proxy API] Отримано запит для клубу: ${cleanTag}`);

    const demoKey = Object.keys(DEMO_CLUBS).find(
      (key) =>
        DEMO_CLUBS[key].tag.toLowerCase() === cleanTag.toLowerCase() ||
        DEMO_CLUBS[key].tag.replace("#", "") === cleanTag.replace("#", "")
    );

    const token = process.env.BRAWL_STARS_API_TOKEN;

    if (
      !token ||
      token === "YOUR_BRAWL_STARS_API_TOKEN" ||
      req.query.demo === "true" ||
      cleanTag === "#DEMO"
    ) {
      if (demoKey) {
        console.log(`[Proxy API] Повертаємо демо-клуб: ${demoKey}`);
        return res.json(DEMO_CLUBS[demoKey]);
      }
      console.log(
        `[Proxy API] Невідомий клуб у демо-режимі. Повертаємо клуб за замовчуванням.`
      );
      return res.json(DEMO_CLUBS["UKRVIBES"]);
    }

    const apiTag = cleanTag.replace("#", "%23");
    const apiUrl = `${BRAWL_API_BASE}Tag}`;

    try {
      console.log(`[Proxy API] Запит до Brawl Stars API: ${apiUrl}`);
      const apiResponse = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(
          `[Proxy API] Помилка офіційного API клубу: ${apiResponse.status} - ${errorText}`
        );
        let errorHint = "Сталася помилка при отриманні даних клубу.";
        if (apiResponse.status === 403) {
          errorHint =
            "Помилка авторизації (403). Перевірте Brawl Stars API токен та прив'язку IP.";
        } else if (apiResponse.status === 404) {
          errorHint = `Клуб з тегом ${cleanTag} не знайдено.`;
        } else if (apiResponse.status === 429) {
          errorHint = "Занадто багато запитів (Rate limit). Спробуйте пізніше.";
        }
        return res.status(apiResponse.status).json({
          error: true,
          status: apiResponse.status,
          message: errorHint,
          rawError: errorText,
          tag: cleanTag,
          suggestion:
            "Спробуйте Демо-режим (?demo=true), щоб подивитися інтерфейс на демо-клубах.",
        });
      }

      const clubData = await apiResponse.json();
      console.log(`[Proxy API] Дані клубу ${cleanTag} успішно завантажено!`);
      return res.json(clubData);
    } catch (error: any) {
      console.error(`[Proxy API] Мережева помилка проксі (club):`, error);
      return res.status(500).json({
        error: true,
        status: 500,
        message: "Не вдалося з'єднатися з офіційним API Brawl Stars (клуб).",
        details: error?.message || String(error),
        tag: cleanTag,
        suggestion: "Перевірте підключення або увімкніть демо-режим.",
      });
    }
  });

  // ── Лідерборд (in-memory cache 5 хв) ─────────────────────────────
  type LeaderboardCacheEntry = { data: unknown; expiresAt: number };
  const leaderboardCache = new Map<string, LeaderboardCacheEntry>();
  const LEADERBOARD_TTL_MS = 5 * 60 * 1000;
  const COUNTRY_RE = /^(global|[A-Z]{2})$/;

  function normalizeCountry(input: string | undefined): string {
    if (!input) return "global";
    const upper = input.toUpperCase();
    if (upper === "GLOBAL") return "global";
    return COUNTRY_RE.test(upper) ? upper : "global";
  }

  // Ендпоінт лідерборду: /api/v1/leaderboards/players/:country?
  app.get(
    ["/api/v1/leaderboards/players", "/api/v1/leaderboards/players/:country"],
    async (req, res) => {
      const country = normalizeCountry(req.params.country);
      const cacheKey = `players:${country}`;
      const forceFresh = req.query.fresh === "true";

      const cached = leaderboardCache.get(cacheKey);
      if (!forceFresh && cached && cached.expiresAt > Date.now()) {
        return res.json({
          country,
          items: cached.data,
          fromCache: true,
          cachedAtMs: cached.expiresAt - LEADERBOARD_TTL_MS,
        });
      }

      const token = process.env.BRAWL_STARS_API_TOKEN;
      const isDemoForced = req.query.demo === "true";

      if (!token || token === "YOUR_BRAWL_STARS_API_TOKEN" || isDemoForced) {
        console.log(
          `[Proxy API] Лідерборд (${country}): немає токена або demo — повертаємо демо-список.`
        );
        leaderboardCache.set(cacheKey, {
          data: DEMO_LEADERBOARD,
          expiresAt: Date.now() + LEADERBOARD_TTL_MS,
        });
        return res.json({
          country,
          items: DEMO_LEADERBOARD,
          fromCache: false,
          isDemo: true,
        });
      }

      const apiUrl = `${BRAWL_API_BASE}/rankings/${country}/players`;
      try {
        console.log(`[Proxy API] Лідерборд (${country}) → ${apiUrl}`);
        const apiResponse = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          console.error(
            `[Proxy API] Лідерборд помилка ${apiResponse.status}: ${errorText}`
          );
          let errorHint = "Не вдалося отримати лідерборд.";
          if (apiResponse.status === 403) {
            errorHint =
              "Помилка авторизації (403). Перевірте Brawl Stars API токен та прив'язку IP.";
          } else if (apiResponse.status === 404) {
            errorHint = `Регіон "${country}" не знайдено в Brawl Stars API.`;
          } else if (apiResponse.status === 429) {
            errorHint = "Занадто багато запитів. Спробуй за хвилину.";
          }

          // Якщо є trochi застарілий cache — повертаємо його, щоб не псувати UX.
          if (cached) {
            return res.json({
              country,
              items: cached.data,
              fromCache: true,
              stale: true,
              warning: errorHint,
              status: apiResponse.status,
            });
          }

          return res.status(apiResponse.status).json({
            error: true,
            status: apiResponse.status,
            message: errorHint,
            country,
            items: DEMO_LEADERBOARD,
            isDemoFallback: true,
          });
        }

        const json = (await apiResponse.json()) as { items?: unknown[] };
        const items = Array.isArray(json.items) ? json.items : [];
        leaderboardCache.set(cacheKey, {
          data: items,
          expiresAt: Date.now() + LEADERBOARD_TTL_MS,
        });
        console.log(`[Proxy API] Лідерборд (${country}): ${items.length} гравців`);
        return res.json({ country, items, fromCache: false });
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error(`[Proxy API] Мережева помилка лідерборду:`, err);
        if (cached) {
          return res.json({
            country,
            items: cached.data,
            fromCache: true,
            stale: true,
            warning: "Не вдалося оновити дані. Показано останнє відоме.",
          });
        }
        return res.status(500).json({
          error: true,
          status: 500,
          message: "Не вдалося звернутися до Brawl Stars API.",
          details: err?.message ?? String(error),
          country,
          items: DEMO_LEADERBOARD,
          isDemoFallback: true,
        });
      }
    }
  );

  // Ендпоінт лідерборду клубів: /api/v1/leaderboards/clubs/:country?
  app.get(
    ["/api/v1/leaderboards/clubs", "/api/v1/leaderboards/clubs/:country"],
    async (req, res) => {
      const country = normalizeCountry(req.params.country);
      const cacheKey = `clubs:${country}`;
      const forceFresh = req.query.fresh === "true";

      const cached = leaderboardCache.get(cacheKey);
      if (!forceFresh && cached && cached.expiresAt > Date.now()) {
        return res.json({
          country,
          items: cached.data,
          fromCache: true,
          cachedAtMs: cached.expiresAt - LEADERBOARD_TTL_MS,
        });
      }

      const token = process.env.BRAWL_STARS_API_TOKEN;
      const isDemoForced = req.query.demo === "true";

      if (!token || token === "YOUR_BRAWL_STARS_API_TOKEN" || isDemoForced) {
        console.log(
          `[Proxy API] Лідерборд клубів (${country}): немає токена або demo — повертаємо демо.`
        );
        leaderboardCache.set(cacheKey, {
          data: DEMO_CLUB_RANKINGS,
          expiresAt: Date.now() + LEADERBOARD_TTL_MS,
        });
        return res.json({
          country,
          items: DEMO_CLUB_RANKINGS,
          fromCache: false,
          isDemo: true,
        });
      }

      const apiUrl = `${BRAWL_API_BASE}/rankings/${country}/clubs`;
      try {
        console.log(`[Proxy API] Лідерборд клубів (${country}) → ${apiUrl}`);
        const apiResponse = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          console.error(
            `[Proxy API] Клуб-лідерборд помилка ${apiResponse.status}: ${errorText}`
          );
          let errorHint = "Не вдалося отримати рейтинг клубів.";
          if (apiResponse.status === 403) {
            errorHint =
              "Помилка авторизації (403). Перевірте Brawl Stars API токен та прив'язку IP.";
          } else if (apiResponse.status === 404) {
            errorHint = `Регіон "${country}" не знайдено.`;
          } else if (apiResponse.status === 429) {
            errorHint = "Занадто багато запитів. Спробуй за хвилину.";
          }

          if (cached) {
            return res.json({
              country,
              items: cached.data,
              fromCache: true,
              stale: true,
              warning: errorHint,
              status: apiResponse.status,
            });
          }
          return res.status(apiResponse.status).json({
            error: true,
            status: apiResponse.status,
            message: errorHint,
            country,
            items: DEMO_CLUB_RANKINGS,
            isDemoFallback: true,
          });
        }

        const json = (await apiResponse.json()) as { items?: unknown[] };
        const items = Array.isArray(json.items) ? json.items : [];
        leaderboardCache.set(cacheKey, {
          data: items,
          expiresAt: Date.now() + LEADERBOARD_TTL_MS,
        });
        console.log(`[Proxy API] Клуб-лідерборд (${country}): ${items.length} клубів`);
        return res.json({ country, items, fromCache: false });
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error(`[Proxy API] Мережева помилка клуб-лідерборду:`, err);
        if (cached) {
          return res.json({
            country,
            items: cached.data,
            fromCache: true,
            stale: true,
            warning: "Не вдалося оновити дані. Показано останнє відоме.",
          });
        }
        return res.status(500).json({
          error: true,
          status: 500,
          message: "Не вдалося звернутися до Brawl Stars API.",
          details: err?.message ?? String(error),
          country,
          items: DEMO_CLUB_RANKINGS,
          isDemoFallback: true,
        });
      }
    }
  );

  // Лінива ініціалізація клієнта Gemini AI
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is missing");
      }
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  // Допоміжна функція: будує prompt для AI-Тренера.
  // Якщо передано `presetId`, використовуємо preset з whitelist + variables;
  // інакше — generic prompt для backward compatibility.
  function buildCoachPrompt(
    playerData: any,
    presetId?: string | null,
    brawler?: any,
    locale: "uk" | "en" = "uk"
  ): string {
    const preset = presetId ? getPresetById(presetId) : null;
    const variables = buildPromptVariables(playerData, brawler);

    if (preset) {
      const filled = fillTemplate(preset.userPromptTemplate, variables);
      const langDirective =
        locale === "en"
          ? "\n\nRespond in English."
          : "\n\nВідповідай українською.";
      return `${preset.systemPrompt}\n\n${filled}${langDirective}`;
    }

    // Generic legacy prompt — лишений як fallback для старих клієнтів.
    const brawlersSummary =
      playerData?.brawlers && Array.isArray(playerData.brawlers)
        ? playerData.brawlers
            .slice(0, 10)
            .map((b: any) => `${b.name} (Lvl ${b.power}, ${b.trophies}🏆)`)
            .join(", ")
        : locale === "en"
          ? "no data"
          : "немає даних";

    if (locale === "en") {
      return `You are a charismatic AI coach for the game Brawl Stars. Analyze the player's profile and give 4-5 clear, actionable, motivating tips in English.
Player profile:
- Nickname: ${playerData.name}
- Current trophies: ${playerData.trophies} 🏆
- Highest trophies: ${playerData.highestTrophies} 🏆
- Level: ${playerData.expLevel}
- 3v3 wins: ${playerData["3vs3Victories"]}
- Solo wins: ${playerData.soloVictories}
- Duo wins: ${playerData.duoVictories}
- Top brawlers: ${brawlersSummary}

Format the answer as Markdown. Make it stylish and use emojis. Recommend whether to focus on 3v3 or solo modes based on stats, suggest brawlers to upgrade first, and how to break through their next trophy ceiling. Keep it concise — useful tips only, no fluff!`;
    }

    return `Ти — професійний і харизматичний AI-тренер з гри Brawl Stars. Тобі потрібно проаналізувати профіль гравця та дати 4-5 чітких, корисних і мотивуючих порад українською мовою.
Профіль гравця:
- Нікнейм: ${playerData.name}
- Поточні кубки: ${playerData.trophies} 🏆
- Максимальні кубки: ${playerData.highestTrophies} 🏆
- Рівень: ${playerData.expLevel}
- Перемоги 3в3: ${playerData["3vs3Victories"]}
- Перемоги Solo: ${playerData.soloVictories}
- Перемоги Duo: ${playerData.duoVictories}
- Деякі бравлери: ${brawlersSummary}

Напиши відповідь у форматі Markdown. Зроби її стильною, використовуй емодзі. Дай пораду, в якому режимі грати (3vs3 чи соло) на основі його статистики, та кого з бравлерів прокачувати першочергово або як подолати планку кубків. Будь лаконічним, корисні поради без води!`;
  }

  function safeLocale(input: unknown): "uk" | "en" {
    return input === "en" ? "en" : "uk";
  }

  // Демо-відповідь AI-Тренера, маршрутизується по preset (якщо є).
  function buildCoachMockAdvice(
    playerData: any,
    presetId?: string | null,
    brawler?: any
  ): string {
    if (presetId) {
      return getCoachMock(presetId, buildPromptVariables(playerData, brawler));
    }
    return `### 🤖 Поради від AI-Тренера Brawl Stars (Демо-режим)

1. 🔥 **Аналіз твого стилю:** Золоте співвідношення перемог 3в3 (${playerData["3vs3Victories"] || 18000}) показує, що ти чудовий тімплейер! Твої найкращі режими — **Brawl Ball** та **Knockout**. Знайди постійну команду у клубі **${playerData.club?.name || "VibeCoders UA"}**, щоб уникнути рандомів.
2. ⚡ **Пріоритет прокачки:** Твої топ-бравлери мають гарні показники кубків. Рекомендуємо прокачати **Spike** або **Mortis** до 11-го рівня та придбати на них Гіперзаряд (Hypercharge). Це дасть феноменальну перевагу в метах.
3. 🏆 **Шлях до слави:** Різниця між поточними та рекордними кубками невелика — це супер! Тобі цілком під силу закрити планку у **+${Math.ceil((playerData.trophies || 48000) * 1.05 / 1000) * 1000} кубків** до кінця цього сезону, якщо грати в Duo Showdown з надійним напарником.
4. 💎 **Професійний лайфхак:** Ніколи не запускай довгі серії ігор після 2-х поразок поспіль (тілт-бар'єр). Роби паузу на 15 хвилин, щоб зберегти свій кубковий стрейк!

*⚙️ Примітка: Для увімкнення генерації індивідуального AI-аналізу в реальному часі від Gemini, додайте змінну GEMINI_API_KEY у ваші Secrets.*`;
  }

  // Валідуємо presetId на сервері: якщо невідомий — ігноруємо.
  function safePresetId(id: unknown): string | null {
    if (typeof id !== "string") return null;
    if (id.length === 0 || id.length > 40) return null;
    return getPresetById(id) ? id : null;
  }

  // Ендпоінт AI тренера для аналізу статистики гравця (blocking — fallback)
  app.post("/api/gemini/coach", async (req, res) => {
    const { playerData, brawler } = req.body ?? {};
    const presetId = safePresetId(req.body?.presetId);
    const locale = safeLocale(req.body?.locale);
    if (!playerData) {
      return res.status(400).json({ error: "playerData є обов'язковим для аналізу" });
    }

    try {
      const ai = getGeminiClient();
      const prompt = buildCoachPrompt(playerData, presetId, brawler, locale);

      console.log(
        `[Proxy API] AI Coach для ${playerData.name} (preset=${presetId ?? "generic"})...`
      );
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return res.json({ advice: response.text, presetId });
    } catch (err: any) {
      console.warn("[Proxy API] Відкат до демо AI-радника. Причина:", err.message);
      return res.json({
        advice: buildCoachMockAdvice(playerData, presetId, brawler),
        presetId,
      });
    }
  });

  // Стрімінговий ендпоінт AI-Тренера через Server-Sent Events
  app.post("/api/gemini/coach/stream", async (req, res) => {
    const { playerData, brawler } = req.body ?? {};
    const presetId = safePresetId(req.body?.presetId);
    const locale = safeLocale(req.body?.locale);
    if (!playerData) {
      return res.status(400).json({ error: "playerData є обов'язковим для аналізу" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    let clientClosed = false;
    req.on("close", () => {
      clientClosed = true;
    });

    const send = (event: Record<string, unknown>) => {
      if (clientClosed) return;
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        clientClosed = true;
      }
    };

    const endStream = () => {
      if (clientClosed) return;
      try {
        res.end();
      } catch {
        /* ignore */
      }
    };

    try {
      const ai = getGeminiClient();
      const prompt = buildCoachPrompt(playerData, presetId, brawler, locale);

      console.log(
        `[Proxy API] AI Coach STREAM для ${playerData.name} (preset=${presetId ?? "generic"})...`
      );
      const stream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      for await (const chunk of stream) {
        if (clientClosed) break;
        const text = (chunk as any)?.text;
        if (typeof text === "string" && text.length > 0) {
          send({ type: "chunk", text });
        }
      }
      send({ type: "done" });
    } catch (err: any) {
      console.warn(
        "[Proxy API] AI Coach stream fallback на демо. Причина:",
        err?.message
      );
      // Стрімимо мок-пораду по словах, щоб симулювати реальний стрімінг.
      const mock = buildCoachMockAdvice(playerData, presetId, brawler);
      const tokens = mock.split(/(\s+)/);
      for (const token of tokens) {
        if (clientClosed) break;
        send({ type: "chunk", text: token });
        await new Promise((resolve) => setTimeout(resolve, 18));
      }
      send({ type: "done" });
    } finally {
      endStream();
    }
  });

  // Ендпоінт AI-аналізу клубу
  app.post("/api/gemini/club", async (req, res) => {
    const { clubInfo, myTag } = req.body ?? {};
    const locale = safeLocale(req.body?.locale);
    if (!clubInfo) {
      return res.status(400).json({ error: "clubInfo є обов'язковим" });
    }

    const memberCount = Array.isArray(clubInfo.members) ? clubInfo.members.length : 0;
    const topMembers = (clubInfo.members || [])
      .slice(0, 10)
      .map((m: any) => `${m.name} (${m.role}, ${m.trophies}🏆)`)
      .join(", ");

    try {
      const ai = getGeminiClient();
      const prompt =
        locale === "en"
          ? `You are a seasoned Brawl Stars analyst. Analyze the club and provide a Markdown-formatted breakdown in English.

CLUB:
- Name: ${clubInfo.name}
- Tag: ${clubInfo.tag}
- Type: ${clubInfo.type}
- Required trophies: ${clubInfo.requiredTrophies}
- Total trophies: ${clubInfo.trophies}
- Members: ${memberCount}
- Top 10 members: ${topMembers}
- Description: ${clubInfo.description}

${myTag ? `Asking player: ${myTag}` : ""}

Response structure:
### 🏰 Overall verdict
### 🔥 Activity
### 💎 Strengths
### ⚠️ Weaknesses
${myTag ? `### 🎯 Should ${myTag} stay or look elsewhere?` : ""}

Be concrete: use numbers (average trophies, spread). No filler.`
          : `Ти — досвідчений аналітик Brawl Stars. Проаналізуй клуб і дай оцінку українською у форматі Markdown.

КЛУБ:
- Назва: ${clubInfo.name}
- Тег: ${clubInfo.tag}
- Тип: ${clubInfo.type}
- Required trophies: ${clubInfo.requiredTrophies}
- Total trophies: ${clubInfo.trophies}
- Members: ${memberCount}
- Топ-10 учасників: ${topMembers}
- Опис: ${clubInfo.description}

${myTag ? `Гравець, що запитує: ${myTag}` : ""}

Структура відповіді:
### 🏰 Загальна оцінка
### 🔥 Активність
### 💎 Сильні сторони
### ⚠️ Слабкі місця
${myTag ? `### 🎯 Чи варто залишатися гравцю ${myTag}` : ""}

Будь конкретним: використовуй цифри (середні trophies, розкид), уникай води.`;

      console.log(`[Proxy API] AI Club analysis: ${clubInfo.name}`);
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      return res.json({ advice: response.text });
    } catch (err: any) {
      console.warn("[Proxy API] Club AI fallback. Причина:", err?.message);
      const avg = memberCount
        ? Math.round(((clubInfo.trophies as number) || 0) / memberCount)
        : 0;
      const mockAdvice = `### 🏰 Загальна оцінка
**${clubInfo.name}** — клуб типу **${clubInfo.type}** з вимогою ${clubInfo.requiredTrophies?.toLocaleString?.("uk-UA") || clubInfo.requiredTrophies} кубків. Середній учасник: **${avg.toLocaleString("uk-UA")}** кубків.

### 🔥 Активність
${memberCount >= 25 ? "Клуб майже повний — є кому грати щодня." : "Є вакантні слоти — клуб набирає учасників."}

### 💎 Сильні сторони
- Загальні кубки: ${clubInfo.trophies?.toLocaleString?.("uk-UA") || clubInfo.trophies}.
- Топ гравець потягне команду у club battles.

### ⚠️ Слабкі місця
- Якщо у вас сильно більше/менше за середнє — динаміка прокачки може бути не комфортною.

*⚙️ Для повноцінного AI-аналізу додайте GEMINI_API_KEY у Secrets.*`;
      return res.json({ advice: mockAdvice });
    }
  });

  // Ендпоінт AI-порівняння двох гравців
  app.post("/api/gemini/compare", async (req, res) => {
    const { playerA, playerB } = req.body ?? {};
    const locale = safeLocale(req.body?.locale);
    if (!playerA || !playerB) {
      return res
        .status(400)
        .json({ error: "playerA та playerB є обов'язковими для порівняння" });
    }

    const summarize = (p: any): string =>
      `${p.name} (${p.tag}) — ${p.trophies}🏆 / рекорд ${p.highestTrophies} · Lvl ${p.expLevel} · 3v3: ${p["3vs3Victories"]} · Solo: ${p.soloVictories} · Duo: ${p.duoVictories}`;

    const topBrawlers = (p: any): string =>
      Array.isArray(p.brawlers)
        ? p.brawlers
            .slice(0, 5)
            .map((b: any) => `${b.name} (Lvl ${b.power}, ${b.trophies}🏆)`)
            .join(", ")
        : locale === "en" ? "no data" : "немає даних";

    try {
      const ai = getGeminiClient();
      const prompt =
        locale === "en"
          ? `You are a seasoned Brawl Stars coach. Compare two players and produce a clear English Markdown analysis.

PLAYER A:
- ${summarize(playerA)}
- Top brawlers: ${topBrawlers(playerA)}

PLAYER B:
- ${summarize(playerB)}
- Top brawlers: ${topBrawlers(playerB)}

Response structure:
### 🏆 Who is stronger and why
### ⚡ ${playerA.name}'s strengths
### 💎 ${playerB.name}'s strengths
### 🎯 What A can learn from B (1-2 points)
### 🎯 What B can learn from A (1-2 points)
### 🎮 Each player's playstyle (briefly)

Be concrete, use numbers, no filler. Emojis only in headings.`
          : `Ти — досвідчений тренер з Brawl Stars. Порівняй двох гравців і дай чіткий аналіз українською у форматі Markdown.

ГРАВЕЦЬ A:
- ${summarize(playerA)}
- Топ бійці: ${topBrawlers(playerA)}

ГРАВЕЦЬ B:
- ${summarize(playerB)}
- Топ бійці: ${topBrawlers(playerB)}

Структура відповіді:
### 🏆 Хто сильніший і чому
### ⚡ Сильні сторони ${playerA.name}
### 💎 Сильні сторони ${playerB.name}
### 🎯 Що A може повчитися у B (1-2 пункти)
### 🎯 Що B може повчитися у A (1-2 пункти)
### 🎮 Стиль гри кожного (коротко)

Будь конкретним, використовуй цифри, без води. Емодзі — у заголовках.`;

      console.log(
        `[Proxy API] AI Compare: ${playerA.name} vs ${playerB.name}`
      );
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      return res.json({ advice: response.text });
    } catch (err: any) {
      console.warn("[Proxy API] Compare AI fallback. Причина:", err.message);
      const winner =
        (playerA.trophies ?? 0) > (playerB.trophies ?? 0)
          ? playerA.name
          : (playerB.trophies ?? 0) > (playerA.trophies ?? 0)
          ? playerB.name
          : "нічия";

      const mockAdvice = `### 🏆 Хто сильніший і чому
За поточними кубками лідирує **${winner}** — це базовий індикатор, але важливі й інші метрики: рекорд, перемоги в 3v3 та колекція бійців.

### ⚡ Сильні сторони ${playerA.name}
- Перемоги 3v3: **${playerA["3vs3Victories"]}** — досвід командної гри.
- Кількість бійців: **${(playerA.brawlers || []).length}** у колекції.

### 💎 Сильні сторони ${playerB.name}
- Перемоги 3v3: **${playerB["3vs3Victories"]}**.
- Рекорд кубків: **${playerB.highestTrophies}**.

### 🎯 Що A може повчитися у B
- Зверни увагу на тих бійців, у яких B має кращі кубки — це сигнал на яких героях метa зараз сильна.

### 🎯 Що B може повчитися у A
- Якщо у A вищі Solo-перемоги — варто погратися Showdown, щоб набрати запас кубків.

### 🎮 Стиль гри
- **${playerA.name}**: ${(playerA["3vs3Victories"] || 0) > (playerA.soloVictories || 0) * 3 ? "тімплеєр 3v3" : "універсал"}.
- **${playerB.name}**: ${(playerB["3vs3Victories"] || 0) > (playerB.soloVictories || 0) * 3 ? "тімплеєр 3v3" : "універсал"}.

*⚙️ Примітка: для повноцінного AI-аналізу додайте GEMINI_API_KEY у Secrets.*`;
      return res.json({ advice: mockAdvice });
    }
  });

  // ─── Brawlify proxy (encyclopedia) ────────────────────────────
  // Brawlify is a public mirror with no auth, but it's polite (and
  // cheaper for the user) to cache aggressively on our side.
  // Static metadata (brawlers / modes / maps) updates only on game
  // patches; the live event rotation refreshes ~every 5 minutes.
  interface BrawlifyCacheEntry {
    data: unknown;
    expiresAt: number;
  }
  const brawlifyCache = new Map<string, BrawlifyCacheEntry>();
  const BRAWLIFY_STATIC_TTL_MS = 24 * 60 * 60 * 1000;
  const BRAWLIFY_EVENTS_TTL_MS = 5 * 60 * 1000;

  async function fetchBrawlify(
    cacheKey: string,
    upstreamUrl: string,
    ttl: number,
    forceFresh: boolean
  ): Promise<{
    data: unknown;
    fromCache: boolean;
    stale?: boolean;
    cachedAtMs?: number;
  }> {
    const cached = brawlifyCache.get(cacheKey);
    if (!forceFresh && cached && cached.expiresAt > Date.now()) {
      return {
        data: cached.data,
        fromCache: true,
        cachedAtMs: cached.expiresAt - ttl,
      };
    }
    try {
      const upstream = await fetch(upstreamUrl, {
        headers: { "User-Agent": "brawl-stars-tracker (server proxy)" },
      });
      if (!upstream.ok) {
        // Return stale cache if we have any — better to show old data
        // than a hard error in the encyclopedia.
        if (cached) {
          return { data: cached.data, fromCache: true, stale: true };
        }
        const text = await upstream.text().catch(() => upstream.statusText);
        throw new Error(`Brawlify ${upstream.status}: ${text.slice(0, 200)}`);
      }
      const data = await upstream.json();
      brawlifyCache.set(cacheKey, { data, expiresAt: Date.now() + ttl });
      return { data, fromCache: false };
    } catch (err) {
      if (cached) {
        return { data: cached.data, fromCache: true, stale: true };
      }
      throw err;
    }
  }

  app.get("/api/v1/brawlify/brawlers", async (req, res) => {
    try {
      const result = await fetchBrawlify(
        "brawlers",
        "https://api.brawlify.com/v1/brawlers",
        BRAWLIFY_STATIC_TTL_MS,
        req.query.fresh === "true"
      );
      res.json(result);
    } catch (err: unknown) {
      console.error("[Brawlify] brawlers error:", err);
      res.status(502).json({ message: "Brawlify upstream error" });
    }
  });

  app.get("/api/v1/brawlify/gamemodes", async (req, res) => {
    try {
      const result = await fetchBrawlify(
        "gamemodes",
        "https://api.brawlify.com/v1/gamemodes",
        BRAWLIFY_STATIC_TTL_MS,
        req.query.fresh === "true"
      );
      res.json(result);
    } catch (err: unknown) {
      console.error("[Brawlify] gamemodes error:", err);
      res.status(502).json({ message: "Brawlify upstream error" });
    }
  });

  app.get("/api/v1/brawlify/maps", async (req, res) => {
    try {
      const result = await fetchBrawlify(
        "maps",
        "https://api.brawlify.com/v1/maps",
        BRAWLIFY_STATIC_TTL_MS,
        req.query.fresh === "true"
      );
      res.json(result);
    } catch (err: unknown) {
      console.error("[Brawlify] maps error:", err);
      res.status(502).json({ message: "Brawlify upstream error" });
    }
  });

  app.get("/api/v1/brawlify/maps/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid map id" });
    }
    try {
      const result = await fetchBrawlify(
        `map:${id}`,
        `https://api.brawlify.com/v1/maps/${id}`,
        BRAWLIFY_STATIC_TTL_MS,
        req.query.fresh === "true"
      );
      res.json(result);
    } catch (err: unknown) {
      console.error("[Brawlify] map detail error:", err);
      res.status(502).json({ message: "Brawlify upstream error" });
    }
  });

  app.get("/api/v1/brawlify/events", async (req, res) => {
    try {
      const result = await fetchBrawlify(
        "events",
        "https://api.brawlify.com/v1/events",
        BRAWLIFY_EVENTS_TTL_MS,
        req.query.fresh === "true"
      );
      res.json(result);
    } catch (err: unknown) {
      console.error("[Brawlify] events error:", err);
      res.status(502).json({ message: "Brawlify upstream error" });
    }
  });

  // Інтеграція Vite middleware для фронтенду у процесі розробки
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Запуск у режимі розробкиз Vite Middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Запуск у продакшн-режимі (статична роздача dist)");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Sentry's Express error handler MUST be registered after all
  // routes. Captures any error that bubbles into Express, then lets
  // the next middleware (default 500 handler) render the response.
  if (process.env.SENTRY_DSN_BACKEND) {
    Sentry.setupExpressErrorHandler(app);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`===============================================`);
    console.log(`🚀 Brawl Stars MVP Proxy Server запущено!`);
    console.log(`📍 Локальне посилання: http://localhost:${PORT}`);
    console.log(`🔥 Тестовий ендпоінт: http://localhost:${PORT}/api/v1/player/Tensai`);
    console.log(`⚙️  Токен API: ${process.env.BRAWL_STARS_API_TOKEN ? "НАЛАШТОВАНО" : "ВІДСУТНІЙ (увімкнено авто-демо)"}`);
    console.log(`===============================================`);
  });
}

startServer().catch((err) => {
  console.error("Помилка старту сервера:", err);
});
