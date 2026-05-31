import { useCallback, useRef } from "react";
import type {
  PointerEvent as ReactPointerEvent,
  MouseEvent as ReactMouseEvent,
} from "react";

export interface LongPressOptions {
  delay?: number;
  moveThreshold?: number;
  disabled?: boolean;
}

export interface LongPressHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
  onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
}

export function useLongPress(
  callback: (event: { clientX: number; clientY: number }) => void,
  options: LongPressOptions = {}
): LongPressHandlers {
  const { delay = 500, moveThreshold = 10, disabled = false } = options;

  const timerRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  const activePointerRef = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
    activePointerRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled) return;
      if (activePointerRef.current !== null) {
        cancel();
        return;
      }
      if (event.pointerType === "mouse" && event.button !== 0) return;

      activePointerRef.current = event.pointerId;
      firedRef.current = false;
      startPosRef.current = { x: event.clientX, y: event.clientY };

      if (delay <= 0) {
        firedRef.current = true;
        callback({ clientX: event.clientX, clientY: event.clientY });
        return;
      }

      timerRef.current = window.setTimeout(() => {
        const pos = startPosRef.current;
        if (!pos) return;
        firedRef.current = true;
        callback({ clientX: pos.x, clientY: pos.y });
      }, delay);
    },
    [callback, cancel, delay, disabled]
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled) return;
      if (event.pointerId !== activePointerRef.current) return;
      const start = startPosRef.current;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) > moveThreshold) {
        cancel();
      }
    },
    [cancel, disabled, moveThreshold]
  );

  const onPointerUp = useCallback(() => {
    cancel();
  }, [cancel]);

  const onPointerLeave = useCallback(() => {
    cancel();
  }, [cancel]);

  const onPointerCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  const onContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (disabled) return;
      event.preventDefault();
      cancel();
      firedRef.current = true;
      callback({ clientX: event.clientX, clientY: event.clientY });
    },
    [callback, cancel, disabled]
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onContextMenu,
  };
}
