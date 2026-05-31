import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  CheckCircle2,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  StickyNote,
  Trash2,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import type { BrawlerInfo, SavedAdvice } from "../types";
import { CATEGORY_STYLE, getPresetById } from "../data/aiPrompts";
import { getPresetIcon } from "../data/aiPromptIcons";
import { formatRelativeUk } from "../utils/dateUtils";
import { shareAdvicePreset } from "../utils/sharePresets";
import { useAiHistory } from "../hooks/useAiHistory";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { haptic } from "../hooks/useHaptic";
import BottomSheet from "./BottomSheet";
import ShareButton from "./ShareButton";
import VoicePlayer from "./VoicePlayer";

const SUGGESTED_TAGS = ["корисно", "перечитати", "виконано", "тренування", "стратегія"];

interface AdviceDetailSheetProps {
  advice: SavedAdvice | null;
  onClose: () => void;
}

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

export default function AdviceDetailSheet({
  advice,
  onClose,
}: AdviceDetailSheetProps) {
  const { togglePin, removeAdvice, updateAdvice, restoreAdvice } = useAiHistory();
  const { playerData, fetchAiCoach, handleQuery } = usePlayer();
  const { showSuccess, showInfo, showError } = useToast();
  const tts = useTextToSpeech();
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  const voiceSource = advice ? `advice:${advice.id}` : null;
  const isMyVoice = !!voiceSource && tts.isActiveSource(voiceSource);
  const voiceActive = isMyVoice && (tts.playback.isSpeaking || tts.playback.isPaused);

  useEffect(() => {
    if (advice) {
      setNoteDraft(advice.note ?? "");
      setEditingNote(false);
      setAddingTag(false);
      setTagDraft("");
    }
  }, [advice?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // При закритті sheet — зупиняємо наш TTS, якщо він був активним.
  useEffect(() => {
    if (advice || !isMyVoice) return;
    tts.stop();
  }, [advice, isMyVoice, tts]);

  useEffect(() => {
    return () => {
      if (voiceSource && tts.isActiveSource(voiceSource)) {
        tts.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceSource]);

  const handleVoiceToggle = useCallback(() => {
    if (!advice || !voiceSource) return;
    if (!tts.isSupported) {
      showError("Голосове озвучення не підтримується у цьому браузері");
      return;
    }
    if (voiceActive) {
      tts.stop();
      haptic.medium();
      return;
    }
    const ok = tts.speak(advice.advice, { sourceId: voiceSource });
    if (!ok) {
      showError("Не вдалося запустити озвучення");
    } else {
      haptic.light();
    }
  }, [advice, voiceSource, tts, voiceActive, showError]);

  const open = !!advice;

  const style = useMemo(() => {
    if (!advice?.presetCategory) {
      return { bg: "bg-[#7c3aed]/15", text: "text-[#c4b5fd]", border: "border-[#7c3aed]/30", glow: "" };
    }
    if (advice.presetCategory in CATEGORY_STYLE) {
      return CATEGORY_STYLE[advice.presetCategory as keyof typeof CATEGORY_STYLE];
    }
    return { bg: "bg-[#7c3aed]/15", text: "text-[#c4b5fd]", border: "border-[#7c3aed]/30", glow: "" };
  }, [advice?.presetCategory]);
  const Icon = getPresetIcon(advice?.presetIcon);

  const lines = useMemo(
    () => (advice ? parseLines(advice.advice) : []),
    [advice]
  );

  const handlePinToggle = useCallback(() => {
    if (!advice) return;
    const next = togglePin(advice.id);
    haptic.medium();
    showInfo(next ? "Закріплено" : "Знято з закріплення");
  }, [advice, togglePin, showInfo]);

  const handleDelete = useCallback(() => {
    if (!advice) return;
    const removed = removeAdvice(advice.id);
    haptic.heavy();
    onClose();
    if (removed) {
      showSuccess("Пораду видалено", {
        action: {
          label: "Скасувати",
          onClick: () => {
            restoreAdvice(removed);
            showInfo("Пораду повернено");
          },
        },
        duration: 5000,
      });
    }
  }, [advice, removeAdvice, onClose, showSuccess, showInfo, restoreAdvice]);

  const handleAskAgain = useCallback(async () => {
    if (!advice) return;
    haptic.light();
    onClose();
    const myTag = playerData?.tag?.replace(/^#/, "").toUpperCase();
    if (myTag !== advice.playerTag) {
      const switched = await handleQuery(advice.playerTag, { navigateHome: false });
      if (!switched) {
        showError("Не вдалося завантажити профіль гравця");
        return;
      }
    }
    let brawler: BrawlerInfo | undefined;
    if (advice.brawlerId) {
      brawler = playerData?.brawlers?.find((b) => b.id === advice.brawlerId);
    }
    fetchAiCoach({ presetId: advice.presetId, brawler });
  }, [advice, fetchAiCoach, handleQuery, onClose, playerData, showError]);

  const handleSaveNote = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (!advice) return;
      updateAdvice(advice.id, { note: noteDraft });
      setEditingNote(false);
      haptic.light();
    },
    [advice, noteDraft, updateAdvice]
  );

  const handleAddTag = useCallback(
    (raw: string) => {
      const value = raw.trim().slice(0, 20);
      if (!value || !advice) return;
      const existing = advice.tags ?? [];
      if (existing.includes(value)) return;
      updateAdvice(advice.id, { tags: [...existing, value] });
      setTagDraft("");
      setAddingTag(false);
      haptic.light();
    },
    [advice, updateAdvice]
  );

  const handleRemoveTag = useCallback(
    (tag: string) => {
      if (!advice) return;
      updateAdvice(advice.id, {
        tags: (advice.tags ?? []).filter((t) => t !== tag),
      });
      haptic.light();
    },
    [advice, updateAdvice]
  );

  const trophiesNow =
    playerData?.tag?.replace(/^#/, "").toUpperCase() === advice?.playerTag
      ? playerData?.trophies
      : null;
  const trophiesThen = advice?.playerTrophies ?? 0;
  const trophiesDiff =
    typeof trophiesNow === "number" ? trophiesNow - trophiesThen : 0;
  const presetExists = !!getPresetById(advice?.presetId);

  return (
    <BottomSheet open={open} onClose={onClose} title={advice?.presetTitle ?? "Порада"}>
      {advice && (
        <div className="space-y-4 pt-2">
          <header className="space-y-3">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${style.bg} ${style.border}`}
              >
                <Icon className={`h-5 w-5 ${style.text}`} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-black uppercase tracking-wide text-white">
                  {advice.presetTitle ?? "Загальний аналіз"}
                </h3>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="truncate font-bold text-slate-300">
                    {advice.playerName}
                  </span>
                  <span>·</span>
                  <span>{formatRelativeUk(advice.createdAt)}</span>
                  {advice.brawlerName && (
                    <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-orange-300">
                      {advice.brawlerName}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handlePinToggle}
                aria-label={advice.isPinned ? "Зняти закріплення" : "Закріпити"}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 active:scale-95"
              >
                {advice.isPinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4 text-[#facc15]" />
                )}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Trophy className="h-3.5 w-3.5 text-[#facc15]" />
                  Кубки на момент поради
                </span>
                <span className="font-black text-[#facc15]">
                  {trophiesThen.toLocaleString("uk-UA")}
                </span>
              </div>
              {typeof trophiesNow === "number" && trophiesDiff !== 0 && (
                <p
                  className={`mt-1 text-[11px] font-bold ${
                    trophiesDiff > 0 ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {trophiesDiff > 0
                    ? `Ти виріс на +${trophiesDiff.toLocaleString("uk-UA")} 🎉`
                    : `Просів на ${trophiesDiff.toLocaleString("uk-UA")}`}
                </p>
              )}
            </div>
          </header>

          {voiceSource && (
            <VoicePlayer sourceId={voiceSource} text={advice.advice} />
          )}

          <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a0a2e]/60 p-4 text-xs leading-relaxed text-slate-300">
            {lines.map((line, idx) => {
              if (line.kind === "heading") {
                return (
                  <h4
                    key={idx}
                    className="mt-3 text-xs font-black uppercase tracking-widest text-[#facc15]"
                  >
                    {line.raw.replace(/^###\s*/, "").trim()}
                  </h4>
                );
              }
              if (line.kind === "bold") {
                return (
                  <p key={idx} className="my-1.5">
                    {renderBoldLine(line.raw)}
                  </p>
                );
              }
              if (line.kind === "empty") {
                return <br key={idx} />;
              }
              return (
                <p key={idx} className="my-1 text-slate-400">
                  {line.raw}
                </p>
              );
            })}
          </div>

          <NoteSection
            note={advice.note}
            editing={editingNote}
            draft={noteDraft}
            onStartEdit={() => {
              setNoteDraft(advice.note ?? "");
              setEditingNote(true);
            }}
            onCancel={() => setEditingNote(false)}
            onChange={setNoteDraft}
            onSave={handleSaveNote}
          />

          <TagSection
            tags={advice.tags ?? []}
            addingTag={addingTag}
            tagDraft={tagDraft}
            onTagDraftChange={setTagDraft}
            onStartAdd={() => setAddingTag(true)}
            onCancelAdd={() => {
              setAddingTag(false);
              setTagDraft("");
            }}
            onSubmitTag={handleAddTag}
            onRemove={handleRemoveTag}
          />

          <div className="flex flex-wrap gap-2 pt-1">
            {tts.isSupported && tts.prefs.enabled && (
              <button
                type="button"
                onClick={handleVoiceToggle}
                aria-label={voiceActive ? "Зупинити озвучення" : "Прослухати"}
                aria-pressed={voiceActive}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-wider active:scale-95 ${
                  voiceActive
                    ? "border-[#facc15]/50 bg-[#facc15]/15 text-[#facc15]"
                    : "border-white/10 bg-white/5 text-slate-200"
                }`}
              >
                {voiceActive ? (
                  <>
                    <VolumeX className="h-3.5 w-3.5" />
                    Зупинити
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5" />
                    Прослухати
                  </>
                )}
              </button>
            )}
            <ShareButton
              variant="primary"
              size="md"
              label="Поділитися"
              payload={() => shareAdvicePreset(advice)}
              className="flex-1"
              ariaLabel="Поділитися порадою"
            />
            {presetExists && (
              <button
                type="button"
                onClick={handleAskAgain}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[#7c3aed]/40 bg-[#7c3aed]/15 px-4 py-3 text-xs font-black uppercase tracking-wider text-[#c4b5fd] active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Запитати ще раз
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Видалити пораду"
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-rose-200 active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function NoteSection({
  note,
  editing,
  draft,
  onStartEdit,
  onCancel,
  onChange,
  onSave,
}: {
  note?: string;
  editing: boolean;
  draft: string;
  onStartEdit: () => void;
  onCancel: () => void;
  onChange: (v: string) => void;
  onSave: (e?: FormEvent) => void;
}) {
  if (editing) {
    return (
      <form
        onSubmit={onSave}
        className="space-y-2 rounded-2xl border border-[#7c3aed]/30 bg-[#7c3aed]/5 p-3"
      >
        <textarea
          autoFocus
          rows={3}
          maxLength={500}
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Твоя примітка до цієї поради…"
          className="w-full resize-none rounded-xl border border-white/10 bg-[#1a0a2e]/70 p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-[#7c3aed]/60 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-500">{draft.length}/500</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300 active:scale-95"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="rounded-full bg-[#facc15] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#1a0a2e] active:scale-95"
            >
              Зберегти
            </button>
          </div>
        </div>
      </form>
    );
  }

  if (note) {
    return (
      <button
        type="button"
        onClick={onStartEdit}
        className="flex w-full items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left active:scale-[0.98]"
      >
        <StickyNote className="h-4 w-4 shrink-0 text-[#facc15]" />
        <p className="flex-1 whitespace-pre-wrap text-xs text-slate-300">{note}</p>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onStartEdit}
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/15 bg-white/[0.02] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 active:scale-95"
    >
      <StickyNote className="h-3 w-3" />
      Додати примітку
    </button>
  );
}

function TagSection({
  tags,
  addingTag,
  tagDraft,
  onTagDraftChange,
  onStartAdd,
  onCancelAdd,
  onSubmitTag,
  onRemove,
}: {
  tags: string[];
  addingTag: boolean;
  tagDraft: string;
  onTagDraftChange: (v: string) => void;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onSubmitTag: (raw: string) => void;
  onRemove: (tag: string) => void;
}) {
  const remaining = SUGGESTED_TAGS.filter((s) => !tags.includes(s));
  return (
    <motion.div layout className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        Теги
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/10 px-2 py-1 text-[10px] font-bold text-[#c4b5fd]"
          >
            #{tag}
            <button
              type="button"
              onClick={() => onRemove(tag)}
              aria-label={`Видалити тег ${tag}`}
              className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/10 active:scale-90"
            >
              <X className="h-2 w-2 text-white" />
            </button>
          </span>
        ))}
        {addingTag ? (
          <form
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitTag(tagDraft);
            }}
          >
            <input
              autoFocus
              type="text"
              placeholder="новий тег"
              value={tagDraft}
              onChange={(e) => onTagDraftChange(e.target.value)}
              maxLength={20}
              className="w-20 bg-transparent text-[10px] text-white placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Додати"
              className="flex h-4 w-4 items-center justify-center rounded-full bg-[#facc15] text-[#1a0a2e] active:scale-90"
            >
              <CheckCircle2 className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onCancelAdd}
              aria-label="Скасувати"
              className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={onStartAdd}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/15 bg-white/[0.02] px-2 py-1 text-[10px] font-black uppercase text-slate-400 active:scale-95"
          >
            <Plus className="h-3 w-3" />
            Тег
          </button>
        )}
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[9px] uppercase tracking-widest text-slate-600">
            швидко:
          </span>
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSubmitTag(s)}
              className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300 active:scale-95"
            >
              <ArrowRight className="h-2.5 w-2.5" />#{s}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
