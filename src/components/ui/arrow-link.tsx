// The redesign's one call-to-action shape: the label on the left, a round
// arrow on the right. `tone` follows what it sits on: "light" is a white pill
// for navy panels, "dark" a navy pill for light ones.
import { ArrowRight } from "lucide-react";
import type { MouseEventHandler, ReactNode } from "react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

export function ArrowLink({
  to,
  tone = "dark",
  className,
  onClick,
  children,
}: {
  to: string;
  tone?: "light" | "dark";
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "group inline-flex items-center justify-between gap-6 rounded-full py-1.5 pl-5 pr-1.5 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        tone === "light" ? "bg-surface text-primary" : "bg-primary-surface text-primary-foreground",
        className,
      )}
    >
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5",
          tone === "light" ? "bg-primary-surface text-primary-foreground" : "bg-surface text-primary",
        )}
      >
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
