import React, {
  useEffect,
  useId,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useDragControls,
  type PanInfo,
} from "motion/react";
import { X } from "lucide-react";
import { haptic } from "../hooks/useHaptic";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { useFocusReturn } from "../hooks/useFocusReturn";
import FocusTrap from "./a11y/FocusTrap";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  dismissOnBackdrop?: boolean;
}

const DISMISS_OFFSET = 100;
const DISMISS_VELOCITY = 500;

export default function BottomSheet({
  open,
  onClose,
  children,
  title,
  dismissOnBackdrop = true,
}: BottomSheetProps) {
  const reducedMotion = usePrefersReducedMotion();
  const dragControls = useDragControls();
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Save the previously-focused element before the sheet mounts and
  // restore it when the sheet unmounts. The ref-based capture inside
  // the hook beats focus-trap-react's own `returnFocus` for our case,
  // because our exit animation (300ms spring) outlasts the focus-trap
  // deactivation by the time React commits.
  useFocusReturn(open);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 80);
    haptic.medium();
    return () => {
      document.removeEventListener("keydown", handleKey);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) {
      haptic.light();
      onClose();
    }
  };

  const handleHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    dragControls.start(event);
  };

  if (typeof document === "undefined") return null;

  const sheet = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bs-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.1 : 0.2 }}
            onClick={() => dismissOnBackdrop && onClose()}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            key="bs-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={
              reducedMotion
                ? { duration: 0.15 }
                : { type: "spring", stiffness: 380, damping: 38 }
            }
            drag={reducedMotion ? false : "y"}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90vh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#2a1a4a] shadow-[0_-16px_48px_rgba(0,0,0,0.5)]"
          >
            {/* Focus trap is internal to the sheet — keyboard users
                can't tab out into the (visually-hidden) main content
                while the dialog is open. We disable focus-trap's own
                `returnFocus` because `useFocusReturn` handles it
                with timing better suited to our exit animation. */}
            <FocusTrap active returnFocus={false}>
              <div
                onPointerDown={handleHandlePointerDown}
                className="shrink-0 touch-none cursor-grab select-none active:cursor-grabbing"
              >
                <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-white/25" />
                <div className="flex items-center justify-between px-5 pb-2 pt-3">
                  <h2
                    id={titleId}
                    className="truncate pr-3 text-base font-black uppercase tracking-wide text-white"
                  >
                    {title}
                  </h2>
                  <button
                    ref={closeBtnRef}
                    type="button"
                    onClick={onClose}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Закрити"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 active:opacity-70"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-1">
                {children}
              </div>
            </FocusTrap>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(sheet, document.body);
}
