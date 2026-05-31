import { useCallback, useState } from "react";
import {
  Headphones,
  Maximize2,
  Pause,
  Play,
  SlidersHorizontal,
  Square,
} from "lucide-react";
import { motion } from "motion/react";
import BottomSheet from "./BottomSheet";
import SentenceHighlighter from "./SentenceHighlighter";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { haptic } from "../hooks/useHaptic";
import { useToast } from "../context/ToastContext";

interface VoicePlayerProps {
  /** Унікальний ідентифікатор контексту відтворення (advice id або "coach"). */
  sourceId: string;
  /** Markdown-текст для озвучення. */
  text: string;
  /** Доступний для дій лише якщо `sourceId` збігається з активним. */
  className?: string;
  /** Optional: коли активний source змінився на чужий, прибираємо панель. */
  hideWhenInactive?: boolean;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

/**
 * Compact sticky-style controls для активного TTS-сеансу + expandable
 * BottomSheet з повним керуванням (голос, sliders, sentence list).
 */
export default function VoicePlayer({
  sourceId,
  text,
  className = "",
  hideWhenInactive = true,
}: VoicePlayerProps) {
  const {
    isSupported,
    voices,
    voice,
    prefs,
    playback,
    isActiveSource,
    pause,
    resume,
    stop,
    seek,
    setRate,
    setVoice,
    setPrefs,
    speak,
  } = useTextToSpeech();
  const reducedMotion = usePrefersReducedMotion();
  const { showError } = useToast();
  const [expanded, setExpanded] = useState(false);

  const isMine = isActiveSource(sourceId);
  const active = isMine && (playback.isSpeaking || playback.isPaused);

  const handleTogglePlay = useCallback(() => {
    if (!isSupported) {
      showError("Голосове озвучення не підтримується у цьому браузері");
      return;
    }
    if (!isMine) {
      // Запустити з початку — наш source.
      const ok = speak(text, { sourceId });
      if (!ok) showError("Не вдалося запустити озвучення");
      haptic.light();
      return;
    }
    if (playback.isPaused) {
      resume();
      haptic.selection();
    } else if (playback.isSpeaking) {
      pause();
      haptic.selection();
    } else {
      const ok = speak(text, { sourceId });
      if (!ok) showError("Не вдалося запустити озвучення");
      haptic.light();
    }
  }, [
    isSupported,
    isMine,
    playback.isPaused,
    playback.isSpeaking,
    pause,
    resume,
    speak,
    text,
    sourceId,
    showError,
  ]);

  const handleStop = useCallback(() => {
    stop();
    haptic.medium();
  }, [stop]);

  const handleSpeed = useCallback(
    (rate: number) => {
      setRate(rate);
      haptic.selection();
    },
    [setRate]
  );

  if (!isSupported) return null;
  if (!active && hideWhenInactive) return null;

  const currentSentence = active ? playback.currentSentenceIndex + 1 : 0;
  const totalSentences = active ? playback.sentences.length : 0;

  return (
    <>
      <motion.div
        layout={!reducedMotion}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className={`flex items-center gap-2 rounded-2xl border border-[#facc15]/30 bg-[#1a0a2e]/80 p-2 backdrop-blur ${className}`}
        role="region"
        aria-label="Контроли голосового відтворення"
      >
        <button
          type="button"
          onClick={handleTogglePlay}
          aria-label={playback.isPaused ? "Відновити" : playback.isSpeaking ? "Пауза" : "Грати"}
          aria-pressed={active && !playback.isPaused}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#facc15] text-[#1a0a2e] shadow-[0_0_18px_rgba(250,204,21,0.4)] active:scale-95"
        >
          {playback.isSpeaking && !playback.isPaused ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SoundWave active={active && !playback.isPaused} reducedMotion={reducedMotion} />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-widest text-[#facc15]">
              {playback.isPaused ? "Пауза" : "Озвучую"}
            </p>
            <p className="truncate text-[10px] text-slate-400">
              Речення {currentSentence} з {totalSentences}
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-0.5 sm:flex">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSpeed(s)}
              className={`rounded-full px-2 py-1 text-[10px] font-black tabular-nums ${
                prefs.rate === s
                  ? "bg-[#7c3aed] text-white"
                  : "text-slate-400 active:text-slate-200"
              }`}
              aria-pressed={prefs.rate === s}
              aria-label={`Швидкість ${s}x`}
            >
              {s}x
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            haptic.light();
            setExpanded(true);
          }}
          aria-label="Відкрити повне керування озвученням"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 active:scale-95"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={handleStop}
          aria-label="Зупинити озвучення"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/10 text-rose-200 active:scale-95"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
      </motion.div>

      <BottomSheet
        open={expanded}
        onClose={() => setExpanded(false)}
        title="Голосове відтворення"
      >
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#2a1a4a] p-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePlay}
                aria-label={playback.isPaused ? "Відновити" : playback.isSpeaking ? "Пауза" : "Грати"}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#facc15] text-[#1a0a2e] active:scale-95"
              >
                {playback.isSpeaking && !playback.isPaused ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                )}
              </button>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-white">
                  {playback.isPaused ? "Пауза" : "Озвучення"}
                </p>
                <p className="text-[10px] text-slate-400">
                  Речення {currentSentence} з {totalSentences}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStop}
              aria-label="Зупинити"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-500/10 text-rose-200 active:scale-95"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Швидкість
            </p>
            <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-0.5">
              {SPEED_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSpeed(s)}
                  className={`flex-1 rounded-full px-2 py-1.5 text-[11px] font-black tabular-nums ${
                    prefs.rate === s
                      ? "bg-[#7c3aed] text-white"
                      : "text-slate-400 active:text-slate-200"
                  }`}
                  aria-pressed={prefs.rate === s}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <PitchSlider
            label="Висота"
            min={0.5}
            max={2}
            step={0.1}
            value={prefs.pitch}
            onChange={(v) => setPrefs({ pitch: v })}
          />
          <PitchSlider
            label="Гучність"
            min={0}
            max={1}
            step={0.05}
            value={prefs.volume}
            onChange={(v) => setPrefs({ volume: v })}
          />

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <SlidersHorizontal className="h-3 w-3" />
              Голос {voice && <span className="ml-1 text-slate-400 normal-case">({voice.lang})</span>}
            </p>
            {voices.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-3 text-[11px] text-slate-500">
                Голоси ще завантажуються. Якщо вони не зʼявляться — у вашому браузері
                немає встановлених системних голосів.
              </p>
            ) : (
              <select
                value={prefs.voiceName ?? ""}
                onChange={(e) => setVoice(e.target.value || null)}
                className="w-full rounded-xl border border-white/10 bg-[#1a0a2e] px-3 py-2 text-xs text-white focus:border-[#7c3aed]/50 focus:outline-none"
                aria-label="Виберіть голос"
              >
                <option value="">Авто (uk → ru → en)</option>
                {voices
                  .slice()
                  .sort((a, b) => a.lang.localeCompare(b.lang))
                  .map((v) => (
                    <option key={`${v.name}-${v.lang}`} value={v.name}>
                      {v.name} · {v.lang}
                      {v.default ? " · default" : ""}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {playback.sentences.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <Headphones className="h-3 w-3" />
                Текст · тап щоб перейти
              </p>
              <SentenceHighlighter
                sentences={playback.sentences}
                currentIndex={playback.currentSentenceIndex}
                isPaused={playback.isPaused}
                onSentenceClick={(idx) => {
                  seek(idx);
                  haptic.light();
                }}
                maxHeightClass="max-h-[260px]"
              />
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  );
}

function SoundWave({
  active,
  reducedMotion,
}: {
  active: boolean;
  reducedMotion: boolean;
}) {
  const bars = [0, 1, 2, 3, 4];
  if (reducedMotion || !active) {
    return (
      <div aria-hidden className="flex h-4 items-end gap-0.5">
        {bars.map((i) => (
          <span
            key={i}
            className="w-0.5 rounded-full bg-[#facc15]/60"
            style={{ height: active ? "12px" : "4px" }}
          />
        ))}
      </div>
    );
  }
  return (
    <div aria-hidden className="flex h-4 items-end gap-0.5">
      {bars.map((i) => (
        <motion.span
          key={i}
          className="w-0.5 rounded-full bg-[#facc15]"
          animate={{ height: [4, 14, 6, 12, 8, 4] }}
          transition={{
            duration: 1.1 + i * 0.07,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
}

function PitchSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
        <span>{label}</span>
        <span className="tabular-nums text-slate-300">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#facc15]"
        aria-label={label}
      />
    </label>
  );
}
