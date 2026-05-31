import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCw, WifiOff } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Optional custom fallback. Defaults to a friendly retry card. */
  fallback?: (retry: () => void, error: Error) => ReactNode;
}

interface State {
  error: Error | null;
  /** Bumped to force a remount on retry. */
  retryKey: number;
}

/**
 * Catches `import()` failures from lazy chunks (network errors, stale
 * hashes after a deploy, etc.) and offers a retry button.
 *
 * On retry we bump a `key` on `children` so the lazy component
 * remounts and React triggers the dynamic import again. We also
 * hard-reload when the error looks like a chunk-hash mismatch from a
 * fresh deploy — newer `index.html` references chunks the old SW may
 * not have cached.
 */
export default class ChunkLoadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, retryKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      // Keep dev visibility, prod has drop_console.
      // eslint-disable-next-line no-console
      console.warn("[ChunkLoadErrorBoundary]", error, info);
    }
  }

  private isChunkLoadError(error: Error): boolean {
    const name = error.name ?? "";
    const msg = error.message ?? "";
    return (
      name === "ChunkLoadError" ||
      /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
        msg
      )
    );
  }

  private retry = () => {
    const { error } = this.state;
    if (error && this.isChunkLoadError(error)) {
      if (typeof window !== "undefined") {
        window.location.reload();
        return;
      }
    }
    this.setState((s) => ({ error: null, retryKey: s.retryKey + 1 }));
  };

  render() {
    const { error, retryKey } = this.state;
    const { fallback, children } = this.props;
    if (error) {
      if (fallback) return fallback(this.retry, error);
      const isChunk = this.isChunkLoadError(error);
      return (
        <div
          role="alert"
          className="mx-auto my-6 max-w-sm rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-5 text-center"
        >
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
            {isChunk ? <WifiOff className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
          </span>
          <p className="text-[12.5px] font-black uppercase tracking-tight text-white">
            {isChunk ? "Couldn't load this section" : "Something went wrong"}
          </p>
          <p className="mt-1.5 text-[11.5px] leading-snug text-slate-400">
            {isChunk
              ? "Check your connection or update the app, then try again."
              : "Tap retry to reload this part of the app."}
          </p>
          <button
            type="button"
            onClick={this.retry}
            className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#facc15] px-4 text-[11.5px] font-black uppercase tracking-wider text-[#1a0a2e] active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      );
    }
    return <div key={retryKey}>{children}</div>;
  }
}
