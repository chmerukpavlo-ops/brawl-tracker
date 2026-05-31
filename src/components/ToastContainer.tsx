import { AnimatePresence } from "motion/react";
import { useToast } from "../context/ToastContext";
import Toast from "./Toast";

const MAX_VISIBLE = 3;

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();
  const visible = toasts.slice(0, MAX_VISIBLE);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="flex w-full max-w-[398px] flex-col gap-2 px-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
