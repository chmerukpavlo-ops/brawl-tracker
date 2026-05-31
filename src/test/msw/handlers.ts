import { http, HttpResponse, delay } from "msw";
import { mockPlayer } from "../fixtures/player";
import { mockClub } from "../fixtures/club";
import { mockBattleLog } from "../fixtures/battle";
import { mockLeaderboard, mockClubLeaderboard } from "../fixtures/leaderboard";

/**
 * Default handlers. Test files can override any of them per-test
 * with `server.use(...)` (those overrides are cleared in `afterEach`).
 *
 * Convention: the magic tag fragment `INVALID` triggers a 404 so we
 * can exercise error paths without per-test boilerplate.
 */
export const handlers = [
  http.get("/api/health", () =>
    HttpResponse.json({ status: "ok", uptime: 12_345, isApiConfigured: true })
  ),

  http.get("/api/v1/player/:tag", ({ params }) => {
    const tag = decodeURIComponent(String(params.tag));
    if (tag.toUpperCase().includes("INVALID")) {
      return HttpResponse.json(
        { message: "Player not found", suggestion: "Перевір тег" },
        { status: 404 }
      );
    }
    if (tag.toUpperCase().includes("SLOW")) {
      // Simulates the slow-network path so retry/skeleton tests
      // have something to grab onto.
      return delay(50).then(() =>
        HttpResponse.json(mockPlayer({ tag: `#${tag.replace(/^#/, "")}` }))
      );
    }
    return HttpResponse.json(mockPlayer({ tag: `#${tag.replace(/^#/, "")}` }));
  }),

  http.get("/api/v1/player/:tag/battlelog", ({ params }) => {
    const tag = decodeURIComponent(String(params.tag));
    return HttpResponse.json({
      items: mockBattleLog(tag),
      isDemo: false,
    });
  }),

  http.get("/api/v1/club/:tag", () => HttpResponse.json(mockClub())),

  http.get("/api/v1/leaderboards/players/:country?", ({ params }) => {
    const country = (params.country as string) ?? "global";
    return HttpResponse.json({ country, items: mockLeaderboard() });
  }),

  http.get("/api/v1/leaderboards/clubs/:country?", ({ params }) => {
    const country = (params.country as string) ?? "global";
    return HttpResponse.json({ country, items: mockClubLeaderboard() });
  }),

  http.post("/api/gemini/coach", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      playerData?: { name?: string };
    };
    return HttpResponse.json({
      advice: `Mock advice for ${body.playerData?.name ?? "player"}`,
    });
  }),

  // SSE: stream a few chunks then [DONE]. Tests for the streaming
  // path can override with `server.use(...)` if they need a specific
  // payload or error.
  http.post("/api/gemini/coach/stream", () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("data: Mock\n\n"));
        controller.enqueue(encoder.encode("data:  streaming\n\n"));
        controller.enqueue(encoder.encode("data:  advice\n\n"));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    return new HttpResponse(stream, {
      headers: { "Content-Type": "text/event-stream" },
    });
  }),

  http.post("/api/gemini/club", () =>
    HttpResponse.json({ analysis: "Mock club analysis" })
  ),
  http.post("/api/gemini/compare", () =>
    HttpResponse.json({ comparison: "Mock comparison" })
  ),
];
