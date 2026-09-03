import { Download, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { MaterialSourceLink } from "@/lib/material-links";

const ACTION_BUTTON_CLASS = "h-9 w-28 justify-center px-3";
const ICON_ACTION_BUTTON_CLASS = "h-9 w-9 rounded-full p-0";

function extensionLabel(extension: string | null): string {
  return extension ? `.${extension.toUpperCase()}` : "File";
}

/** "list" is the /materials series row; "card" a vertical grid tile (/search). */
export type MaterialCardViewMode = "list" | "card";

/**
 * The archive's document card, shared by the /materials series browse and the
 * /search materials tab. Purely presentational: each surface maps its own
 * record shape (data-lake Material, search index hit) onto these props, so the
 * two views cannot drift apart on chrome — only on the fields they can fill.
 * The title is the only navigation target; downloads and share are explicit
 * buttons beside it, never a stretched overlay.
 */
export function MaterialCard({
  title,
  href,
  metaLine,
  description,
  links = [],
  linksLoading = false,
  shareUrl,
  viewMode = "list",
}: Readonly<{
  title: string;
  /** Internal details path (`/material/<source>/<ident>`). */
  href: string;
  /** The italic register line: series/institution · date. */
  metaLine: string;
  /** Optional muted line under the meta (e.g. a search snippet). */
  description?: string;
  /** Download / original-source actions; the card renders at most two. */
  links?: readonly MaterialSourceLink[];
  /** True while a caller is still hydrating `links` (renders placeholders). */
  linksLoading?: boolean;
  shareUrl: string;
  viewMode?: MaterialCardViewMode;
}>) {
  const { t } = useTranslation();
  const isTile = viewMode === "card";

  return (
    <Card
      className={cn(
        "rounded-xl border-0 bg-surface p-5 shadow-elev-md transition-shadow hover:shadow-elev-lg",
        isTile
          ? "flex h-full flex-col gap-5"
          : "grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center",
      )}
    >
      <div className="min-w-0">
        <Link
          to={href}
          className="line-clamp-2 text-lg font-semibold leading-snug text-primary outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-accent"
        >
          {title}
        </Link>
        <p className="mt-1.5 text-sm italic text-muted-foreground">{metaLine}</p>
        {description ? (
          <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          isTile ? "mt-auto" : "md:justify-end",
        )}
      >
        {linksLoading && links.length === 0 ? (
          // Same footprint as the settled icon + download pair, so the row
          // doesn't jump when the hydrated links arrive.
          <>
            <Skeleton aria-hidden="true" className={ICON_ACTION_BUTTON_CLASS} />
            <Skeleton aria-hidden="true" className="h-9 w-28 rounded-md" />
          </>
        ) : null}
        {links.slice(0, 2).map((link) => (
          <Button
            asChild
            key={link.href}
            variant={link.isExternal ? "ghost" : "default"}
            size={link.isExternal ? "icon" : "sm"}
            className={link.isExternal ? ICON_ACTION_BUTTON_CLASS : ACTION_BUTTON_CLASS}
          >
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={
                link.isExternal
                  ? t("materialsLanding.series.openSource", "Open original source")
                  : t("materialsLanding.series.download", "Download {{format}}", {
                      format: extensionLabel(link.extension),
                    })
              }
            >
              {link.isExternal ? (
                <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <>
                  <Download aria-hidden="true" className="h-3.5 w-3.5" />
                  {extensionLabel(link.extension)}
                </>
              )}
            </a>
          </Button>
        ))}
        <ShareButton
          url={shareUrl}
          title={title}
          variant="ghost"
          size="icon"
          showLabel={false}
          className={ICON_ACTION_BUTTON_CLASS}
        />
      </div>
    </Card>
  );
}
