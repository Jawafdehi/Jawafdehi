// SPDX-License-Identifier: Hippocratic-3.0
import { SITE_URL } from "./seo";

/**
 * Serialise a JSON-LD object for a `<script type="application/ld+json">` block.
 *
 * `JSON.stringify` alone is not safe here. Its output can contain `</script>` —
 * a case title, a court's own case-type text, a person's name — and the HTML
 * parser ends the element at the first `</script` it sees, whatever the JSON
 * thinks. Everything after that point is parsed as markup. Escaping every `<` as
 * `<` keeps the JSON identical to a JSON parser (which is all a crawler
 * runs on it) while making the terminator impossible to spell.
 *
 * `material-meta.ts` already does exactly this inline; this is the shared form,
 * so new emitters do not each have to remember it.
 */
export function jsonLdString(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** One crumb, as `PageBreadcrumb` takes it. */
export interface BreadcrumbItem {
  label: string;
  /** A site-relative path. Absent on the current page, the last crumb. */
  to?: string;
}

/**
 * schema.org `BreadcrumbList` for a page's trail, or `null` when there is no
 * trail worth describing (fewer than two crumbs).
 *
 * The visible breadcrumb already tells a reader where a record sits; this tells
 * a search engine the same thing, and Google uses it to show the trail in place
 * of the raw URL in a result. Positions are 1-based, as the vocabulary requires.
 * `item` is the absolute URL of a crumb; the current page — the last crumb —
 * carries none, which Google accepts for exactly that crumb.
 */
export function breadcrumbJsonLd(
  items: readonly BreadcrumbItem[],
  base: string = SITE_URL,
): Record<string, unknown> | null {
  if (items.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, index) => {
      const entry: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        name: crumb.label,
      };
      if (crumb.to) {
        try {
          entry.item = new URL(crumb.to, base).toString();
        } catch {
          // An unparseable path is a bug in the caller, but it must not take the
          // page down with it: the crumb is still named, just not linked.
        }
      }
      return entry;
    }),
  };
}
