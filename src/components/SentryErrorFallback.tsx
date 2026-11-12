import { Button } from "@/components/ui/button";

interface SentryErrorFallbackProps {
  // Sentry hands over whatever was thrown, which need not be an Error.
  error?: unknown;
  resetError?: () => void;
}

export function SentryErrorFallback({ error, resetError }: SentryErrorFallbackProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground"
      role="alert"
    >
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          Something went wrong
        </h1>
        <p className="mb-6 text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        {resetError && (
          <Button onClick={resetError} variant="default">
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
