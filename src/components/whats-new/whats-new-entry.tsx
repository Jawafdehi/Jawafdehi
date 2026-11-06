// One changelog entry, set like a release note: a small line of tags and date,
// a large title in the display face, a sentence or two, and "More" when the
// entry has somewhere to go. Used on /whats-new, the home page and /mcp, so the
// three read as the same list.
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { WhatsNewEntry as Entry } from "@/data/whats-new";
import { cn } from "@/lib/utils";
import { formatDateForLanguage } from "@/utils/date";

/** `large` on /whats-new itself, `default` for product pages, `small` for the
 * home page's short list. */
export function WhatsNewEntry({ entry, size = "default" }: Readonly<{ entry: Entry; size?: "small" | "default" | "large" }>) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "ne" ? "ne" : "en";
  const external = entry.href ? /^https?:\/\//.test(entry.href) : false;

  const more = entry.href ? (
    <>
      {t("whatsNew.more")}
      {external ? (
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      ) : (
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
      )}
    </>
  ) : null;
  const moreClass =
    "group mt-5 inline-flex items-center gap-1.5 rounded text-base font-medium text-accent hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <article>
      <p className="text-sm uppercase tracking-wider text-muted-foreground [:root[lang=ne]_&]:normal-case [:root[lang=ne]_&]:tracking-normal">
        {entry.tags.map((tag) => t(`whatsNew.tags.${tag}`)).join(" · ")}
        <span aria-hidden="true"> · </span>
        {/* Bikram Sambat first in Nepali, AD in English, as on case pages. */}
        <time dateTime={entry.date}>{formatDateForLanguage(entry.date, "PP", null, lang).primary}</time>
      </p>
      {/* leading last: cn() drops a leading-* that a later text-2xl overrides. */}
      <h3 className={cn("font-home-display mt-3 text-primary", size === "large" ? "text-3xl md:text-4xl" : size === "small" ? "text-xl md:text-2xl" : "text-2xl md:text-3xl", "leading-[1.12]")}>
        {entry.title[lang]}
      </h3>
      <p className={cn("max-w-xl text-foreground/70", size === "small" ? "mt-2 text-base leading-7" : "mt-4 text-lg leading-8")}>{entry.body[lang]}</p>
      {entry.href && external ? (
        <a href={entry.href} target="_blank" rel="noreferrer" className={moreClass}>
          {more}
        </a>
      ) : null}
      {entry.href && !external ? (
        <Link to={entry.href} className={moreClass}>
          {more}
        </Link>
      ) : null}
    </article>
  );
}
