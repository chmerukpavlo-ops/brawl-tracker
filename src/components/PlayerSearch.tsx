import { useState } from "react";
import { Search } from "lucide-react";

interface PlayerSearchProps {
  onSearch: (tag: string) => void;
  isLoading?: boolean;
}

export default function PlayerSearch({ onSearch, isLoading }: PlayerSearchProps) {
  const [input, setInput] = useState("");

  const submit = () => {
    if (!input.trim() || isLoading) return;
    onSearch(input.trim());
  };

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Пошук гравця
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[#facc15]">#</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.replace("#", "").toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Введіть тег гравця"
            className="w-full min-h-[48px] rounded-2xl border border-white/10 bg-[#2a1a4a] py-3 pl-8 pr-4 text-sm font-bold uppercase text-white placeholder-slate-600 outline-none focus:border-[#facc15]/50"
          />
        </div>
        <button
          onClick={submit}
          disabled={isLoading}
          className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-[#facc15] text-[#1a0a2e] shadow-[0_0_16px_rgba(250,204,21,0.3)] active:scale-95 disabled:opacity-50"
          aria-label="Знайти"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
      <button
        onClick={submit}
        disabled={isLoading}
        className="w-full min-h-[48px] rounded-2xl bg-[#facc15] text-sm font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_20px_rgba(250,204,21,0.25)] active:scale-95 disabled:opacity-50"
      >
        Знайти
      </button>
    </div>
  );
}
