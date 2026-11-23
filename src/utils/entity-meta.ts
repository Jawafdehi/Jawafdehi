// SPDX-License-Identifier: Hippocratic-3.0
import type { TFunction } from "i18next";

import type { Case } from "@/types/jds";
import { caseInvolvement, orderCasesForEntity } from "@/utils/entity-involvement";
import { casePath } from "@/lib/case-links";
import { SITE_URL, truncateMeta } from "@/utils/seo";

/**
 * The entity's name in both scripts, the page's language first: "रवि लामिछाने ·
 * Rabi Lamichhane" on a Nepali page.
 *
 * Both, because the people searching for a name use both. A title carrying only
 * "Rabi Lamichhane" has nothing to match रवि लामिछाने, and the reverse — and
 * the record already holds both, so this costs no new URL and no hreflang.
 */
export function bilingualName(
  names: { en: string; ne: string },
  language: string,
  fallback: string,
): string {
  const ordered = language === "en" ? [names.en, names.ne] : [names.ne, names.en];
  const parts = ordered.map((n) => n.trim()).filter(Boolean);
  const unique = parts.filter((n, i) => parts.indexOf(n) === i);
  return unique.length ? unique.join(" · ") : fallback;
}

export interface EntityMetaInput {
  names: { en: string; ne: string };
  /** What the page shows as the name when the record has neither. */
  fallbackName: string;
  /** Localised kind, as the page's identity line shows it — "व्यक्ति". */
  kindLabel: string;
  language: string;
  entityIri: string;
  /** Published cases citing this entity (may be a first page of `caseCount`). */
  cases: readonly Case[];
  caseCount: number;
  /** The record's own curated description in the page's language, if any. */
  recordDescription: string;
  t: TFunction;
}

/**
 * Title and meta description for an entity page, built from the record and the
 * cases that cite it.
 *
 * Every one of 15,473 person pages used to say "<Name> — Person in the
 * Jawafdehi public entity registry." That tells a searcher nothing — Shekhar
 * Golchha's said it while his page listed three cases and ₹31 arba of alleged
 * damage — and identical text across thousands of pages reads as duplicate
 * content on exactly the pages that need to look distinct.
 *
 * What it says, and what it deliberately does not:
 *
 * - **The role and verdict come from caseInvolvement()** — the same function the
 *   page's own case cards use — so the snippet can never say something the page
 *   does not. Verdicts are named with their forum ("विशेष अदालत: सफाइ"), never
 *   bare, and an undecided case gets no verdict at all: "charged" can mean only
 *   that the outcome is not recorded, so claiming "pending" would be a guess.
 * - **Only an accused/alleged role is ever named.** For anyone else — a witness,
 *   a victim, a petitioner — the snippet says how many cases cite them and
 *   stops. It does not announce in a search result that a person was a victim,
 *   and it does not put a case title naming someone ELSE as accused beside
 *   their name, where it would read as an accusation of them.
 * - Only the lead case is described: the one the page lists first (accused
 *   tier, newest first — orderCasesForEntity).
 *
 * An entity with no cases keeps its curated description or the old sentence;
 * those pages are `noindex, follow` already (EntityRelatedCases), so their
 * snippet is not what a searcher reads.
 */
export function entityMeta(input: EntityMetaInput): { title: string; description: string } {
  const name = bilingualName(input.names, input.language, input.fallbackName);
  const title = `${name} | Jawafdehi`;

  if (input.caseCount > 0 && input.cases.length > 0) {
    // A long bilingual organisation name ("…Construction JV · …कन्स्ट्रक्सन
    // जे.भी") can eat the snippet before the verdict is reached. The verdict
    // must survive truncation, so drop to the page-language name first.
    const lead = name.length > 60 ? name.split(" · ")[0] : name;
    const count = `${input.caseCount} ${input.t(
      input.caseCount === 1 ? "entityDetail.caseOne" : "entityDetail.cases",
    ).toLowerCase()}`;

    const first = orderCasesForEntity(input.cases, input.entityIri)[0];
    const involvement = caseInvolvement(first, input.entityIri, input.language, input.t);

    let description = `${lead} — ${input.kindLabel} · ${count}`;
    if (involvement.accused) {
      const said = [involvement.roleLabel, involvement.outcomeText, involvement.appealText]
        .filter(Boolean)
        .join(" · ");
      // The role and verdict come BEFORE the case title, so truncation can only
      // ever shorten the title, never cut the verdict off.
      description += ` — ${said}: ${first.title}`;
    }
    return { title, description: truncateMeta(description) };
  }

  return {
    title,
    description: truncateMeta(
      input.recordDescription ||
        `${input.fallbackName} — ${input.kindLabel} in the Jawafdehi public entity registry.`,
    ),
  };
}

// schema.org types we will assert. The registry's own `jawafdehi:` subtypes are
// meaningful to us and to nobody else, so they are dropped rather than emitted.
function schemaTypes(rawType: unknown): string[] {
  const list = Array.isArray(rawType) ? rawType : [rawType];
  const kept = list.filter(
    (v): v is string => typeof v === "string" && v.length > 0 && !v.includes(":"),
  );
  return kept.length ? kept : ["Thing"];
}

function wikidataSameAs(identifiers: unknown): string[] {
  if (!Array.isArray(identifiers)) return [];
  return identifiers
    .filter(
      (id): id is { propertyID: string; value: string } =>
        typeof id === "object" &&
        id !== null &&
        (id as { propertyID?: unknown }).propertyID === "wikidata" &&
        /^Q\d+$/.test(String((id as { value?: unknown }).value ?? "")),
    )
    .map((id) => `https://www.wikidata.org/wiki/${id.value}`);
}

export interface EntityJsonLdInput {
  recordIri: string;
  canonicalUrl: string;
  rawType: unknown;
  names: { en: string; ne: string };
  alternateNames: readonly string[];
  description: string;
  imageUrl: string | null;
  identifiers: unknown;
  cases: readonly Case[];
}

/**
 * schema.org JSON-LD for an entity page: `Person` / `Organization` / … with
 * `subjectOf` pointing at the cases about it.
 *
 * Entity pages emitted NO structured data at all — on a registry whose records
 * are schema.org JSON-LD in the API. This hands search engines the node the page
 * is about, so it can be reconciled with the same person or organisation
 * elsewhere, and links it to its cases.
 *
 * `sameAs` comes ONLY from a Wikidata identifier the record carries. A wrong
 * `sameAs` on a page that cites corruption cases attaches them to someone else
 * — in a naming culture with heavy collisions, that is a misattribution with a
 * real victim — so nothing is inferred, matched or guessed here.
 *
 * No `jobTitle`. schema.org reads it as the CURRENT role, and the registry
 * records roles across time — a former Deputy Prime Minister's record lists
 * that office alongside his later ones. Emitting them would assert a present
 * that is not true; picking "the current one" would be a guess.
 *
 * `subjectOf` asserts only that a case is ABOUT this entity, never a role:
 * the role, and its verdict, belong to the human-readable page where they can
 * carry their forum and context.
 */
export function entityJsonLd(input: EntityJsonLdInput): Record<string, unknown> {
  const types = schemaTypes(input.rawType);
  const primary = input.names.ne || input.names.en;
  const alternates = [input.names.en, input.names.ne, ...input.alternateNames]
    .map((n) => n.trim())
    .filter((n) => n && n !== primary)
    .filter((n, i, all) => all.indexOf(n) === i);
  const sameAs = wikidataSameAs(input.identifiers);

  return {
    "@context": "https://schema.org",
    "@type": types.length === 1 ? types[0] : types,
    "@id": input.recordIri,
    url: input.canonicalUrl,
    name: primary,
    ...(alternates.length ? { alternateName: alternates } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.imageUrl ? { image: input.imageUrl } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(input.cases.length
      ? {
          subjectOf: input.cases
            .filter((c) => c.slug)
            .map((c) => ({
              "@type": "CreativeWork",
              name: c.title,
              url: new URL(casePath(c.slug), SITE_URL).toString(),
            })),
        }
      : {}),
  };
}
