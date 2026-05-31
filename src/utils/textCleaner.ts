/**
 * Утиліти для підготовки тексту під Web Speech API.
 *
 * Стратегія: розрізаємо markdown на «речення» і для кожного зберігаємо
 * пару (display, spoken):
 *   - `display` — оригінал з markdown-розміткою (для UI з підсвіткою);
 *   - `spoken`  — почищений текст, який віддаємо в `SpeechSynthesisUtterance`.
 */

export interface SpeechSentence {
  /** Текст для UI (з markdown-символами). */
  display: string;
  /** Текст для TTS-движка (cleanForSpeech). */
  spoken: string;
}

const EMOJI_RE =
  /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bAI\b/g, "Ей Ай"],
  [/\bXP\b/g, "ікс пі"],
  [/\b3v3\b/gi, "три проти трьох"],
  [/\b5v5\b/gi, "пʼять проти пʼяти"],
  [/\b1v1\b/gi, "один на один"],
  [/\bvs\b/gi, "проти"],
  [/\bHP\b/g, "ейч пі"],
  [/\bMVP\b/g, "ем ві пі"],
];

/**
 * Очищає markdown і нестандартні символи. Зберігає пунктуацію — вона
 * критична для прозодії TTS.
 */
export function cleanForSpeech(text: string): string {
  if (!text) return "";
  let out = text;
  // Markdown headings (### ## #) на початку рядка.
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  // Bold/italic/strikethrough маркери.
  out = out.replace(/(\*\*|__|~~)(.+?)\1/g, "$2");
  out = out.replace(/(\*|_)([^*_\n]+)\1/g, "$2");
  // Inline code та code fences.
  out = out.replace(/```[\s\S]*?```/g, "");
  out = out.replace(/`([^`]+)`/g, "$1");
  // Blockquote / list markers / horizontal rules.
  out = out.replace(/^\s{0,3}>+\s?/gm, "");
  out = out.replace(/^\s*[-*+]\s+/gm, "");
  out = out.replace(/^\s*\d+\.\s+/gm, "");
  out = out.replace(/^-{3,}\s*$/gm, "");
  // Markdown links: [label](url) → label.
  out = out.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Pipes (markdown tables — рідко, але буває).
  out = out.replace(/\|/g, " ");
  // Emoji — більшість движків озвучує «smiling face», тож вирізаємо.
  out = out.replace(EMOJI_RE, "");
  // Абревіатури → людська вимова.
  for (const [re, repl] of ABBREVIATIONS) {
    out = out.replace(re, repl);
  }
  // Множинні пробіли + порожні рядки.
  out = out.replace(/[ \t]+/g, " ");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

const SENTENCE_END_RE = /([.!?]+)(\s+|$)/g;
const MIN_SENTENCE_LEN = 10;

/**
 * Розбиває markdown на масив «речень» зі збереженою markdown-розміткою.
 * Заголовки (### …) виходять окремими реченнями; короткі фрагменти
 * злипаються з попереднім, щоб TTS не «крапав».
 */
export function splitIntoSentences(markdown: string): SpeechSentence[] {
  if (!markdown || !markdown.trim()) return [];

  const blocks: string[] = [];
  for (const rawBlock of markdown.split(/\n+/)) {
    const block = rawBlock.trim();
    if (!block) continue;
    // Heading — окремий блок.
    if (/^\s{0,3}#{1,6}\s+/.test(block)) {
      blocks.push(block);
      continue;
    }
    // Bullet/numbered list item — окремий блок (без подальшого split).
    if (/^\s*([-*+]|\d+\.)\s+/.test(block)) {
      blocks.push(block);
      continue;
    }
    // Звичайний параграф — ріжемо по реченнях.
    const parts: string[] = [];
    let lastIndex = 0;
    for (const match of block.matchAll(SENTENCE_END_RE)) {
      const end = (match.index ?? 0) + match[1].length;
      parts.push(block.slice(lastIndex, end).trim());
      lastIndex = end + (match[2]?.length ?? 0);
    }
    if (lastIndex < block.length) {
      parts.push(block.slice(lastIndex).trim());
    }
    for (const p of parts) {
      if (p) blocks.push(p);
    }
  }

  // Merge надто коротких фрагментів з попереднім, щоб не «крапав» TTS.
  const merged: string[] = [];
  for (const piece of blocks) {
    if (merged.length === 0) {
      merged.push(piece);
      continue;
    }
    const last = merged[merged.length - 1];
    const cleanedLen = cleanForSpeech(piece).length;
    if (cleanedLen < MIN_SENTENCE_LEN) {
      merged[merged.length - 1] = `${last} ${piece}`.trim();
    } else {
      merged.push(piece);
    }
  }

  return merged
    .map<SpeechSentence>((display) => ({
      display,
      spoken: cleanForSpeech(display),
    }))
    .filter((s) => s.spoken.length > 0);
}

/**
 * Приблизна тривалість читання у секундах (на 150 слів/хв при rate=1.0).
 */
export function estimateReadingDuration(text: string, rate = 1): number {
  const words = text.trim().split(/\s+/).length;
  const wpm = 150 * rate;
  return Math.max(1, Math.round((words / wpm) * 60));
}
