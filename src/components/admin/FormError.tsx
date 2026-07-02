import { cn } from "@/lib/utils";

// Shared error UI for the admin panel. Centralizes the two error styles that
// were previously copy-pasted across every form:
//
//   FormError — a boxed, page-level error (failed load/save). Renders nothing
//               when `message` is falsy, so call sites can drop the `&&` guard.
//   FieldError — an inline, one-line validation hint under a field.
//
// Both use the brand red (text-red-600 / border-red-200). NOTE: we deliberately
// do NOT use the `destructive` token here — it maps to an orange in this theme
// (--destructive: 25 95% 53%), reserved for the destructive *button* variant.
// Errors are red; keeping that in one place is the whole point of this module.

export function FormError({
  message,
  className,
}: {
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        "rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600",
        className,
      )}
    >
      {message}
    </p>
  );
}

export function FieldError({
  message,
  className,
}: {
  message?: string | null | false;
  className?: string;
}) {
  if (!message) return null;
  return <p className={cn("text-xs text-red-600", className)}>{message}</p>;
}
