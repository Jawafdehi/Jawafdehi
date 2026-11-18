// SPDX-License-Identifier: Hippocratic-3.0
//
// Selectors shared by the e2e specs.

/**
 * Every link to a case page, in either form.
 *
 * Case links are slash-terminated since #495 (`/case/<slug>/`, the canonical
 * URL), and they were slashless before. An exact `a[href="/case/<slug>"]` broke
 * the positive checks the day the form changed — and, worse, made every
 * `toHaveCount(0)` "this non-public case is not linked" check pass vacuously,
 * whatever the page linked to. Matching both forms keeps the negative checks
 * honest whichever way the links are written.
 */
export function caseLink(slug: string): string {
  return `a[href="/case/${slug}"], a[href="/case/${slug}/"]`;
}
