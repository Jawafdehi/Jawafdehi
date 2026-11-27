// SPDX-License-Identifier: Hippocratic-3.0
import type { Case } from "@/types/jds";
import { SITE_NAME, SITE_URL } from "@/utils/seo";

type CaseJsonLdSource = Pick<
  Case,
  "title" | "state" | "created_at" | "updated_at" | "entities" | "court_cases"
> &
  Partial<Pick<Case, "case_publish_date" | "authors" | "evidence" | "title_en">>;

// The schema.org type an entity bind names, without the registry's own
// `jawafdehi:` subtypes: "AdministrativeArea,jawafdehi:District" → "AdministrativeArea".
// Shared with the series page (utils/series-jsonld.ts).
export function schemaType(entityType: string | undefined): string {
  const first = (entityType ?? "")
    .split(",")
    .map((s) => s.trim())
    .find((s) => s && !s.includes(":"));
  return first || "Thing";
}

// Whether `about` may name this bound entity. Anyone accused or alleged — the
// people the case is about in the sense a searcher means — and any entity that is
// not a person: an office, a company, a bank. NOT a person bound as a witness, a
// victim, a petitioner or anything else: `about` links their Person node to a
// corruption report, and the page's own rule (the snippet names only accused and
// alleged roles; see entityMeta) must hold in the structured data too. An entity
// whose type is unknown is treated as a person — fail closed.
function nameableInAbout(entity: { type?: string; entity_type?: string }): boolean {
  if (entity.type === "accused" || entity.type === "alleged") return true;
  const type = schemaType(entity.entity_type);
  return type !== "Person" && type !== "Thing";
}

// Google flags a headline over ~110 characters. A longer title is left out of
// `headline` rather than cut: a Nepali title often ends on the outcome
// ("…लाई सफाई"), so a cut would keep the charge and drop the acquittal. The
// full title is always in `name`.
const HEADLINE_MAX = 110;

/**
 * schema.org JSON-LD for a case page, or null for a case that is not published.
 *
 * A case is our report on a matter, so it is a `Report` — the schema.org type
 * for a report by a governmental or non-governmental organisation — and NOT a
 * `NewsArticle`, which it is not and which Google would hold to news policies.
 * It links the case to everything the page is built from:
 *
 * - `about`: the accused and alleged, and the organisations it names. It says
 *   the report is ABOUT them and nothing about their role — roles belong on the
 *   page, where they carry their verdicts and forums. A person bound in any other
 *   role (witness, victim, petitioner) is left out: naming them here would tie
 *   their name to a corruption report in a search engine's graph, which the page
 *   itself is careful never to do in a snippet. The mirror of the entity page's
 *   `subjectOf`, so the graph connects in both directions on the same terms.
 * - `spatialCoverage`: the places it names.
 * - `mentions`: the court cases, by their canonical @id.
 * - `citation`: the evidence documents.
 *
 * Only a PUBLISHED case gets any. An IN_REVIEW case is served by direct slug but
 * is `noindex, nofollow`, and structured data is read by more than search
 * engines that honour robots — so a provisional record does not publish its
 * structure either.
 */
export function caseJsonLd(
  caseData: CaseJsonLdSource,
  opts: { canonicalUrl: string; description: string; imageUrl: string },
): Record<string, unknown> | null {
  if (caseData.state !== "PUBLISHED") return null;

  const named = (caseData.entities ?? []).filter((e) => e.nes_id && e.display_name);
  const people = named.filter((e) => e.type !== "location" && nameableInAbout(e));
  const places = named.filter((e) => e.type === "location");
  // Unique by @id: one person can be bound to a case in two roles.
  const unique = <T extends { nes_id: string | null }>(list: T[]) =>
    list.filter((e, i) => list.findIndex((o) => o.nes_id === e.nes_id) === i);

  const courtCases = (caseData.court_cases ?? []).filter((ref) => /^https?:\/\//.test(ref));
  const evidence = (caseData.evidence ?? []).filter((e) => e.material_iri);
  const authors = (caseData.authors ?? []).filter((a) => a.display_name);
  const publisher = {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` },
  };

  return {
    "@context": "https://schema.org",
    "@type": "Report",
    ...(caseData.title.length <= HEADLINE_MAX ? { headline: caseData.title } : {}),
    name: caseData.title,
    // The caseworker-written English title, as the headline's other language.
    ...(caseData.title_en?.trim() ? { alternativeHeadline: caseData.title_en.trim() } : {}),
    description: opts.description,
    url: opts.canonicalUrl,
    image: opts.imageUrl,
    isAccessibleForFree: true,
    datePublished: caseData.case_publish_date || caseData.created_at,
    dateModified: caseData.updated_at,
    publisher,
    author: authors.length
      ? authors.map((a) => ({
          "@type": "Person",
          name: a.display_name,
          ...(a.slug ? { url: `${SITE_URL}/author/${encodeURIComponent(a.slug)}` } : {}),
        }))
      : publisher,
    ...(people.length
      ? {
          about: unique(people).map((e) => ({
            "@type": schemaType(e.entity_type),
            "@id": e.nes_id,
            name: e.display_name,
          })),
        }
      : {}),
    ...(places.length
      ? {
          spatialCoverage: unique(places).map((e) => ({
            "@type": "Place",
            "@id": e.nes_id,
            name: e.display_name,
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
    ...(evidence.length
      ? {
          citation: evidence.map((e) => ({
            "@type": "CreativeWork",
            url: e.material_iri,
            ...(e.material?.display_name ? { name: e.material.display_name } : {}),
          })),
        }
      : {}),
  };
}
