import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

export type Crumb = {
  label: string;
  /** Omit for the current page, which is the last crumb and not a link. */
  to?: string;
  /** Case numbers and other references read in the mono face. */
  mono?: boolean;
};

/**
 * The trail every detail page opens with (Home / section / this record): grey
 * links, the current page in navy, slashes between. Each link is at least
 * 24px tall, the WCAG 2.5.8 minimum, so a thumb can land on it. The LAST crumb
 * truncates rather than wrap on a phone, link or not (a document's series is a
 * link and can be the longest thing in the trail).
 */
export function PageBreadcrumb({ items, className }: Readonly<{ items: Crumb[]; className?: string }>) {
  return (
    <nav aria-label="breadcrumb" className={cn("flex min-w-0 items-center gap-2 text-sm text-muted-foreground", className)}>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
        <span key={`${item.label}-${index}`} className={cn("flex items-center gap-2", last ? "min-w-0" : "shrink-0")}>
          {index > 0 ? (
            <span aria-hidden="true" className="shrink-0 opacity-50">
              /
            </span>
          ) : null}
          {item.to ? (
            <Link
              to={item.to}
              className={cn(
                "block min-h-6 rounded-sm leading-6 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                last && "min-w-0 truncate",
                item.mono && "font-mono text-[13px]",
              )}
            >
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className={cn("min-w-0 truncate text-primary/80", item.mono && "font-mono text-[13px]")}>
              {item.label}
            </span>
          )}
        </span>
        );
      })}
    </nav>
  );
}
