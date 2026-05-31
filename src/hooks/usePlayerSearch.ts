import { useCallback } from "react";
import { usePlayer } from "../context/PlayerContext";

export function usePlayerSearch() {
  const { handleQuery, isLoading } = usePlayer();

  const search = useCallback(
    (tag: string) => handleQuery(tag),
    [handleQuery]
  );

  return { search, isLoading };
}
