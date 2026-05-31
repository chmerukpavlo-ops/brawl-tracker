/**
 * Defensive PII scrubber for analytics property payloads.
 *
 * The discriminated union in `src/types/analytics.ts` is the primary
 * defense — events shouldn't carry tags or names in the first place.
 * This file is a safety net for the cases where a developer wires a
 * dynamic value into an event without thinking about it.
 *
 * We deliberately reuse `scrubText` from `src/lib/telemetry.ts` so the
 * Brawl Stars hash-tag rules stay in one place — there's exactly one
 * regex to update if Supercell changes the tag format.
 */
import { scrubText } from "../telemetry";

/**
 * Recursively walk a property payload and replace PII-shaped strings.
 * Non-string values pass through; deeply nested objects (rare in our
 * events) are scrubbed too.
 *
 * The function never mutates the input; the output is a new object so
 * callers can keep their original payload for logging.
 */
export function scrubAnalyticsProps(
  props: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!props) return {};
  return walk(props) as Record<string, unknown>;
}

function walk(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map(walk);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walk(v);
    }
    return out;
  }
  return value;
}
