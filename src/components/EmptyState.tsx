import { isValidElement, type ReactNode } from "react";
import { motion } from "motion/react";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

interface SecondaryAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  illustration: ReactNode | string;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: SecondaryAction;
  compact?: boolean;
  className?: string;
}

export default function EmptyState({
  illustration,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className = "",
}: EmptyStateProps) {
  const isEmoji = typeof illustration === "string";
  const isComponent = !isEmoji && isValidElement(illustration);

  const containerClass = compact
    ? "flex flex-col items-center justify-center gap-3 px-4 py-6 text-center"
    : "flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-12 text-center";

  return (
    <div role="status" className={`${containerClass} ${className}`}>
      {isEmoji ? (
        <motion.span
          aria-hidden
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 3, repeat: Infinity, ease: [0.42, 0, 0.58, 1] }}
          className={compact ? "text-4xl" : "text-6xl"}
        >
          {illustration}
        </motion.span>
      ) : isComponent ? (
        illustration
      ) : null}

      <div className="space-y-1.5">
        <h2
          className={`font-black uppercase tracking-wide text-white ${compact ? "text-sm" : "text-lg"}`}
        >
          {title}
        </h2>
        {description && (
          <p
            className={`mx-auto text-slate-400 ${compact ? "max-w-[260px] text-xs" : "max-w-xs text-sm"}`}
          >
            {description}
          </p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className={`mt-2 flex flex-col items-center gap-2 ${compact ? "" : "mt-4"}`}>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={
                action.variant === "secondary"
                  ? "min-h-[44px] rounded-2xl border border-[#7c3aed]/40 bg-[#7c3aed]/15 px-6 text-xs font-black uppercase tracking-wider text-[#a78bfa] active:scale-95"
                  : "min-h-[48px] rounded-2xl bg-[#facc15] px-8 text-sm font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_20px_rgba(250,204,21,0.3)] active:scale-95"
              }
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="min-h-[36px] text-xs font-black uppercase tracking-wider text-[#a78bfa] underline-offset-4 hover:underline active:opacity-70"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
