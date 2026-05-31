import { Component, type ReactNode, type ErrorInfo } from "react";
import { captureException, addBreadcrumb, isInitialized } from "../lib/telemetry";
import ErrorFallback from "./ErrorFallback";

interface Props {
  children: ReactNode;
  /** Stable label that flows into Sentry as `tag.boundary`. */
  scope?: string;
  /** Override fallback (e.g. minimal inline UI for sub-trees). */
  fallback?: (props: {
    error: unknown;
    eventId: string | null;
    reset: () => void;
  }) => ReactNode;
}

interface State {
  error: unknown | null;
  eventId: string | null;
}

/**
 * Vanilla React 19 error boundary. Independent of Sentry — falls
 * back to logging when telemetry is opt-ed out, so users without
 * consent still see the recovery UI.
 *
 * Why not `Sentry.withErrorBoundary`?
 *   - It pulls Sentry into the eager bundle (we want it lazy).
 *   - Its API doesn't expose the eventId synchronously when telemetry
 *     is disabled. Our copy works the same in both modes.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, eventId: null };
  declare props: Props;

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    addBreadcrumb({
      category: "ui",
      level: "error",
      message: "ErrorBoundary caught render error",
      data: {
        componentStack: info.componentStack ?? "",
        scope: this.props.scope ?? "root",
      },
    });

    if (isInitialized()) {
      captureException(error, {
        tags: {
          "error.boundary": this.props.scope ?? "root",
        },
        extra: {
          componentStack: info.componentStack ?? "",
        },
      });
      // Sentry stamps the most recent event id on the global scope —
      // we expose it so users can quote it in support requests.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lastId = (window as any).__SENTRY_LAST_EVENT_ID__ ?? null;
      if (typeof lastId === "string") this.setState({ eventId: lastId });
    } else {
      // No telemetry available — log to console so a developer
      // grabbing a user's machine can still reproduce.
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  reset = (): void => {
    this.setState({ error: null, eventId: null });
  };

  render(): ReactNode {
    if (this.state.error !== null) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          eventId: this.state.eventId,
          reset: this.reset,
        });
      }
      return (
        <ErrorFallback
          error={this.state.error}
          eventId={this.state.eventId}
          onRetry={this.reset}
        />
      );
    }
    return this.props.children;
  }
}
