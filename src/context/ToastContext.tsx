import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastType = "success" | "error" | "info" | "record";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  duration?: number;
  action?: ToastAction;
  icon?: ReactNode;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  options?: ToastOptions;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showSuccess: (message: string, options?: ToastOptions) => string;
  showError: (message: string, options?: ToastOptions) => string;
  showInfo: (message: string, options?: ToastOptions) => string;
  showRecord: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const show = useCallback(
    (type: ToastType, message: string, options?: ToastOptions): string => {
      const id = generateId();
      setToasts((prev) => [...prev, { id, type, message, options }]);
      return id;
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, options?: ToastOptions) => show("success", message, options),
    [show]
  );
  const showError = useCallback(
    (message: string, options?: ToastOptions) => show("error", message, options),
    [show]
  );
  const showInfo = useCallback(
    (message: string, options?: ToastOptions) => show("info", message, options),
    [show]
  );
  const showRecord = useCallback(
    (message: string, options?: ToastOptions) => show("record", message, options),
    [show]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      showSuccess,
      showError,
      showInfo,
      showRecord,
      dismiss,
      dismissAll,
    }),
    [toasts, showSuccess, showError, showInfo, showRecord, dismiss, dismissAll]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
