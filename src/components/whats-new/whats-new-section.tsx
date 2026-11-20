// A short slice of the changelog as a page section: a heading, two entries
// side by side, and a link to the full list on Updates & News. A product page
// (/mcp, /likhit) shows its own tag.
import { useTranslation } from "react-i18next";

import { WhatsNewEntry } from "@/components/whats-new/whats-new-entry";
import { ListingHead } from "@/components/ui/listing-head";
import { Reveal } from "@/components/ui/reveal";
import { entriesFor, whatsNewListPath, type WhatsNewTag } from "@/data/whats-new";

export function WhatsNewSection({
  id,
  heading,
  tag,
  limit = 2,
}: Readonly<{ id: string; heading: string; tag?: WhatsNewTag; limit?: number }>) {
  const { t } = useTranslation();
  const entries = entriesFor({ tag, limit, pinnedFirst: !tag });
  if (entries.length === 0) return null;

  return (
    <section id={id} className="pb-4 pt-16 md:pt-24">
      <div className="layout-container">
        <ListingHead heading={heading} to={whatsNewListPath()} linkLabel={t("whatsNew.seeAll")} />
        <ul className="mt-10 grid gap-x-14 gap-y-12 md:grid-cols-2">
          {entries.map((entry, index) => (
            <li key={entry.id}>
              <Reveal delayMs={index * 80}>
                <WhatsNewEntry entry={entry} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
