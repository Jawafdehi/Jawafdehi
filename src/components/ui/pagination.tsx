import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import { Button, ButtonProps, buttonVariants } from "@/components/ui/button";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
  ),
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">;

const PaginationLink = ({ className, isActive, size = "icon", ...props }: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className,
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => {
  const { t } = useTranslation();
  return (
  <PaginationLink aria-label={t("pagination.goToPrevPage")} size="default" className={cn("gap-1 pl-2.5", className)} {...props}>
    <ChevronLeft className="h-4 w-4" />
    <span>{t("pagination.previous")}</span>
  </PaginationLink>
  );
};
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => {
  const { t } = useTranslation();
  return (
  <PaginationLink aria-label={t("pagination.goToNextPage")} size="default" className={cn("gap-1 pr-2.5", className)} {...props}>
    <span>{t("pagination.next")}</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
  );
};
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span aria-hidden className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

type PageControlProps = {
  targetPage: number;
  hrefFor?: (page: number) => string;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  current?: boolean;
  label: string;
  className?: string;
  variant?: ButtonProps["variant"];
  children: React.ReactNode;
};

/**
 * One page control, as a `<Link>` when the caller supplied `hrefFor` and a
 * `<button>` otherwise.
 *
 * Disabled controls stay buttons even in link mode. An `<a>` has no disabled
 * state, and the two obvious substitutes are both worse than a button: a link
 * to the page you are already on is a self-referential URL for a crawler to
 * queue, and a link with no href is a button wearing the wrong element.
 */
const PageControl = ({
  targetPage,
  hrefFor,
  onPageChange,
  disabled,
  current,
  label,
  className,
  variant,
  children,
}: PageControlProps) => {
  if (hrefFor && !disabled) {
    return (
      <Button asChild className={className} variant={variant}>
        <Link
          aria-current={current ? "page" : undefined}
          aria-label={label}
          onClick={() => onPageChange(targetPage)}
          to={hrefFor(targetPage)}
        >
          {children}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      aria-current={current ? "page" : undefined}
      aria-label={label}
      className={className}
      disabled={disabled}
      onClick={() => onPageChange(targetPage)}
      type="button"
      variant={variant}
    >
      {children}
    </Button>
  );
};

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  /**
   * Builds the URL for a page number. Supplying it turns every page control
   * into a real `<Link>`, which is the difference between a listing a crawler
   * can walk and one it cannot: an `onClick` handler is invisible to Googlebot,
   * so a button-paged listing exposes only the rows on page one and orphans the
   * rest. Omit it where the view's state does not live in the URL — paging a
   * filtered result set by href would advertise a URL that does not reproduce
   * what the user is looking at, and invite the crawler into an unbounded space
   * of filter combinations.
   *
   * `onPageChange` still fires on click, so callers keep whatever scroll or
   * focus handling they had; the href is what the crawler and a middle-click
   * follow.
   */
  hrefFor?: (page: number) => string;
  className?: string;
};

const PaginationControls = ({
  page,
  pageSize,
  totalItems,
  onPageChange,
  hrefFor,
  className,
}: PaginationControlsProps) => {
  const { t } = useTranslation();
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  if (totalPages <= 1) return null;

  // `page` is whatever the caller asked for — search echoes back the requested
  // ?page= even when it is past the end — so clamp before deriving any display
  // state. Unclamped, page 10 of 9 read "Page 10 of 9" and highlighted no page
  // at all in the numbered list.
  const safePage = clampPage(page, totalPages);

  const pageItems = getPageItems(safePage, totalPages);
  return (
    <Pagination className={cn("mt-8", className)}>
      <PaginationContent className="w-full justify-between gap-2 sm:w-auto sm:justify-center sm:gap-1">
        <PaginationItem>
          <PageControl
            className="h-10 rounded-full px-4"
            disabled={safePage <= 1}
            hrefFor={hrefFor}
            label={t("pagination.goToPrevPage")}
            onPageChange={onPageChange}
            targetPage={safePage - 1}
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t("pagination.previous")}</span>
          </PageControl>
        </PaginationItem>

        <div className="hidden items-center gap-1 sm:flex">
          {pageItems.map((item, index) => (
            <PaginationItem key={`${item}-${index}`}>
              {item === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PageControl
                  className={cn(
                    "h-10 w-10 rounded-full p-0",
                    item === safePage && "pointer-events-none",
                  )}
                  current={item === safePage}
                  // The current page links to itself in link mode. That is the
                  // one self-link worth keeping: it is what `aria-current` is
                  // attached to, and crawlers fold it into the page they are
                  // already on rather than queueing it again.
                  hrefFor={hrefFor}
                  label={t("pagination.goToPage", { page: item })}
                  onPageChange={onPageChange}
                  targetPage={item}
                  variant={item === safePage ? "default" : "ghost"}
                >
                  {item}
                </PageControl>
              )}
            </PaginationItem>
          ))}
        </div>

        <PaginationItem className="sm:hidden">
          <span className="text-sm text-muted-foreground">
            {t("pagination.pageOf", { page: safePage, totalPages })}
          </span>
        </PaginationItem>

        <PaginationItem>
          <PageControl
            className="h-10 rounded-full px-4"
            disabled={safePage >= totalPages}
            hrefFor={hrefFor}
            label={t("pagination.goToNextPage")}
            onPageChange={onPageChange}
            targetPage={safePage + 1}
            variant="outline"
          >
            <span className="hidden sm:inline">{t("pagination.next")}</span>
            <ChevronRight className="h-4 w-4" />
          </PageControl>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
PaginationControls.displayName = "PaginationControls";

/** Fold any requested page — past the end, zero, negative, NaN — into 1..totalPages. */
function clampPage(page: number, totalPages: number) {
  const requested = Number.isFinite(page) ? Math.trunc(page) : 1;
  return Math.min(Math.max(requested, 1), Math.max(1, totalPages));
}

function getPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push("ellipsis");
  items.push(totalPages);

  return items;
}

export {
  Pagination,
  PaginationControls,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
