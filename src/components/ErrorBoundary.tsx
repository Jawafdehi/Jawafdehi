import * as Sentry from "@sentry/react";
import type { ReactNode } from "react";
import type { FallbackRender } from "@sentry/react";

import { EmptyState } from "@/components/ui/empty-state";

const ErrorFallback: FallbackRender = ({ error, resetError }) => {
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");

  return (
    <div className="flex min-h-screen items-center justify-center px-4" role="alert">
      <EmptyState
        kind="somethingBroke"
        title="Something went wrong"
        description="An unexpected error occurred. Please try again."
        actions={
          <>
            <button
              onClick={resetError}
              className="h-11 rounded-full bg-primary-surface px-5 text-[15px] text-primary-foreground hover:bg-primary-surface/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Try again
            </button>
            {message !== "Unknown error" ? (
              <pre className="w-full max-w-md break-words whitespace-pre-wrap text-left text-xs text-muted-foreground">
                {message}
              </pre>
            ) : null}
          </>
        }
      />
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
