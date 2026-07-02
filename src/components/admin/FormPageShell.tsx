import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/admin/FormError";
import { ArrowLeft, Loader2 } from "lucide-react";

// The common chrome every admin form page repeats: a "back to list" ghost
// button, an <h1> title, an optional subtitle, the page-level error box, and a
// centered spinner while loading. The form body is passed as children.
interface FormPageShellProps {
  title: string;
  // Back-link label + destination (e.g. "Courts" -> /admin/datalake/courts).
  backLabel: string;
  onBack: () => void;
  subtitle?: ReactNode;
  error?: string | null;
  loading?: boolean;
  // Tailwind max-width for the content column (forms vary: 2xl vs 3xl).
  maxWidthClassName?: string;
  children: ReactNode;
}

export default function FormPageShell({
  title,
  backLabel,
  onBack,
  subtitle,
  error,
  loading = false,
  maxWidthClassName = "max-w-2xl",
  children,
}: FormPageShellProps) {
  if (loading) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return (
    <div className={`${maxWidthClassName} space-y-6`}>
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {backLabel}
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? (
          <div className="text-sm text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>

      <FormError message={error} />

      {children}
    </div>
  );
}
