import { trackAchievementEvent } from "../hooks/useAchievements";

export interface ShareDataPayload {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export type ShareMethod = "native" | "clipboard" | "fallback";

export interface ShareResult {
  success: boolean;
  method: ShareMethod;
  cancelled?: boolean;
  error?: string;
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function canShareFiles(): boolean {
  return (
    canUseNativeShare() &&
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function"
  );
}

export function getBaseUrl(): string {
  if (typeof window === "undefined" || !window.location) return "";
  return window.location.origin;
}

export function buildPlayerShareUrl(tag: string): string {
  const clean = tag.trim().replace(/^#+/, "");
  const origin = getBaseUrl();
  return `${origin}/?tag=${encodeURIComponent(clean)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard ||
    typeof navigator.clipboard.writeText !== "function"
  ) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function payloadToClipboardText(payload: ShareDataPayload): string {
  const parts: string[] = [];
  if (payload.title && (!payload.text || !payload.text.startsWith(payload.title))) {
    parts.push(payload.title);
  }
  if (payload.text) parts.push(payload.text);
  if (payload.url) parts.push(payload.url);
  const joined = parts.join("\n").trim();
  return joined || payload.url || payload.title || "";
}

export async function shareData(payload: ShareDataPayload): Promise<ShareResult> {
  if (canUseNativeShare()) {
    const native: ShareData = {};
    if (payload.title) native.title = payload.title;
    if (payload.text) native.text = payload.text;
    if (payload.url) native.url = payload.url;
    if (payload.files && payload.files.length > 0) {
      try {
        if (canShareFiles() && navigator.canShare?.({ files: payload.files })) {
          native.files = payload.files;
        }
      } catch {
        /* ignore unsupported file share */
      }
    }
    try {
      await navigator.share!(native);
      trackAchievementEvent("share");
      return { success: true, method: "native" };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return { success: false, method: "native", cancelled: true };
      }
    }
  }

  const text = payloadToClipboardText(payload);
  const ok = await copyToClipboard(text);
  if (ok) {
    trackAchievementEvent("share");
    return { success: true, method: "clipboard" };
  }
  return {
    success: false,
    method: "fallback",
    error: "Clipboard unavailable",
  };
}

// ── Legacy compatibility (used by older call sites) ──
export interface SharePlayerInput {
  name: string;
  tag: string;
  trophies?: number;
}

export interface LegacyShareResult {
  shared: boolean;
  copiedFallback: boolean;
}

export async function sharePlayer({
  name,
  tag,
  trophies,
}: SharePlayerInput): Promise<LegacyShareResult> {
  const url = buildPlayerShareUrl(tag);
  const text = trophies
    ? `🏆 ${name} (${tag}) — ${trophies.toLocaleString("uk-UA")} кубків`
    : `${name} (${tag})`;
  const res = await shareData({
    title: `${name} — Brawl Stats`,
    text,
    url,
  });
  return {
    shared: res.success && res.method === "native",
    copiedFallback: res.success && res.method === "clipboard",
  };
}
