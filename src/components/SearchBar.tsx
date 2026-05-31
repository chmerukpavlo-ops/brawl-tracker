import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { History, Loader2, Search, Send, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { haptic } from "../hooks/useHaptic";
import { highlightSubstring } from "../utils/highlightText";

export type SearchSuggestionKind = "local" | "api" | "history" | "more" | "info";

export interface SearchSuggestion {
  id: string;
  type: SearchSuggestionKind;
  /** Primary visible text (usually a name or "Search via API"). */
  label: string;
  /** Secondary line (e.g. `#tag · 80k 🏆`). */
  sublabel?: string;
  /** Right-aligned meta tag (e.g. `#12`). */
  meta?: string;
  /** Optional lead glyph override; defaults are picked from `type`. */
  icon?: ReactNode;
  /** Disable interactions (e.g. for "+15 more" placeholder). */
  disabled?: boolean;
}

interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  onRemoveHistory?: (label: string) => void;
  isApiPending?: boolean;
  /** Show suggestions panel even when input is empty (for history). */
  alwaysShowOnFocus?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  /** Optional extra controls below the input (e.g. filter chips). */
  footer?: ReactNode;
}

function defaultIconFor(type: SearchSuggestionKind): ReactNode {
  switch (type) {
    case "history":
      return <History className="h-3.5 w-3.5 text-slate-400" />;
    case "api":
      return <Send className="h-3.5 w-3.5 text-[#facc15]" />;
    case "more":
      return <Search className="h-3.5 w-3.5 text-slate-500" />;
    case "info":
      return <Search className="h-3.5 w-3.5 text-slate-500" />;
    default:
      return <Search className="h-3.5 w-3.5 text-[#a78bfa]" />;
  }
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = "Шукати…",
  suggestions = [],
  onSuggestionSelect,
  onRemoveHistory,
  isApiPending = false,
  alwaysShowOnFocus = true,
  autoFocus = false,
  disabled = false,
  className = "",
  footer,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const hasValue = value.trim().length > 0;
  const dropdownVisible =
    focused &&
    !disabled &&
    suggestions.length > 0 &&
    (alwaysShowOnFocus || hasValue);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!focused) return;
    const onDocPointer = (e: PointerEvent) => {
      const node = containerRef.current;
      if (!node) return;
      if (e.target instanceof Node && node.contains(e.target)) return;
      setFocused(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [focused]);

  const handleSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      if (!hasValue) return;
      haptic.light();
      onSubmit?.(value.trim());
      inputRef.current?.blur();
      setFocused(false);
    },
    [hasValue, onSubmit, value]
  );

  const handleSuggestion = useCallback(
    (suggestion: SearchSuggestion) => {
      if (suggestion.disabled) return;
      haptic.selection();
      onSuggestionSelect?.(suggestion);
      inputRef.current?.blur();
      setFocused(false);
    },
    [onSuggestionSelect]
  );

  const handleClear = () => {
    onChange("");
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} role="search">
        <div
          className={`relative flex items-center rounded-2xl border transition-colors ${
            focused
              ? "border-[#7c3aed]/60 bg-white/[0.06]"
              : "border-white/10 bg-white/5"
          }`}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            autoFocus={autoFocus}
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                inputRef.current?.blur();
                setFocused(false);
              }
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            aria-controls={dropdownVisible ? listboxId : undefined}
            aria-expanded={dropdownVisible}
            className="w-full bg-transparent py-2.5 pl-9 pr-12 text-xs text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            {isApiPending && (
              <Loader2
                className="h-3.5 w-3.5 animate-spin text-[#facc15]"
                aria-hidden
              />
            )}
            {hasValue && !isApiPending && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Очистити пошук"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white active:scale-90"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </form>

      {footer && <div className="mt-2">{footer}</div>}

      <AnimatePresence>
        {dropdownVisible && (
          <motion.ul
            id={listboxId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[320px] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#1a0a2e]/95 p-1.5 shadow-[0_24px_48px_rgba(0,0,0,0.5)] backdrop-blur"
          >
            {suggestions.map((s) => (
              <li key={s.id}>
                <SuggestionRow
                  suggestion={s}
                  query={value}
                  onSelect={handleSuggestion}
                  onRemoveHistory={onRemoveHistory}
                />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function SuggestionRow({
  suggestion,
  query,
  onSelect,
  onRemoveHistory,
}: {
  suggestion: SearchSuggestion;
  query: string;
  onSelect: (s: SearchSuggestion) => void;
  onRemoveHistory?: (label: string) => void;
}) {
  const icon = suggestion.icon ?? defaultIconFor(suggestion.type);
  const isHistory = suggestion.type === "history";
  return (
    <div
      className={`group flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors ${
        suggestion.disabled
          ? "cursor-default opacity-50"
          : "cursor-pointer active:bg-white/10"
      }`}
    >
      <button
        type="button"
        role="option"
        aria-disabled={suggestion.disabled || undefined}
        onClick={() => onSelect(suggestion)}
        disabled={suggestion.disabled}
        className="flex min-h-[32px] flex-1 items-center gap-2.5 text-left"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-white">
            {suggestion.type === "local"
              ? highlightSubstring(suggestion.label, query)
              : suggestion.label}
          </p>
          {suggestion.sublabel && (
            <p className="truncate text-[10px] text-slate-500">
              {suggestion.sublabel}
            </p>
          )}
        </div>
        {suggestion.meta && (
          <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-black text-[#facc15]">
            {suggestion.meta}
          </span>
        )}
      </button>
      {isHistory && onRemoveHistory && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveHistory(suggestion.label);
          }}
          aria-label={`Видалити з історії: ${suggestion.label}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 active:scale-90 active:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
