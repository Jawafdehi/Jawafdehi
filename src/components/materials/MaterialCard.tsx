import { Download, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { MaterialSourceLink } from "@/lib/material-links";

const ACTION_BUTTON_CLASS = "h-9 w-28 justify-center px-3";
const ICON_ACTION_BUTTON_CLASS = "h-9 w-9 rounded-full p-0";

function extensionLabel(extension: string | null): string {
  return extension ? `.${extension.toUpperCase()}` : "File";
}

/** "list" is the /materials series row; "card" a vertical grid tile (/search). */
export type MaterialCardViewMode = "list" | "card";

/**
 * One labelled metadata fact, rendered as an icon-led row: a catalogue entry's
 * "Series: …" / "Source: …" line.
 *
 * The icon is fixed per FIELD, not per value — it is a glyph for "this row is
 * the series", so the column reads as a consistent set of labels rather than
 * as a per-record picture.
 */
export interface MaterialMetaRow {
  icon: LucideIcon;
  label: string;
  /** ReactNode so a value can carry search highlights. */
  value: ReactNode;
}

/**
 * The metadata block: label + value rows under an icon rail. Values are
 * emphasised over their labels, so a reader scanning a column of results
 * reads the facts and skips the field names.
 */
function MaterialMeta({ rows }: Readonly<{ rows: readonly MaterialMetaRow[] }>) {
  return (
    <dl className="mt-2 space-y-1">
      {rows.map(({ icon: Icon, label, value }) => (
        <div className="flex items-start gap-2 text-[13px] leading-5" key={label}>
          <Icon
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
          />
          <dt className="shrink-0 text-muted-foreground">{label}:</dt>
          <dd className="min-w-0 break-words font-semibold text-foreground">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

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
  titleNode,
  href,
  metaLine,
  metaRows,
  description,
  links = [],
  shareUrl,
  viewMode = "list",
}: Readonly<{
  /** Plain title — the accessible name, and the `title` attribute source. */
  title: string;
  /** Optional rendered title (e.g. carrying search highlights). */
  titleNode?: ReactNode;
  /** Internal details path (`/material/<source>/<ident>`). */
  href: string;
  /** The compact italic register line: series/institution · date. */
  metaLine?: string;
  /** Labelled catalogue rows; takes precedence over `metaLine` when given. */
  metaRows?: readonly MaterialMetaRow[];
  /** Optional muted line under the meta (e.g. a search snippet). */
  description?: ReactNode;
  /**
   * Download / original-source actions; the card renders at most two. Only the
   * series browse passes these — it holds the full data-lake record. Search
   * hits have no media in the index, so their cards are title + meta + share.
   */
  links?: readonly MaterialSourceLink[];
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
          : "grid gap-5 md:grid-cols-[minmax(0,1fr)_auto]",
        // Labelled rows make the text column tall, so the actions sit at the
        // top of the row rather than floating in its vertical middle.
        !isTile && (metaRows ? "md:items-start" : "md:items-center"),
      )}
    >
      <div className="min-w-0">
        <Link
          to={href}
          className="line-clamp-2 text-[15px] font-semibold leading-snug text-primary outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-accent"
          title={title}
        >
          {titleNode ?? title}
        </Link>
        {metaRows ? (
          <MaterialMeta rows={metaRows} />
        ) : metaLine ? (
          <p className="mt-1.5 text-sm italic text-muted-foreground">{metaLine}</p>
        ) : null}
        {description ? (
          <p className="mt-2 line-clamp-3 break-words text-[13px] leading-5 text-muted-foreground">
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
