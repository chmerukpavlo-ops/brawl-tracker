import { useCallback, useState } from "react";
import type { MyPlayerSettings } from "../types";

const STORAGE_KEY = "brawl_my_player";
const LEGACY_TAG_KEY = "my_player_tag";

function normalize(tag: string): string {
  return tag.trim().toUpperCase().replace(/^#+/, "");
}

function formatTag(tag: string): string {
  return `#${normalize(tag)}`;
}

function readStorage(): MyPlayerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MyPlayerSettings;
      if (parsed && (typeof parsed.tag === "string" || parsed.tag === null)) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const legacy = localStorage.getItem(LEGACY_TAG_KEY);
    if (legacy) {
      const migrated: MyPlayerSettings = { tag: legacy };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      } catch {
        /* ignore */
      }
      return migrated;
    }
  } catch {
    /* ignore */
  }

  return { tag: null };
}

function writeStorage(value: MyPlayerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export interface UseMyPlayerApi {
  myPlayer: MyPlayerSettings;
  setMyPlayer: (tag: string, customName?: string) => void;
  updateMyPlayerName: (customName: string | undefined) => void;
  clearMyPlayer: () => void;
  isMyPlayer: (tag: string) => boolean;
}

export function useMyPlayer(): UseMyPlayerApi {
  const [myPlayer, setMyPlayerState] = useState<MyPlayerSettings>(() => readStorage());

  const setMyPlayer = useCallback((tag: string, customName?: string) => {
    const next: MyPlayerSettings = {
      tag: formatTag(tag),
      customName,
    };
    writeStorage(next);
    try {
      localStorage.setItem(LEGACY_TAG_KEY, next.tag ?? "");
    } catch {
      /* ignore */
    }
    setMyPlayerState(next);
  }, []);

  const updateMyPlayerName = useCallback((customName: string | undefined) => {
    setMyPlayerState((prev) => {
      const next: MyPlayerSettings = { ...prev, customName };
      writeStorage(next);
      return next;
    });
  }, []);

  const clearMyPlayer = useCallback(() => {
    const next: MyPlayerSettings = { tag: null };
    writeStorage(next);
    try {
      localStorage.removeItem(LEGACY_TAG_KEY);
    } catch {
      /* ignore */
    }
    setMyPlayerState(next);
  }, []);

  const isMyPlayer = useCallback(
    (tag: string) => {
      if (!myPlayer.tag) return false;
      return normalize(myPlayer.tag) === normalize(tag);
    },
    [myPlayer.tag]
  );

  return { myPlayer, setMyPlayer, updateMyPlayerName, clearMyPlayer, isMyPlayer };
}
