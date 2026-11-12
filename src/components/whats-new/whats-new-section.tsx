// A short slice of the changelog as a page section: a heading, two entries
// side by side, and a link to the full list on /whats-new. The home page shows
// the latest across the platform (pinned entries first), compact, after the
// report band; a product page shows its own tag.
import { ArrowRight } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { WhatsNewEntry } from "@/components/whats-new/whats-new-entry";
import { Reveal } from "@/components/ui/reveal";
import { entriesFor, type WhatsNewTag } from "@/data/whats-new";
import { cn } from "@/lib/utils";

export function WhatsNewSection({
  id,
  heading,
  tag,
  limit = 2,
  compact = false,
}: Readonly<{ id: string; heading: string; tag?: WhatsNewTag; limit?: number; compact?: boolean }>) {
  const { t } = useTranslation();
  const entries = entriesFor({ tag, limit, pinnedFirst: !tag });
  if (entries.length === 0) return null;

  return (
    <section id={id} className={compact ? "py-12 md:py-16" : "pb-4 pt-16 md:pt-24"}>
      <div className="layout-container">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <h2 className={compact ? "font-home-display text-2xl text-primary md:text-3xl" : "font-home-section-title text-primary"}>{heading}</h2>
            <Link
              to={tag ? `/whats-new?tag=${tag}` : "/whats-new"}
              className="group inline-flex items-center gap-1.5 rounded text-base font-medium text-accent hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t(tag ? "whatsNew.seeAllTagged" : "whatsNew.seeAll", { tag: t(`whatsNew.tags.${tag ?? "archive"}`) })}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </Reveal>

        <ul className={cn("grid gap-x-14 md:grid-cols-2", compact ? "mt-6 gap-y-8" : "mt-10 gap-y-12")}>
          {entries.map((entry, index) => (
            <li key={entry.id}>
              <Reveal delayMs={index * 80}>
                <WhatsNewEntry entry={entry} size={compact ? "small" : "default"} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
