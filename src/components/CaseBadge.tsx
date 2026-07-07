import type { ComponentProps, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  getCaseBadgeClassName,
  type CaseStatusValue,
  type CaseTypeValue,
} from "@/lib/case-badges";

type CaseBadgeProps = Omit<ComponentProps<typeof Badge>, "children" | "variant"> & {
  children: ReactNode;
};

export function CaseStatusBadge({
  status,
  className,
  children,
  ...props
}: CaseBadgeProps & { status: CaseStatusValue }) {
  return (
    <Badge className={getCaseBadgeClassName("status", status, className)} {...props}>
      {children}
    </Badge>
  );
}

export function CaseTypeBadge({
  caseType,
  className,
  children,
  ...props
}: CaseBadgeProps & { caseType: CaseTypeValue }) {
  return (
    <Badge className={getCaseBadgeClassName("case-type", caseType, className)} {...props}>
      {children}
    </Badge>
  );
}

export function CaseTagBadge({ className, children, ...props }: CaseBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={getCaseBadgeClassName("tag", undefined, className)}
      {...props}
    >
      {children}
    </Badge>
  );
}
