import { useState } from "react";
import { Loader2, Sparkles, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { PlayerStats } from "../types";
import { haptic } from "../hooks/useHaptic";
import { useToast } from "../context/ToastContext";

interface Props {
  playerA: PlayerStats;
  playerB: PlayerStats;
}

export default function CompareAiTab({ playerA, playerB }: Props) {
  const { showError } = useToast();
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAdvice = async () => {
    setLoading(true);
    setAdvice(null);
    haptic.light();
    try {
      const currentLocale = (() => {
        try {
          const v = localStorage.getItem("brawl_locale");
          return v === "en" ? "en" : "uk";
        } catch {
          return "uk";
        }
      })();
      const res = await fetch("/api/gemini/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerA, playerB, locale: currentLocale }),
      });
      if (!res.ok) throw new Error("AI response not ok");
      const data = await res.json();
      setAdvice(data.advice || "AI замислився. Спробуй ще раз.");
      haptic.success();
    } catch {
      showError("Не вдалося отримати AI-порівняння");
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#1a0a2e]/40 p-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-[#7c3aed]/30 bg-[#7c3aed]/20 p-2 text-[#a78bfa]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black uppercase text-white">
              AI-порівняння
            </p>
            <p className="text-[11px] text-slate-400">
              Gemini проаналізує сильні сторони і дасть рекомендації
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchAdvice}
          disabled={loading}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-[#facc15] text-sm font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_18px_rgba(250,204,21,0.3)] active:scale-95 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {loading ? "Аналізую..." : advice ? "Запитати ще раз" : "Запитати AI"}
        </button>
      </div>

      <AnimatePresence>
        {advice && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-h-[420px] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-slate-300"
          >
            {advice.split("\n").map((line, idx) => {
              if (line.trim().startsWith("###")) {
                return (
                  <h4
                    key={idx}
                    className="mt-3 text-xs font-black uppercase tracking-widest text-[#facc15]"
                  >
                    {line.replace(/^###\s*/, "").trim()}
                  </h4>
                );
              }
              if (line.includes("**")) {
                const parts = line.split("**");
                return (
                  <p key={idx} className="my-1.5">
                    {parts.map((part, pIdx) =>
                      pIdx % 2 === 1 ? (
                        <strong key={pIdx} className="text-[#facc15]">
                          {part}
                        </strong>
                      ) : (
                        part
                      )
                    )}
                  </p>
                );
              }
              return (
                <p key={idx} className="my-1 text-slate-400">
                  {line}
                </p>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
