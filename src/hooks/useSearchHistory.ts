import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "brawl_search_history";

export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSearchHistory(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  const saveToHistory = useCallback((tag: string) => {
    const clean = tag.toUpperCase().trim();
    if (!clean || clean === "#DEMO") return;

    setSearchHistory((prev) => {
      const updated = [clean, ...prev.filter((t) => t !== clean)].slice(0, 5);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const removeFromHistory = useCallback((tag: string) => {
    const clean = tag.toUpperCase().trim();
    setSearchHistory((prev) => {
      const updated = prev.filter((t) => t.toUpperCase().trim() !== clean);
      if (updated.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  return { searchHistory, saveToHistory, clearHistory, removeFromHistory };
}
