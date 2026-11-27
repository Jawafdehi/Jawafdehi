// SPDX-License-Identifier: Hippocratic-3.0
import type { SeriesDetail, SeriesText } from "@/types/series";
import { schemaType } from "@/utils/case-jsonld";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

type SeriesJsonLdSource = Pick<
  SeriesDetail,
  "slug" | "title" | "updated_at" | "members" | "accused" | "court_cases"
>;

function text(value: SeriesText | null | undefined, first: "ne" | "en"): string {
  const other = first === "ne" ? "en" : "ne";
  return (value?.[first] || value?.[other] || "").trim();
}

/** The member's own page: the canonical case URL, slash-terminated like CaseDetail's. */
function casePageUrl(slug: string): string {
  return `${SITE_URL}/case/${encodeURIComponent(slug)}/`;
}

/**
 * schema.org JSON-LD for a case-series page.
 *
 * A series is a page that GROUPS our reports on one affair, so it is a
 * `CollectionPage` whose `mainEntity` is the ordered list of member case pages
 * (each a `Report`, as the case page itself says). Beyond that it follows the
 * case page's rules (utils/case-jsonld.ts):
 *
 * - `about`: the accused across the members. The API's `accused` list holds
 *   only ACCUSED binds, which the case page also names in `about`; other roles
 *   never reach it.
 * - `mentions`: the court cases, by their canonical @id (rows without an @id —
 *   proceedings outside any court — are left out).
 * - `publisher`: the organisation, as on the case page.
 *
 * Only public series exist on the API (`GET /api/series/<slug>/` 404s the
 * rest), so there is no unpublished state to withhold.
 */
export function seriesJsonLd(
  series: SeriesJsonLdSource,
  opts: { canonicalUrl: string; description: string },
): Record<string, unknown> {
  const name = text(series.title, "ne") || series.slug;
  const english = text(series.title, "en");
  const publisher = {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` },
  };
  const members = (series.members ?? []).filter((m) => m.case?.slug);
  const accused = (series.accused ?? []).filter((a) => a.nes_id && text(a.name, "ne"));
  const courtCases = [
    ...new Set(
      (series.court_cases ?? [])
        .map((row) => row.iri)
        .filter((iri): iri is string => typeof iri === "string" && /^https?:\/\//.test(iri)),
    ),
  ];

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    ...(english && english !== name ? { alternateName: english } : {}),
    description: opts.description,
    url: opts.canonicalUrl,
    isAccessibleForFree: true,
    ...(series.updated_at ? { dateModified: series.updated_at } : {}),
    publisher,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: members.length,
      itemListElement: members.map((member, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: casePageUrl(member.case.slug),
        name: member.case.title,
      })),
    },
    ...(accused.length
      ? {
          about: accused.map((a) => ({
            "@type": schemaType(a.entity_type ?? undefined),
            "@id": a.nes_id,
            name: text(a.name, "ne"),
          })),
        }
      : {}),
    ...(courtCases.length
      ? {
          mentions: courtCases.map((iri) => ({
            "@type": "CreativeWork",
            "@id": iri,
            url: iri,
            name: iri.slice(iri.lastIndexOf("/") + 1).toUpperCase(),
          })),
        }
      : {}),
  };
}
