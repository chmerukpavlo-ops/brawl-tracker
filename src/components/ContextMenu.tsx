import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  open: boolean;
  anchor: { x: number; y: number } | null;
  items: ContextMenuItem[];
  onClose: () => void;
}

const EDGE_PADDING = 12;

export default function ContextMenu({
  open,
  anchor,
  items,
  onClose,
}: ContextMenuProps) {
  const reducedMotion = usePrefersReducedMotion();
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; origin: string }>({
    left: 0,
    top: 0,
    origin: "top left",
  });

  useLayoutEffect(() => {
    if (!open || !anchor || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = rect.width;
    const height = rect.height;

    let left = anchor.x;
    let top = anchor.y;
    let originX: "left" | "right" = "left";
    let originY: "top" | "bottom" = "top";

    if (left + width > vw - EDGE_PADDING) {
      left = Math.max(EDGE_PADDING, anchor.x - width);
      originX = "right";
    }
    if (top + height > vh - EDGE_PADDING) {
      top = Math.max(EDGE_PADDING, anchor.y - height);
      originY = "bottom";
    }
    left = Math.max(EDGE_PADDING, Math.min(left, vw - width - EDGE_PADDING));
    top = Math.max(EDGE_PADDING, Math.min(top, vh - height - EDGE_PADDING));

    setPosition({ left, top, origin: `${originY} ${originX}` });
  }, [open, anchor, items.length]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const first = menuRef.current.querySelector<HTMLButtonElement>(
      'button[role="menuitem"]:not([disabled])'
    );
    const t = window.setTimeout(() => first?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  const handleItemClick = useCallback(
    (item: ContextMenuItem) => {
      if (item.disabled) return;
      onClose();
      item.onClick();
    },
    [onClose]
  );

  if (typeof document === "undefined") return null;

  const transition = reducedMotion
    ? { duration: 0.1 }
    : { duration: 0.15, ease: [0.16, 1, 0.3, 1] as const };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[60]"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={menuRef}
            role="menu"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
            transition={transition}
            style={{
              left: position.left,
              top: position.top,
              transformOrigin: position.origin,
            }}
            className="absolute min-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[#2a1a4a] py-1.5 shadow-[0_20px_48px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {items.map((item, idx) => (
              <div key={item.id}>
                {item.divider && idx > 0 && (
                  <div className="my-1 h-px bg-white/10" aria-hidden />
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => handleItemClick(item)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                    item.variant === "danger"
                      ? "text-rose-300 hover:bg-rose-500/10 active:bg-rose-500/20"
                      : "text-slate-100 hover:bg-white/5 active:bg-white/10"
                  } ${item.disabled ? "pointer-events-none opacity-40" : ""}`}
                >
                  {item.icon && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
              </div>
            ))}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
