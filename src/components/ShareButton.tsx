import React, { useState, type MouseEvent } from "react";
import { Loader2, Share2 } from "lucide-react";
import { motion } from "motion/react";
import {
  shareData,
  type ShareDataPayload,
  type ShareMethod,
} from "../utils/share";
import { useToast } from "../context/ToastContext";
import { haptic } from "../hooks/useHaptic";

export type ShareButtonVariant = "icon" | "pill" | "primary";
export type ShareButtonSize = "sm" | "md" | "lg";

type PayloadResolver =
  | ShareDataPayload
  | (() => ShareDataPayload | Promise<ShareDataPayload>);

interface ShareButtonProps {
  payload: PayloadResolver;
  variant?: ShareButtonVariant;
  size?: ShareButtonSize;
  label?: string;
  ariaLabel?: string;
  onShareSuccess?: (method: ShareMethod) => void;
  onShareCancel?: () => void;
  onShareError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

const SIZE = {
  sm: {
    icon: "h-9 w-9",
    pill: "min-h-[36px] px-3 text-[10px]",
    primary: "min-h-[40px] px-4 text-xs",
    iconSize: "h-3.5 w-3.5",
  },
  md: {
    icon: "h-11 w-11",
    pill: "min-h-[40px] px-3.5 text-xs",
    primary: "min-h-[44px] px-5 text-xs",
    iconSize: "h-4 w-4",
  },
  lg: {
    icon: "h-12 w-12",
    pill: "min-h-[48px] px-4 text-sm",
    primary: "min-h-[52px] px-6 text-sm",
    iconSize: "h-5 w-5",
  },
} as const;

export default function ShareButton({
  payload,
  variant = "icon",
  size = "md",
  label = "Поділитися",
  ariaLabel,
  onShareSuccess,
  onShareCancel,
  onShareError,
  className = "",
  disabled = false,
}: ShareButtonProps) {
  const { showSuccess, showError } = useToast();
  const [busy, setBusy] = useState(false);
  const cfg = SIZE[size];

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (busy || disabled) return;
    setBusy(true);
    haptic.light();
    try {
      const resolved =
        typeof payload === "function" ? await payload() : payload;
      const result = await shareData(resolved);
      if (result.cancelled) {
        onShareCancel?.();
        return;
      }
      if (result.success) {
        haptic.success();
        if (result.method === "clipboard") {
          showSuccess("Посилання скопійовано");
        }
        onShareSuccess?.(result.method);
        return;
      }
      showError("Не вдалося поділитися");
      onShareError?.(result.error ?? "share_failed");
    } catch {
      showError("Не вдалося поділитися");
      onShareError?.("exception");
    } finally {
      setBusy(false);
    }
  };

  const ariaProps = {
    "aria-label": ariaLabel ?? label,
    "aria-busy": busy || undefined,
    disabled: busy || disabled,
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        data-no-swipe="true"
        {...ariaProps}
        className={`flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition-transform active:scale-95 disabled:opacity-60 ${cfg.icon} ${className}`}
      >
        {busy ? (
          <Loader2 className={`${cfg.iconSize} animate-spin`} aria-hidden />
        ) : (
          <Share2 className={cfg.iconSize} aria-hidden />
        )}
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleClick}
        data-no-swipe="true"
        {...ariaProps}
        className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 font-black uppercase tracking-wider text-slate-200 transition-transform active:scale-95 disabled:opacity-60 ${cfg.pill} ${className}`}
      >
        {busy ? (
          <Loader2 className={`${cfg.iconSize} animate-spin`} aria-hidden />
        ) : (
          <Share2 className={cfg.iconSize} aria-hidden />
        )}
        {label}
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      data-no-swipe="true"
      whileTap={{ scale: 0.97 }}
      {...ariaProps}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-[#facc15] font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-transform disabled:opacity-60 ${cfg.primary} ${className}`}
    >
      {busy ? (
        <Loader2 className={`${cfg.iconSize} animate-spin`} aria-hidden />
      ) : (
        <Share2 className={cfg.iconSize} aria-hidden />
      )}
      {label}
    </motion.button>
  );
}

// Re-export type for consumers
export type { ShareDataPayload };
// Allow `key` JSX prop without strict TS complaint
export interface ShareButtonExtras {
  key?: React.Key;
}
