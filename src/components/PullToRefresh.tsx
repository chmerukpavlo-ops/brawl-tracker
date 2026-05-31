import React, { useCallback, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import { ArrowDown, CheckCircle2, RefreshCw } from "lucide-react";
import { haptic } from "../hooks/useHaptic";
import { useToast } from "../context/ToastContext";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

type PullState = "idle" | "pulling" | "ready" | "refreshing" | "success";

const THRESHOLD = 70;
const MAX_PULL = 120;
const RESISTANCE = 0.5;
const SUCCESS_HOLD_MS = 800;
const ANTI_SPAM_MS = 2000;

const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

function applyResistance(raw: number): number {
  if (raw <= 0) return 0;
  return Math.min(MAX_PULL, raw * RESISTANCE);
}

export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
}: PullToRefreshProps) {
  const { showSuccess } = useToast();
  const reducedMotion = usePrefersReducedMotion();

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const readyHapticRef = useRef(false);
  const lastRefreshAtRef = useRef(0);
  const activePointerRef = useRef<number | null>(null);

  const distance = useMotionValue(0);
  const [state, setState] = useState<PullState>("idle");

  const opacity = useTransform(distance, [0, 30], [0, 1], { clamp: true });
  const rotate = useTransform(distance, [0, THRESHOLD], [0, 180], { clamp: true });
  const indicatorY = useTransform(distance, (v) => v - 12);

  const transitionVal = reducedMotion ? { duration: 0 } : spring;

  const resetTo = useCallback(
    (target: number) => {
      const controls = animate(distance, target, transitionVal);
      return controls;
    },
    [distance, transitionVal]
  );

  const settle = useCallback(() => {
    startYRef.current = null;
    activePointerRef.current = null;
    readyHapticRef.current = false;
  }, []);

  const performRefresh = useCallback(async () => {
    if (Date.now() - lastRefreshAtRef.current < ANTI_SPAM_MS) {
      setState("idle");
      resetTo(0);
      return;
    }

    setState("refreshing");
    resetTo(THRESHOLD);

    try {
      await Promise.resolve(onRefresh());
      lastRefreshAtRef.current = Date.now();
      haptic.success();
      showSuccess("Профіль оновлено", { duration: 2000 });
      setState("success");
      window.setTimeout(() => {
        setState("idle");
        resetTo(0);
      }, SUCCESS_HOLD_MS);
    } catch {
      haptic.error();
      setState("idle");
      resetTo(0);
    }
  }, [onRefresh, resetTo, showSuccess]);

  const handleStart = useCallback(
    (clientY: number) => {
      if (disabled) return false;
      if (state === "refreshing" || state === "success") return false;
      const el = containerRef.current;
      if (!el || el.scrollTop > 0) return false;
      startYRef.current = clientY;
      readyHapticRef.current = false;
      return true;
    },
    [disabled, state]
  );

  const handleMove = useCallback(
    (clientY: number) => {
      if (startYRef.current === null) return;
      if (state === "refreshing" || state === "success") return;
      const el = containerRef.current;
      if (!el || el.scrollTop > 0) {
        startYRef.current = null;
        distance.set(0);
        if (state !== "idle") setState("idle");
        return;
      }

      const delta = clientY - startYRef.current;
      if (delta <= 0) {
        distance.set(0);
        if (state !== "idle") setState("idle");
        return;
      }

      const d = applyResistance(delta);
      distance.set(d);

      if (d > THRESHOLD) {
        if (state !== "ready") setState("ready");
        if (!readyHapticRef.current) {
          haptic.medium();
          readyHapticRef.current = true;
        }
      } else {
        if (state !== "pulling") setState("pulling");
        readyHapticRef.current = false;
      }
    },
    [distance, state]
  );

  const handleEnd = useCallback(() => {
    if (startYRef.current === null) return;
    const wasReady = state === "ready";
    settle();

    if (wasReady) {
      void performRefresh();
    } else {
      setState("idle");
      resetTo(0);
    }
  }, [state, settle, performRefresh, resetTo]);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length > 1) {
        startYRef.current = null;
        return;
      }
      handleStart(event.touches[0].clientY);
    },
    [handleStart]
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length > 1) {
        startYRef.current = null;
        distance.set(0);
        if (state !== "idle") setState("idle");
        return;
      }
      handleMove(event.touches[0].clientY);
    },
    [handleMove, distance, state]
  );

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const isReady = state === "ready";
  const isRefreshing = state === "refreshing";
  const isSuccess = state === "success";
  const isPulling = state === "pulling";

  let label = "";
  let labelColor = "text-slate-500";
  if (isPulling) {
    label = "Потягніть для оновлення";
  } else if (isReady) {
    label = "Відпустіть для оновлення";
    labelColor = "text-[#facc15]";
  } else if (isRefreshing) {
    label = "Оновлення…";
    labelColor = "text-[#facc15]";
  } else if (isSuccess) {
    label = "Готово!";
    labelColor = "text-[#22c55e]";
  }

  return (
    <div className="relative h-full overflow-hidden">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center justify-start gap-1 pt-2"
        style={{
          y: indicatorY,
          opacity,
          willChange: "transform",
        }}
      >
        <motion.div
          animate={
            reducedMotion
              ? undefined
              : {
                  scale: isReady ? 1.1 : isSuccess ? 1.15 : 1,
                  boxShadow: isReady
                    ? "0 0 24px rgba(250, 204, 21, 0.45)"
                    : isSuccess
                      ? "0 0 24px rgba(34, 197, 94, 0.45)"
                      : "0 0 0px rgba(0,0,0,0)",
                }
          }
          transition={spring}
          className={`flex h-10 w-10 items-center justify-center rounded-full bg-[#2a1a4a] ring-1 ${
            isReady
              ? "ring-[#facc15]/50"
              : isSuccess
                ? "ring-[#22c55e]/50"
                : "ring-white/10"
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />
          ) : isRefreshing ? (
            <RefreshCw className="h-5 w-5 animate-spin text-[#facc15]" />
          ) : (
            <motion.div
              style={reducedMotion ? undefined : { rotate }}
              className={isReady ? "text-[#facc15]" : "text-slate-400"}
            >
              <ArrowDown className="h-5 w-5" />
            </motion.div>
          )}
        </motion.div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${labelColor}`}
        >
          {label}
        </span>
      </motion.div>

      <motion.div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ y: distance, touchAction: "pan-y" }}
        className="h-full overflow-y-auto overscroll-contain"
      >
        {children}
      </motion.div>
    </div>
  );
}
