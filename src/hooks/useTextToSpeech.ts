/**
 * Глобальний TTS-менеджер на базі Web Speech API + хуки для UI.
 *
 * Архітектура:
 *   - `voicesStore` — список доступних голосів (оновлюється на
 *     `voiceschanged` + polling до 2 c для Safari).
 *   - `prefsStore` — користувацькі налаштування (voice / rate / pitch /
 *     volume / autoPlay / enabled), persistent у `localStorage`.
 *   - `playbackStore` — стан поточного відтворення (sentences,
 *     currentSentenceIndex, isSpeaking, isPaused, sourceId).
 *
 * Всі consumer-компоненти підписуються через `useSyncExternalStore`,
 * тому стан між CoachPanel, AdviceDetailSheet і VoicePlayer завжди
 * консистентний.
 */
import { useSyncExternalStore } from "react";
import { trackAchievementEvent } from "./useAchievements";
import {
  cleanForSpeech,
  splitIntoSentences,
  type SpeechSentence,
} from "../utils/textCleaner";

// ── support detection ──────────────────────────────────────────────
export function isTtsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

// ── voices store ──────────────────────────────────────────────────
const voicesListeners = new Set<() => void>();
let voicesCache: SpeechSynthesisVoice[] = [];

function readVoices(): SpeechSynthesisVoice[] {
  if (!isTtsSupported()) return [];
  try {
    return window.speechSynthesis.getVoices();
  } catch {
    return [];
  }
}

function emitVoices(): void {
  voicesListeners.forEach((l) => l());
}

if (isTtsSupported()) {
  voicesCache = readVoices();
  // `voiceschanged` спрацьовує при ленивому завантаженні голосів.
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    voicesCache = readVoices();
    emitVoices();
  });
  // Поллер для Safari/iOS: getVoices() інколи повертає [] перші ~1 с.
  if (voicesCache.length === 0) {
    let attempts = 0;
    const poll = window.setInterval(() => {
      attempts += 1;
      const next = readVoices();
      if (next.length > 0) {
        voicesCache = next;
        emitVoices();
        window.clearInterval(poll);
      } else if (attempts >= 20) {
        window.clearInterval(poll);
      }
    }, 100);
  }
}

function subscribeVoices(l: () => void): () => void {
  voicesListeners.add(l);
  return () => {
    voicesListeners.delete(l);
  };
}

export function useTtsVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(
    subscribeVoices,
    () => voicesCache,
    () => voicesCache
  );
}

/**
 * Підбирає голос за збереженим іменем; інакше пріоритезує uk-UA → uk →
 * ru → en. Повертає `null` якщо голоси ще не підвантажились.
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  preferredName: string | null
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  if (preferredName) {
    const exact = voices.find((v) => v.name === preferredName);
    if (exact) return exact;
  }
  const byLang = (predicate: (lang: string) => boolean) =>
    voices.find((v) => predicate((v.lang ?? "").toLowerCase()));
  return (
    byLang((l) => l === "uk-ua") ??
    byLang((l) => l.startsWith("uk")) ??
    byLang((l) => l === "ru-ru") ??
    byLang((l) => l.startsWith("ru")) ??
    byLang((l) => l.startsWith("en")) ??
    voices[0] ??
    null
  );
}

// ── preferences store ─────────────────────────────────────────────
export interface VoicePrefs {
  voiceName: string | null;
  rate: number;
  pitch: number;
  volume: number;
  autoPlay: boolean;
  enabled: boolean;
}

const PREFS_KEY = "brawl_voice_prefs";
const DEFAULT_PREFS: VoicePrefs = {
  voiceName: null,
  rate: 1,
  pitch: 1,
  volume: 1,
  autoPlay: false,
  enabled: true,
};

function readPrefs(): VoicePrefs {
  if (typeof localStorage === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<VoicePrefs>;
    return {
      voiceName: typeof parsed.voiceName === "string" ? parsed.voiceName : null,
      rate: clamp(typeof parsed.rate === "number" ? parsed.rate : 1, 0.5, 2),
      pitch: clamp(typeof parsed.pitch === "number" ? parsed.pitch : 1, 0.5, 2),
      volume: clamp(typeof parsed.volume === "number" ? parsed.volume : 1, 0, 1),
      autoPlay: !!parsed.autoPlay,
      enabled: parsed.enabled !== false,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

let prefsCache: VoicePrefs = readPrefs();
const prefsListeners = new Set<() => void>();

function emitPrefs(): void {
  prefsListeners.forEach((l) => l());
}

function writePrefs(next: VoicePrefs): void {
  prefsCache = next;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    }
  } catch {
    /* ignore */
  }
  emitPrefs();
}

export function updateVoicePrefs(patch: Partial<VoicePrefs>): VoicePrefs {
  const next: VoicePrefs = {
    ...prefsCache,
    ...patch,
    rate: patch.rate !== undefined ? clamp(patch.rate, 0.5, 2) : prefsCache.rate,
    pitch:
      patch.pitch !== undefined ? clamp(patch.pitch, 0.5, 2) : prefsCache.pitch,
    volume:
      patch.volume !== undefined ? clamp(patch.volume, 0, 1) : prefsCache.volume,
  };
  writePrefs(next);
  return next;
}

export function getVoicePrefs(): VoicePrefs {
  return prefsCache;
}

export function useVoicePrefs(): VoicePrefs {
  return useSyncExternalStore(
    (l) => {
      prefsListeners.add(l);
      return () => {
        prefsListeners.delete(l);
      };
    },
    () => prefsCache,
    () => prefsCache
  );
}

// ── playback store ────────────────────────────────────────────────
export interface PlaybackState {
  isSpeaking: boolean;
  isPaused: boolean;
  currentSentenceIndex: number;
  sentences: SpeechSentence[];
  sourceId: string | null;
  error: string | null;
  startedAt: number | null;
}

const INITIAL_PLAYBACK: PlaybackState = {
  isSpeaking: false,
  isPaused: false,
  currentSentenceIndex: 0,
  sentences: [],
  sourceId: null,
  error: null,
  startedAt: null,
};

let playbackState: PlaybackState = { ...INITIAL_PLAYBACK };
const playbackListeners = new Set<() => void>();

function setPlayback(patch: Partial<PlaybackState>): void {
  playbackState = { ...playbackState, ...patch };
  playbackListeners.forEach((l) => l());
}

function subscribePlayback(l: () => void): () => void {
  playbackListeners.add(l);
  return () => {
    playbackListeners.delete(l);
  };
}

export function usePlaybackState(): PlaybackState {
  return useSyncExternalStore(
    subscribePlayback,
    () => playbackState,
    () => playbackState
  );
}

// ── engine ────────────────────────────────────────────────────────
const SAFE_CHUNK_LEN = 200;
let activeUtteranceIds: number[] = [];
let utteranceCounter = 0;

function chunkSentence(text: string): string[] {
  if (text.length <= SAFE_CHUNK_LEN) return [text];
  // Розрізаємо по словах, не перевищуючи SAFE_CHUNK_LEN.
  const words = text.split(" ");
  const out: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > SAFE_CHUNK_LEN) {
      if (current) out.push(current.trim());
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) out.push(current.trim());
  return out;
}

function buildUtterance(
  text: string,
  voice: SpeechSynthesisVoice | null,
  prefs: VoicePrefs
): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = prefs.rate;
  u.pitch = prefs.pitch;
  u.volume = prefs.volume;
  u.lang = voice?.lang ?? "uk-UA";
  return u;
}

interface SpeakOptions {
  sourceId: string;
  /** Якщо передати, починаємо з цього індексу (для seek / зміни швидкості). */
  startIndex?: number;
}

/** Внутрішній movement: чергуємо utterance-и, починаючи з `from`. */
function enqueueFrom(
  sentences: SpeechSentence[],
  from: number,
  prefs: VoicePrefs,
  voice: SpeechSynthesisVoice | null
): void {
  const synth = window.speechSynthesis;
  activeUtteranceIds = [];

  for (let i = from; i < sentences.length; i++) {
    const sentenceIndex = i;
    const chunks = chunkSentence(sentences[i].spoken);
    chunks.forEach((chunk, chunkIdx) => {
      const u = buildUtterance(chunk, voice, prefs);
      const myId = ++utteranceCounter;
      activeUtteranceIds.push(myId);
      u.onstart = () => {
        if (!activeUtteranceIds.includes(myId)) return;
        if (chunkIdx === 0) {
          setPlayback({
            currentSentenceIndex: sentenceIndex,
            isSpeaking: true,
            isPaused: false,
          });
        }
      };
      u.onend = () => {
        if (!activeUtteranceIds.includes(myId)) return;
        activeUtteranceIds = activeUtteranceIds.filter((id) => id !== myId);
        const lastChunk = chunkIdx === chunks.length - 1;
        const lastSentence = sentenceIndex === sentences.length - 1;
        if (lastChunk && lastSentence && activeUtteranceIds.length === 0) {
          finishPlayback();
        }
      };
      u.onerror = (event) => {
        if (!activeUtteranceIds.includes(myId)) return;
        const ev = event as SpeechSynthesisErrorEvent;
        // `canceled`/`interrupted` — нормальні події при stop/seek, не помилка.
        if (ev.error === "canceled" || ev.error === "interrupted") return;
        setPlayback({ error: ev.error ?? "speech-error" });
        ttsStop();
      };
      synth.speak(u);
    });
  }
}

function finishPlayback(): void {
  const startedAt = playbackState.startedAt;
  const duration =
    startedAt && playbackState.sentences.length > 0
      ? Math.round((Date.now() - startedAt) / 1000)
      : 0;
  setPlayback({
    isSpeaking: false,
    isPaused: false,
    currentSentenceIndex: 0,
    sentences: [],
    sourceId: null,
    startedAt: null,
  });
  if (duration >= 60) {
    trackAchievementEvent("voice_long_session", { durationSec: duration });
  }
}

/**
 * Озвучує markdown-текст. Якщо вже грає інший — попереднє скасовується.
 */
export function ttsSpeak(markdown: string, options: SpeakOptions): boolean {
  if (!isTtsSupported()) return false;
  const sentences = splitIntoSentences(markdown);
  if (sentences.length === 0) return false;
  const prefs = getVoicePrefs();
  if (!prefs.enabled) return false;
  const voice = pickVoice(voicesCache, prefs.voiceName);

  ttsStop(); // cancel будь-яке попереднє відтворення

  setPlayback({
    isSpeaking: true,
    isPaused: false,
    currentSentenceIndex: options.startIndex ?? 0,
    sentences,
    sourceId: options.sourceId,
    error: null,
    startedAt: Date.now(),
  });

  trackAchievementEvent("voice_play");

  // `getVoices()` може повернути порожньо в Safari на першому виклику —
  // даємо мікротік, щоб onvoiceschanged спрацював.
  if (voicesCache.length === 0) {
    window.setTimeout(() => {
      const v = pickVoice(voicesCache, prefs.voiceName);
      enqueueFrom(sentences, options.startIndex ?? 0, prefs, v);
    }, 120);
  } else {
    enqueueFrom(sentences, options.startIndex ?? 0, prefs, voice);
  }
  return true;
}

export function ttsPause(): void {
  if (!isTtsSupported()) return;
  if (!playbackState.isSpeaking || playbackState.isPaused) return;
  window.speechSynthesis.pause();
  setPlayback({ isPaused: true });
}

export function ttsResume(): void {
  if (!isTtsSupported()) return;
  if (!playbackState.isPaused) return;
  window.speechSynthesis.resume();
  setPlayback({ isPaused: false });
}

export function ttsStop(): void {
  if (!isTtsSupported()) {
    setPlayback({ ...INITIAL_PLAYBACK });
    return;
  }
  activeUtteranceIds = [];
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  setPlayback({ ...INITIAL_PLAYBACK });
}

/**
 * Перейти на конкретне речення поточного відтворення (cancel + restart from).
 * Якщо нічого не грає — нічого не робить.
 */
export function ttsSeek(index: number): void {
  const { sentences, sourceId } = playbackState;
  if (sentences.length === 0 || sourceId === null) return;
  const target = clamp(index, 0, sentences.length - 1);
  const prefs = getVoicePrefs();
  const voice = pickVoice(voicesCache, prefs.voiceName);
  activeUtteranceIds = [];
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  setPlayback({
    isSpeaking: true,
    isPaused: false,
    currentSentenceIndex: target,
    error: null,
    startedAt: Date.now(),
  });
  enqueueFrom(sentences, target, prefs, voice);
}

/** Повний restart з поточного індексу (наприклад при зміні швидкості). */
export function ttsRestartFromCurrent(): void {
  if (!playbackState.isSpeaking) return;
  ttsSeek(playbackState.currentSentenceIndex);
}

/**
 * Зручний хелпер «застосувати rate live»: якщо грає — рестартить з
 * поточного речення з новим rate; інакше просто оновлює prefs.
 */
export function applyRate(rate: number): void {
  updateVoicePrefs({ rate });
  if (playbackState.isSpeaking) {
    ttsRestartFromCurrent();
  }
}

export function applyVoice(voiceName: string | null): void {
  updateVoicePrefs({ voiceName });
  if (playbackState.isSpeaking) {
    ttsRestartFromCurrent();
  }
}

// ── visibility resume ──────────────────────────────────────────────
if (typeof document !== "undefined" && isTtsSupported()) {
  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState === "visible" &&
      playbackState.isSpeaking &&
      window.speechSynthesis.paused
    ) {
      window.speechSynthesis.resume();
    }
  });
}

// ── high-level hook ───────────────────────────────────────────────
export interface UseTextToSpeechApi {
  /** Чи доступний Web Speech API у поточному середовищі. */
  isSupported: boolean;
  /** Список доступних голосів (із voicesCache). */
  voices: SpeechSynthesisVoice[];
  /** Поточний обраний голос (resolved). */
  voice: SpeechSynthesisVoice | null;
  /** Persistent користувацькі налаштування. */
  prefs: VoicePrefs;
  /** Поточний стан відтворення. */
  playback: PlaybackState;
  /** Чи саме цей `sourceId` зараз озвучується. */
  isActiveSource: (sourceId: string) => boolean;
  speak: (markdown: string, options: SpeakOptions) => boolean;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (index: number) => void;
  setRate: (rate: number) => void;
  setVoice: (voiceName: string | null) => void;
  setPrefs: (patch: Partial<VoicePrefs>) => void;
}

export function useTextToSpeech(): UseTextToSpeechApi {
  const supported = isTtsSupported();
  const voices = useTtsVoices();
  const prefs = useVoicePrefs();
  const playback = usePlaybackState();
  const voice = pickVoice(voices, prefs.voiceName);

  return {
    isSupported: supported,
    voices,
    voice,
    prefs,
    playback,
    isActiveSource: (sourceId) => playback.sourceId === sourceId,
    speak: ttsSpeak,
    pause: ttsPause,
    resume: ttsResume,
    stop: ttsStop,
    seek: ttsSeek,
    setRate: applyRate,
    setVoice: applyVoice,
    setPrefs: updateVoicePrefs,
  };
}

/**
 * Демо-фраза для тесту голосу в Settings.
 */
export const VOICE_TEST_PHRASE =
  "Привіт! Я твій AI Coach. Готовий ділитися порадами для перемог у Brawl Stars.";

export function speakTestPhrase(): boolean {
  return ttsSpeak(cleanForSpeech(VOICE_TEST_PHRASE), { sourceId: "test" });
}
