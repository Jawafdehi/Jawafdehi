// The changelog as a bento box, on Updates & News. The first entry (pinned, or
// the newest) is the feature: two columns by two rows on the mist shader, the
// same card the /likhit and /mcp pages use. The rest are hairline tiles around
// it, so five entries fill a 4 x 2 grid exactly. Every tile opens the entry's
// own post (/updates/whats-new/<id>).
import { ArrowRight } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { whatsNewPostPath, type WhatsNewEntry } from "@/data/whats-new";
import { cn } from "@/lib/utils";
import { formatDateForLanguage } from "@/utils/date";

function Meta({ entry }: Readonly<{ entry: WhatsNewEntry }>) {
  const { t, i18n } = useTranslation();
  const lang = i18n?.language === "ne" ? "ne" : "en";
  return (
    <p className="text-sm text-muted-foreground">
      <span className="text-accent">{entry.tags.map((tag) => t(`whatsNew.tags.${tag}`)).join(" · ")}</span>
      <span aria-hidden="true"> · </span>
      {/* Bikram Sambat first in Nepali, AD in English, as on case pages. */}
      <time dateTime={entry.date}>{formatDateForLanguage(entry.date, "PP", null, lang).primary}</time>
    </p>
  );
}

const TILE =
  "group relative isolate flex h-full flex-col overflow-hidden rounded-[28px] border border-border/70 p-6 transition-[border-color,transform] duration-150 ease-out hover:border-primary/25 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:active:scale-100";

export function WhatsNewBento({ entries }: Readonly<{ entries: readonly WhatsNewEntry[] }>) {
  const { t, i18n } = useTranslation();
  const lang = i18n?.language === "ne" ? "ne" : "en";
  if (entries.length === 0) return null;
  const [feature, ...rest] = entries;

  return (
    <ul data-feed="whats-new" className="grid list-none grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <li className="md:col-span-2 lg:row-span-2">
        <Link to={whatsNewPostPath(feature.id)} className={cn(TILE, "min-h-[20rem] bg-surface md:p-8")}>
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <ShaderBackdrop design="mist" />
          </div>
          <Meta entry={feature} />
          <h3 className="font-home-display mt-auto pt-10 text-3xl leading-[1.1] text-primary md:text-4xl">
            {feature.title[lang]}
          </h3>
          <p className="mt-4 max-w-xl text-lg leading-8 text-foreground/70">{feature.body[lang]}</p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-base font-medium text-primary">
            {t("updates.readMore")}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
      </li>
      {rest.map((entry) => (
        <li key={entry.id}>
          <Link to={whatsNewPostPath(entry.id)} className={cn(TILE, "min-h-[14rem] bg-background")}>
            <Meta entry={entry} />
            <h3 className="font-home-display mt-4 text-xl leading-[1.2] text-primary md:text-2xl">{entry.title[lang]}</h3>
            <p className="mt-2 line-clamp-3 text-[15px] leading-6 text-muted-foreground">{entry.body[lang]}</p>
            <span className="mt-auto inline-flex items-center gap-1.5 self-end pt-4 text-[15px] font-medium text-primary">
              {t("updates.readMore")}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
