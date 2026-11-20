// The Updates & News feed's tiles that are shared beyond the page: the dot-field
// panel a story without a picture gets, and a product update (a changelog entry)
// as a text card. The post page (/updates/product/<id>) reuses the card for
// "More product updates".
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { CaseTagBadge } from "@/components/CaseBadge";
import { ArrowRight, Calendar } from "@/components/icons";
import { whatsNewPostPath, type WhatsNewEntry } from "@/data/whats-new";
import { formatPublicationDate } from "@/utils/date";

/** The no-picture panel: the archive's dot field in pale blue, fading out. */
export function DotField({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
      <div className="absolute inset-0 [background-image:radial-gradient(hsl(214_45%_70%)_1.2px,transparent_1.7px)] [background-size:9px_9px] [mask-image:radial-gradient(ellipse_at_70%_30%,#000_10%,transparent_70%)]" />
      {children}
    </div>
  );
}

/**
 * A product update (a changelog entry) as a text card: no picture panel, just
 * a hairline card with the pill and the date at the top and the product, the
 * title, the text and "Read more" at the foot, left aligned. Opens the entry's
 * own post.
 */
export function ProductTile({ entry }: Readonly<{ entry: WhatsNewEntry }>) {
  const { t, i18n } = useTranslation();
  const lang = i18n?.language === "ne" ? "ne" : "en";
  const product = entry.tags.map((tag) => t(`whatsNew.tags.${tag}`)).join(" · ");

  return (
    <Link
      to={whatsNewPostPath(entry.id)}
      data-shape="product"
      className="group flex h-full flex-col rounded-[22px] border border-border/70 bg-background p-6 transition-[border-color,transform] duration-150 ease-out hover:border-primary/25 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 motion-reduce:active:scale-100"
    >
      <div className="flex items-center justify-between gap-3">
        <CaseTagBadge className="px-3 py-1 text-sm">{t("updates.category.PRODUCT", "Product update")}</CaseTagBadge>
        <span className="inline-flex items-center gap-1.5 text-[15px] text-muted-foreground">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          {formatPublicationDate(entry.date)}
        </span>
      </div>
      {/* The words sit at the foot, where a story's sit under its picture. */}
      <p className="mt-auto pt-8 text-sm text-muted-foreground">{product}</p>
      <h2 className="mt-1 line-clamp-2 text-xl font-normal leading-snug text-primary underline-offset-4 decoration-primary/30 group-hover:underline">
        {entry.title[lang]}
      </h2>
      <p className="mt-2 line-clamp-3 text-[15px] leading-6 text-muted-foreground">{entry.body[lang]}</p>
      <span className="inline-flex items-center gap-1.5 pt-5 text-[15px] font-medium text-primary">
        {t("updates.readMore")}
        <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
