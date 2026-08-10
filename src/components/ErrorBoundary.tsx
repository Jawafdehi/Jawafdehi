import * as Sentry from "@sentry/react";
import type { ReactNode } from "react";
import type { FallbackRender } from "@sentry/react";

const ErrorFallback: FallbackRender = ({ error, resetError }) => {
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      role="alert"
    >
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Something went wrong</h1>
        <p className="mb-6 text-xl text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        {message !== "Unknown error" && (
          <pre className="mb-6 max-w-md break-words text-left text-xs text-muted-foreground">
            {message}
          </pre>
        )}
        <button
          onClick={resetError}
          className="rounded-md bg-primary-surface px-4 py-2 text-primary-foreground hover:bg-primary-surface/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
};

export default function ErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <Sentry.ErrorBoundary fallback={ErrorFallback}>
      {children}
    </Sentry.ErrorBoundary>
  );
}
