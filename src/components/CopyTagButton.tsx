import { Copy } from "lucide-react";
import { haptic } from "../hooks/useHaptic";
import { useToast } from "../context/ToastContext";
import { trackAchievementEvent } from "../hooks/useAchievements";

interface CopyTagButtonProps {
  tag: string;
}

export default function CopyTagButton({ tag }: CopyTagButtonProps) {
  const { showSuccess, showError } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tag);
      haptic.light();
      trackAchievementEvent("copy_tag");
      showSuccess(`Тег скопійовано: ${tag}`, { duration: 2000 });
    } catch {
      showError("Не вдалося скопіювати тег");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase text-slate-300 transition-all active:scale-95"
    >
      <Copy className="h-4 w-4" />
      {tag}
    </button>
  );
}
