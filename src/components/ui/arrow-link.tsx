import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { MouseEventHandler, ReactNode } from "react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

/**
 * The redesign's call-to-action pill: a label and a round arrow button at its
 * right end. `to` routes inside the app; `href` leaves it, opening a new tab
 * with the arrow turned up-right to say so.
 */
export function ArrowLink({
  to,
  href,
  tone = "dark",
  className,
  onClick,
  children,
}: {
  className?: string;
  tone?: "light" | "dark";
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
} & ({ to: string; href?: never } | { href: string; to?: never })) {
  const pillClass = cn(
    "group inline-flex items-center justify-between gap-6 rounded-full py-1.5 pl-5 pr-1.5 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
    tone === "light" ? "bg-surface text-primary" : "bg-primary-surface text-primary-foreground",
    className,
  );
  const Arrow = href ? ArrowUpRight : ArrowRight;
  const arrow = (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200",
        href ? "group-hover:-translate-y-0.5 group-hover:translate-x-0.5" : "group-hover:translate-x-0.5",
        tone === "light" ? "bg-primary-surface text-primary-foreground" : "bg-surface text-primary",
      )}
    >
      <Arrow className="h-4 w-4" />
    </span>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={pillClass}>
        {children}
        {arrow}
      </a>
    );
  }
  return (
    <Link to={to} onClick={onClick} className={pillClass}>
      {children}
      {arrow}
    </Link>
  );
}
