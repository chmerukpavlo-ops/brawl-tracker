import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * Node-side MSW server, used by Vitest. Started/stopped by
 * `src/test/setup.ts`; each test file may add ad-hoc handlers via
 * `server.use(...)` and they're cleared by the global `afterEach`.
 */
export const server = setupServer(...handlers);
