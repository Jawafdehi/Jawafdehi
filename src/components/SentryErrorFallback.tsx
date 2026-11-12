import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

interface SentryErrorFallbackProps {
  // Sentry hands over whatever was thrown, which need not be an Error.
  error?: unknown;
  resetError?: () => void;
}

export function SentryErrorFallback({ error, resetError }: SentryErrorFallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground" role="alert">
      <EmptyState
        kind="somethingBroke"
        title="Something went wrong"
        description="An unexpected error occurred. Please try again."
        actions={
          resetError ? (
            <Button onClick={resetError} variant="default" className="rounded-full">
              Try again
            </Button>
          ) : null
        }
      />
    </div>
  );
}
