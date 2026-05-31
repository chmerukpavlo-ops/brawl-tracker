import type { ReactNode } from "react";

/**
 * Splits `text` into a JSX fragment with `<mark>` segments around each
 * occurrence of `query` (case-insensitive).
 *
 * - Returns the original string when `query` is shorter than 2 chars.
 * - Used for inline highlighting in leaderboard rows.
 */
export function highlightSubstring(
  text: string,
  query: string,
  className = "rounded px-0.5 bg-[#facc15]/30 text-[#facc15]"
): ReactNode {
  if (!text) return text;
  const q = (query ?? "").trim();
  if (q.length < 2) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  if (!lowerText.includes(lowerQuery)) return text;

  const parts: ReactNode[] = [];
  let cursor = 0;
  let idx = lowerText.indexOf(lowerQuery, cursor);
  let key = 0;
  while (idx !== -1) {
    if (idx > cursor) parts.push(text.slice(cursor, idx));
    parts.push(
      <mark key={`m${key++}`} className={className}>
        {text.slice(idx, idx + lowerQuery.length)}
      </mark>
    );
    cursor = idx + lowerQuery.length;
    idx = lowerText.indexOf(lowerQuery, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

/**
 * Heuristic check whether the query looks like a Brawl Stars player/club tag.
 * Accepts optional `#`, then 3-15 of `[A-Z0-9]`. Mirrors the API tag regex.
 */
export function isTagLikeQuery(input: string): boolean {
  if (!input) return false;
  const cleaned = input.trim().replace(/^#+/, "").toUpperCase();
  return /^[A-Z0-9]{3,15}$/.test(cleaned);
}
