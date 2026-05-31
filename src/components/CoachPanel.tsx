import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Library,
  RefreshCw,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
  Zap,
  MessageCircleQuestion,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { haptic } from "../hooks/useHaptic";
import CoachPanelSkeleton from "./skeletons/CoachPanelSkeleton";
import EmptyState from "./EmptyState";
import AiPromptPicker from "./AiPromptPicker";
import AiHistoryView from "./AiHistoryView";
import BrawlerAvatar from "./BrawlerAvatar";
import VoicePlayer from "./VoicePlayer";
import { CATEGORY_STYLE, type AiPromptPreset } from "../data/aiPrompts";
import { getPresetIcon } from "../data/aiPromptIcons";
import type { BrawlerInfo } from "../types";
import { useAiHistory } from "../hooks/useAiHistory";
import { updateUrl } from "../navigation/urlState";
import { useTextToSpeech } from "../hooks/useTextToSpeech";

const AUTOSCROLL_THRESHOLD_PX = 32;

interface ParsedLine {
  kind: "heading" | "bold" | "text" | "empty";
  raw: string;
}

function parseLines(advice: string): ParsedLine[] {
  return advice.split("\n").map<ParsedLine>((line) => {
    const trimmed = line.trim();
    if (!trimmed) return { kind: "empty", raw: line };
    if (trimmed.startsWith("###")) return { kind: "heading", raw: line };
    if (line.includes("**")) return { kind: "bold", raw: line };
    return { kind: "text", raw: line };
  });
}

function renderBoldLine(line: string): ReactNode {
  const parts = line.split("**");
  return parts.map((part, pIdx) =>
    pIdx % 2 === 1 ? (
      <strong key={pIdx} className="text-[#facc15]">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

export default function CoachPanel() {
  const {
    aiAdvice,
    isAiLoading,
    aiLoadingMessage,
    aiStreamingActive,
    fetchAiCoach,
    abortAiCoach,
    activeAiPreset,
    activeAiBrawler,
    clearAiPreset,
  } = usePlayer();
  const { showInfo, showSuccess, showError } = useToast();
  const { history } = useAiHistory();
  const reducedMotion = usePrefersReducedMotion();
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const previousStreamingRef = useRef(false);
  const lastHistoryIdRef = useRef<string | null>(history[0]?.id ?? null);

  const VOICE_SOURCE = "coach";
  const tts = useTextToSpeech();
  const isMyVoice = tts.isActiveSource(VOICE_SOURCE);
  const voiceActive = isMyVoice && (tts.playback.isSpeaking || tts.playback.isPaused);

  const hasChunks = !!aiAdvice && aiAdvice.length > 0;
  const showSkeleton = isAiLoading && !hasChunks;

  const lines = useMemo(
    () => (aiAdvice ? parseLines(aiAdvice) : []),
    [aiAdvice]
  );

  // Auto-scroll to bottom while streaming, але поважаємо ручний скрол вгору.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !aiStreamingActive) return;
    if (!stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [aiAdvice, aiStreamingActive]);

  const handleScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= AUTOSCROLL_THRESHOLD_PX;
  }, []);

  // Коли streaming закінчився — показуємо toast «Збережено» з action «Подивитись»
  // та (опційно) автоматично запускаємо TTS, якщо ввімкнено в Settings.
  useEffect(() => {
    const wasStreaming = previousStreamingRef.current;
    previousStreamingRef.current = aiStreamingActive;
    if (!wasStreaming || aiStreamingActive) return;

    if (
      tts.isSupported &&
      tts.prefs.enabled &&
      tts.prefs.autoPlay &&
      aiAdvice &&
      aiAdvice.length > 0
    ) {
      tts.speak(aiAdvice, { sourceId: VOICE_SOURCE });
    }

    const newest = history[0];
    if (!newest) return;
    if (newest.id === lastHistoryIdRef.current) return;
    lastHistoryIdRef.current = newest.id;
    if (!newest.isAutoSaved) return;
    showSuccess("Збережено в бібліотеку", {
      duration: 4000,
      action: {
        label: "Подивитись",
        onClick: () => {
          updateUrl({ advice: newest.id });
        },
      },
    });
  }, [aiStreamingActive, history, showSuccess, aiAdvice, tts]);

  // Якщо advice оновлюється під час озвучення — зупиняємо стару доріжку.
  useEffect(() => {
    if (!voiceActive) return;
    if (!aiStreamingActive) return;
    tts.stop();
  }, [aiStreamingActive, voiceActive, tts]);

  // При unmount — зупинити нашу доріжку.
  useEffect(() => {
    return () => {
      if (tts.isActiveSource(VOICE_SOURCE)) {
        tts.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (!tts.isSupported) {
      showError("Голосове озвучення не підтримується у цьому браузері");
      return;
    }
    if (!aiAdvice || aiAdvice.length === 0) return;
    if (voiceActive) {
      tts.stop();
      haptic.medium();
      return;
    }
    const ok = tts.speak(aiAdvice, { sourceId: VOICE_SOURCE });
    if (!ok) {
      showError("Не вдалося запустити озвучення");
    } else {
      haptic.light();
    }
  }, [tts, aiAdvice, voiceActive, showError]);

  const handleStart = useCallback(() => {
    stickToBottomRef.current = true;
    fetchAiCoach(
      activeAiPreset
        ? {
            presetId: activeAiPreset.id,
            brawler: activeAiBrawler ?? undefined,
          }
        : undefined
    );
  }, [fetchAiCoach, activeAiPreset, activeAiBrawler]);

  const handleStop = useCallback(() => {
    abortAiCoach();
    haptic.medium();
    showInfo("Аналіз зупинено");
  }, [abortAiCoach, showInfo]);

  const handlePresetSelect = useCallback(
    (preset: AiPromptPreset, brawler?: BrawlerInfo) => {
      stickToBottomRef.current = true;
      fetchAiCoach({ presetId: preset.id, brawler });
    },
    [fetchAiCoach]
  );

  const handleClearPreset = useCallback(() => {
    haptic.light();
    clearAiPreset();
  }, [clearAiPreset]);

  const buttonState: "idle" | "streaming" | "done" = aiStreamingActive
    ? "streaming"
    : hasChunks
    ? "done"
    : "idle";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#2a1a4a] p-5">
      <div className="pointer-events-none absolute -right-8 -top-8 opacity-5">
        <Sparkles className="h-32 w-32 text-[#facc15]" />
      </div>

      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[#7c3aed]/30 bg-[#7c3aed]/20 p-2.5 text-[#a78bfa]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              AI-Тренер
            </h3>
            <p className="text-[11px] text-slate-400">
              {activeAiPreset
                ? activeAiPreset.description
                : "Аналіз стилю гри та поради"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {tts.isSupported && tts.prefs.enabled && hasChunks && !aiStreamingActive && (
            <button
              type="button"
              onClick={handleVoiceToggle}
              aria-label={voiceActive ? "Зупинити озвучення" : "Прослухати"}
              aria-pressed={voiceActive}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors active:scale-95 ${
                voiceActive
                  ? "border-[#facc15]/50 bg-[#facc15]/15 text-[#facc15]"
                  : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {voiceActive ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
          )}
          {buttonState === "streaming" ? (
            <button
              type="button"
              onClick={handleStop}
              aria-label="Зупинити аналіз"
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 text-xs font-black uppercase text-rose-200 active:scale-95"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Зупинити
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={isAiLoading}
              aria-label={
                buttonState === "done" ? "Аналізувати ще раз" : "Запустити аналіз"
              }
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#facc15]/30 bg-[#1a0a2e] px-4 text-xs font-black uppercase text-[#facc15] active:scale-95 disabled:opacity-50"
            >
              {buttonState === "done" ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {buttonState === "done" ? "Ще раз" : "Аналіз"}
            </button>
          )}
        </div>
      </div>

      {hasChunks && aiAdvice && (
        <VoicePlayer
          sourceId={VOICE_SOURCE}
          text={aiAdvice}
          className="mt-3"
        />
      )}

      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            haptic.light();
            setPickerOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#7c3aed]/40 bg-[#7c3aed]/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#c4b5fd] active:scale-95"
        >
          <MessageCircleQuestion className="h-3.5 w-3.5" />
          Швидкі питання
        </button>

        <button
          type="button"
          onClick={() => {
            haptic.light();
            setLibraryOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-300 active:scale-95"
          aria-label={`Бібліотека порад (${history.length})`}
        >
          <Library className="h-3.5 w-3.5 text-[#facc15]" />
          Бібліотека
          {history.length > 0 && (
            <span className="rounded-full bg-[#facc15] px-1.5 text-[#1a0a2e]">
              {history.length}
            </span>
          )}
        </button>

        {activeAiPreset && (
          <ActivePresetBadge
            preset={activeAiPreset}
            brawler={activeAiBrawler}
            onClear={handleClearPreset}
            disabled={aiStreamingActive}
          />
        )}
      </div>

      {!isAiLoading && !hasChunks && (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-[#1a0a2e]/40">
          <EmptyState
            compact
            illustration="🤖"
            title="AI-Тренер готовий"
            description="Натисни «Аналіз» для персональних порад"
          />
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {showSkeleton && (
          <motion.div
            key="skeleton"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4"
          >
            <CoachPanelSkeleton caption={aiLoadingMessage} />
          </motion.div>
        )}

        {hasChunks && (
          <motion.div
            key="advice"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4"
          >
            <div
              ref={bodyRef}
              onScroll={handleScroll}
              role="log"
              aria-live="polite"
              aria-busy={aiStreamingActive}
              className="max-h-[320px] overflow-y-auto rounded-xl border border-white/10 bg-[#1a0a2e]/60 p-4 text-xs leading-relaxed text-slate-300"
            >
              {lines.map((line, idx) => {
                const isLast = idx === lines.length - 1;
                const cursor =
                  isLast && aiStreamingActive ? (
                    <StreamingCursor reducedMotion={reducedMotion} />
                  ) : null;

                if (line.kind === "heading") {
                  return (
                    <h4
                      key={idx}
                      className="mt-3 text-xs font-black uppercase tracking-widest text-[#facc15]"
                    >
                      {line.raw.replace(/^###\s*/, "").trim()}
                      {cursor}
                    </h4>
                  );
                }
                if (line.kind === "bold") {
                  return (
                    <p key={idx} className="my-1.5">
                      {renderBoldLine(line.raw)}
                      {cursor}
                    </p>
                  );
                }
                if (line.kind === "empty") {
                  return cursor ? (
                    <p key={idx} className="my-1">
                      {cursor}
                    </p>
                  ) : (
                    <br key={idx} />
                  );
                }
                return (
                  <p key={idx} className="my-1 text-slate-400">
                    {line.raw}
                    {cursor}
                  </p>
                );
              })}
              {lines.length === 0 && aiStreamingActive && (
                <p className="my-1">
                  <StreamingCursor reducedMotion={reducedMotion} />
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AiPromptPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePresetSelect}
      />
      <AiHistoryView
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
      />
    </div>
  );
}

function ActivePresetBadge({
  preset,
  brawler,
  onClear,
  disabled,
}: {
  preset: AiPromptPreset;
  brawler: BrawlerInfo | null;
  onClear: () => void;
  disabled?: boolean;
}) {
  const Icon = getPresetIcon(preset.icon);
  const style = CATEGORY_STYLE[preset.category];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.18 }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="max-w-[140px] truncate">{preset.title}</span>
      {brawler && (
        <span className="ml-0.5 inline-flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white">
          <BrawlerAvatar
            brawlerId={brawler.id}
            brawlerName={brawler.name}
            size={14}
            rounded="rounded-sm"
          />
          {brawler.name}
        </span>
      )}
      <button
        type="button"
        onClick={onClear}
        disabled={disabled}
        aria-label="Скинути пресет"
        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-white active:scale-90 disabled:opacity-40"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </motion.div>
  );
}

function StreamingCursor({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <span
      aria-hidden
      className={`ml-0.5 inline-block h-3.5 w-1.5 translate-y-[2px] rounded-sm bg-[#facc15] ${
        reducedMotion ? "opacity-80" : "animate-pulse"
      }`}
    />
  );
}
