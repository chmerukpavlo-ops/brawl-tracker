import { addBreadcrumb, captureException, startSpan } from "./telemetry";

/**
 * Wraps an async operation in a Sentry span so it shows up under
 * Performance → Transactions in the dashboard. Adds an `error`
 * breadcrumb on failure but always re-throws so the caller's normal
 * error handling still runs.
 *
 * Common ops:
 *   - "ai"      AI Coach calls (streaming or blocking)
 *   - "backup"  Export / import / restore
 *   - "api"     Brawl Stars proxy
 *   - "ui"      Heavy UI computations (compare, leaderboard render)
 *
 * Example:
 *   await instrument("ai.coach.stream", "ai", () => streamCoach(...))
 */
export async function instrument<T>(
  name: string,
  op: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  try {
    return await startSpan({ name, op, attributes }, fn);
  } catch (err) {
    addBreadcrumb({
      category: op,
      level: "error",
      message: name,
      data: attributes,
    });
    captureException(err, { tags: { op }, extra: { name, attributes } });
    throw err;
  }
}
