// A short notice on a faint accent wash: the case pages' legal disclaimer and
// the /mcp setup's "Important" notes. Phrases to stress go in <NoticeEmphasis>.
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Notice({ className, children, ...props }: ComponentPropsWithoutRef<"aside">) {
  return (
    <aside className={cn("rounded-lg bg-accent/5 px-4 py-3.5 sm:px-5", className)} {...props}>
      <p className="text-base font-medium leading-relaxed tracking-wide text-primary/90">{children}</p>
    </aside>
  );
}

export function NoticeEmphasis({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="font-semibold text-accent/90">{children}</span>;
}
