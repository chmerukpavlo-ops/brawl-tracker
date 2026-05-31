/**
 * Універсальний клієнт для Server-Sent Events на основі fetch + ReadableStream.
 *
 * Серверні події приходять у форматі:
 *   data: {"type":"chunk","text":"..."}\n\n
 *
 * Генератор yield'ить кожну розпарсену JSON-подію. Підтримує AbortSignal через
 * стандартний RequestInit.signal.
 */

export interface SseChunkEvent {
  type: "chunk";
  text: string;
}

export interface SseDoneEvent {
  type: "done";
}

export interface SseErrorEvent {
  type: "error";
  message: string;
}

export type SseEvent = SseChunkEvent | SseDoneEvent | SseErrorEvent;

export class SseHttpError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message || `HTTP ${status}`);
    this.name = "SseHttpError";
    this.status = status;
  }
}

export async function* streamSse(
  url: string,
  init?: RequestInit
): AsyncGenerator<SseEvent, void, void> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new SseHttpError(response.status, `HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error("Стрімінг не підтримується цим браузером");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Спробуй розпарсити те, що лишилось у буфері.
        const tail = parseBlock(buffer.trim());
        if (tail) yield tail;
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      // SSE-події розділені порожнім рядком (`\n\n`).
      let separator = buffer.indexOf("\n\n");
      while (separator >= 0) {
        const block = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        const parsed = parseBlock(block);
        if (parsed) yield parsed;
        separator = buffer.indexOf("\n\n");
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
  }
}

function parseBlock(block: string): SseEvent | null {
  if (!block) return null;
  // У SSE-блоці може бути кілька рядків; нас цікавить лише data:
  const dataLines = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).replace(/^\s/, ""));
  if (dataLines.length === 0) return null;
  const payload = dataLines.join("\n");
  try {
    return JSON.parse(payload) as SseEvent;
  } catch {
    return null;
  }
}
