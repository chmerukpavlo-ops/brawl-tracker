import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import type { SpeechSentence } from "../utils/textCleaner";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

interface SentenceHighlighterProps {
  sentences: SpeechSentence[];
  currentIndex: number;
  isPaused?: boolean;
  onSentenceClick?: (index: number) => void;
  className?: string;
  /** Якщо `true` — авто-скрол до поточного речення. */
  autoScroll?: boolean;
  /** Максимальна висота списку. За замовч. — без обмежень (наслідує батька). */
  maxHeightClass?: string;
}

function renderInline(line: string): ReactNode {
  // Мінімальна підтримка **bold** — щоб виглядало живо.
  const parts = line.split("**");
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <strong key={idx} className="text-[#facc15]">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

function renderSentence(display: string): ReactNode {
  const trimmed = display.trim();
  // Heading?
  if (/^\s{0,3}#{1,6}\s+/.test(trimmed)) {
    return (
      <span className="block text-[11px] font-black uppercase tracking-widest text-[#facc15]">
        {trimmed.replace(/^\s{0,3}#{1,6}\s+/, "")}
      </span>
    );
  }
  // List bullet?
  const bullet = trimmed.match(/^\s*([-*+]|\d+\.)\s+(.*)$/);
  if (bullet) {
    return (
      <span className="block">
        <span className="mr-1 text-slate-500">•</span>
        {renderInline(bullet[2])}
      </span>
    );
  }
  return <span>{renderInline(trimmed)}</span>;
}

export default function SentenceHighlighter({
  sentences,
  currentIndex,
  isPaused = false,
  onSentenceClick,
  className = "",
  autoScroll = true,
  maxHeightClass = "max-h-[300px]",
}: SentenceHighlighterProps) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (!autoScroll) return;
    const target = itemRefs.current[currentIndex];
    if (!target) return;
    target.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [currentIndex, autoScroll, reducedMotion]);

  const memoSentences = useMemo(() => sentences, [sentences]);

  if (memoSentences.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto rounded-2xl border border-white/10 bg-[#1a0a2e]/60 p-3 ${maxHeightClass} ${className}`}
    >
      <ol className="space-y-1.5">
        {memoSentences.map((s, idx) => {
          const isCurrent = idx === currentIndex;
          const isPast = idx < currentIndex;
          const opacity = isCurrent ? 1 : isPast ? 0.55 : 0.85;
          const baseStyle = "block w-full rounded-lg px-2 py-1.5 text-left text-xs leading-relaxed transition-colors";
          const stateStyle = isCurrent
            ? isPaused
              ? "bg-sky-400/15 text-white ring-1 ring-sky-400/40"
              : "bg-[#facc15]/15 text-white ring-1 ring-[#facc15]/40 shadow-[0_0_18px_rgba(250,204,21,0.18)]"
            : "text-slate-300 hover:text-white";
          const interactive = onSentenceClick
            ? "active:scale-[0.98] cursor-pointer"
            : "cursor-default";
          return (
            <motion.li
              key={`${idx}-${s.spoken.slice(0, 16)}`}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              layout={!reducedMotion}
              animate={{ opacity }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
            >
              {onSentenceClick ? (
                <button
                  type="button"
                  onClick={() => onSentenceClick(idx)}
                  className={`${baseStyle} ${stateStyle} ${interactive}`}
                  aria-current={isCurrent ? "true" : undefined}
                  aria-label={isCurrent ? "Поточне речення" : `Перейти до речення ${idx + 1}`}
                >
                  {renderSentence(s.display)}
                </button>
              ) : (
                <div
                  className={`${baseStyle} ${stateStyle}`}
                  aria-current={isCurrent ? "true" : undefined}
                >
                  {renderSentence(s.display)}
                </div>
              )}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
