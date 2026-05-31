import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/**
 * Browser-side MSW worker. Wire this from a dev-only entry (e.g. a
 * VITE_ENABLE_MSW flag) when you want to demo the app fully offline,
 * or from Playwright tests that prefer to mock the network rather
 * than talk to a real backend.
 *
 * Not started by default — initial caller is responsible for:
 *   `await worker.start({ onUnhandledRequest: "bypass" })`
 */
export const worker = setupWorker(...handlers);
