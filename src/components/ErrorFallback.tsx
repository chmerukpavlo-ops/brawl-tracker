import { useTranslation } from "../hooks/useTranslation";

interface Props {
  error: unknown;
  eventId: string | null;
  onRetry: () => void;
}

/**
 * Full-screen recovery UI shown when {@link ErrorBoundary} catches a
 * render error. Three actions, in order of escalation:
 *
 *   1. "Try again"  — reset the boundary state. Cheapest.
 *   2. "Reload"     — full page refresh; clears any in-memory junk.
 *   3. "Show details" — devs only, expands the error message.
 *
 * The Sentry event id (when available) is shown in monospace so
 * users can paste it into support requests.
 */
export default function ErrorFallback({ error, eventId, onRetry }: Props) {
  const { t } = useTranslation();
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : t("errors.boundary.unknown");

  return (
    <div
      role="alert"
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#1a0a2e] via-[#2d1b4e] to-[#1a0a2e] px-6 py-10"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#2a1a4a]/80 p-6 text-center backdrop-blur">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-3xl">
          ⚠️
        </div>
        <h2 className="text-lg font-semibold text-white">
          {t("errors.boundary.title")}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          {t("errors.boundary.body")}
        </p>

        {import.meta.env.DEV && (
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-black/40 p-3 text-left text-[11px] text-rose-300">
            {message}
          </pre>
        )}

        {eventId && (
          <p className="mt-4 text-xs text-slate-400">
            {t("errors.boundary.eventId")}{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-slate-200">
              {eventId.slice(0, 8)}
            </code>
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-yellow-400 px-4 text-sm font-semibold text-[#1a0a2e] transition hover:bg-yellow-300"
          >
            {t("errors.boundary.retry")}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            {t("errors.boundary.reload")}
          </button>
        </div>
      </div>
    </div>
  );
}
