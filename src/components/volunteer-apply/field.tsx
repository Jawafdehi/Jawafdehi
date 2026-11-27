import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { REQUIRED, useCopy } from "@/components/volunteer-apply/shared";

export function Field({
  label,
  error,
  hint,
  children,
  className,
  htmlFor,
  optional,
  required,
  extra,
}: Readonly<{
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  optional?: boolean;
  required?: boolean;
  extra?: ReactNode;
}>) {
  const { c } = useCopy();
  const message = error && error !== REQUIRED ? error : null;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-primary">
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 text-danger">
              *
            </span>
          ) : null}
          {optional ? <span className="ml-1 text-xs font-normal text-muted-foreground">({c.optional})</span> : null}
        </label>
        {extra}
      </div>
      {children}
      {hint && !message ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {message ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}
