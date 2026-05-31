import React, { useEffect } from "react";
import { motion, type PanInfo } from "motion/react";
import { AlertCircle, CheckCircle, Info, Trophy, X } from "lucide-react";
import type { ToastItem } from "../context/ToastContext";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

interface ToastProps {
  key?: React.Key;
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

interface TypeStyle {
  border: string;
  bg: string;
  iconColor: string;
  shadow: string;
  icon: typeof CheckCircle;
}

const TYPE_STYLES: Record<ToastItem["type"], TypeStyle> = {
  success: {
    border: "border-[#22c55e]/40",
    bg: "bg-[#14532d]/85",
    iconColor: "text-[#22c55e]",
    shadow: "shadow-[0_8px_32px_rgba(34,197,94,0.25)]",
    icon: CheckCircle,
  },
  error: {
    border: "border-[#ef4444]/40",
    bg: "bg-[#7f1d1d]/85",
    iconColor: "text-[#fca5a5]",
    shadow: "shadow-[0_8px_32px_rgba(239,68,68,0.25)]",
    icon: AlertCircle,
  },
  info: {
    border: "border-[#3b82f6]/40",
    bg: "bg-[#1e3a8a]/85",
    iconColor: "text-[#60a5fa]",
    shadow: "shadow-[0_8px_32px_rgba(59,130,246,0.25)]",
    icon: Info,
  },
  record: {
    border: "border-[#facc15]/50",
    bg: "bg-[#854d0e]/90",
    iconColor: "text-[#facc15]",
    shadow: "shadow-[0_0_32px_rgba(250,204,21,0.4)]",
    icon: Trophy,
  },
};

const DEFAULT_DURATION = 3500;
const SWIPE_Y = 50;
const SWIPE_X = 100;

export default function Toast({ toast, onDismiss }: ToastProps) {
  const reduced = usePrefersReducedMotion();
  const cfg = TYPE_STYLES[toast.type];
  const duration = toast.options?.duration ?? DEFAULT_DURATION;
  const IconComponent = cfg.icon;

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(t);
  }, [toast.id, duration, onDismiss]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -SWIPE_Y || Math.abs(info.offset.x) > SWIPE_X) {
      onDismiss(toast.id);
    }
  };

  const motionProps = reduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, y: -40, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -60, scale: 0.85 },
        transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const },
      };

  return (
    <motion.div
      layout
      {...motionProps}
      drag={reduced ? false : "y"}
      dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
      dragElastic={0.5}
      onDragEnd={handleDragEnd}
      role={toast.type === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex items-center gap-3 rounded-2xl border ${cfg.border} ${cfg.bg} ${cfg.shadow} px-4 py-3 backdrop-blur-xl`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ${cfg.iconColor}`}
        aria-hidden
      >
        {toast.options?.icon ?? <IconComponent className="h-5 w-5" />}
      </div>

      <p className="flex-1 text-sm font-bold leading-tight text-white">
        {toast.message}
      </p>

      {toast.options?.action && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            toast.options?.action?.onClick();
            onDismiss(toast.id);
          }}
          className={`min-h-[36px] shrink-0 rounded-xl px-2.5 text-xs font-black uppercase tracking-wider ${cfg.iconColor} active:opacity-70`}
        >
          {toast.options.action.label}
        </button>
      )}

      <button
        type="button"
        aria-label="Закрити"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
        className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-300/80 active:opacity-70"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
