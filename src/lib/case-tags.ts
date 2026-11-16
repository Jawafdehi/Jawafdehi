/**
 * Display names for case tags.
 *
 * Since the 2026-11-15 tag cleanup, `Case.tags` holds canonical ids from the
 * API's vocabulary (`bribery`, `tax-evasion`, `kathmandu`) — not prose. An id is
 * a filter value, never something to show a reader: it is English-only and
 * hyphenated. Every tag has a Nepali and an English name in the vocabulary, and
 * `src/data/case-tags.json` is a copy of exactly those two fields.
 *
 * The copy is committed rather than fetched because the vocabulary changes a few
 * times a year and every card on the site needs it at first paint. Refresh it
 * when the API's `case_tags/vocabulary.yml` changes:
 *
 *   python3 -c 'import yaml,json,sys; d=yaml.safe_load(open(sys.argv[1])); \
 *     json.dump({t["id"]: {"en": t["label_en"], "ne": t["label_ne"]} \
 *     for t in sorted(d["tags"], key=lambda t: t["id"])}, \
 *     open("src/data/case-tags.json", "w"), ensure_ascii=False, indent=1)' \
 *     ../JawafdehiAPI/case_tags/vocabulary.yml
 *
 * A tag missing from the copy (a new id not synced yet, or a legacy free-text
 * value on an unpublished case) is shown as it is stored rather than dropped.
 */

import CASE_TAG_LABELS from "@/data/case-tags.json";

type TagLabels = Record<string, { en: string; ne: string }>;

const LABELS: TagLabels = CASE_TAG_LABELS;

export function isCaseTag(tag: string): boolean {
  return Object.prototype.hasOwnProperty.call(LABELS, tag);
}

export function caseTagLabel(tag: string, language: string): string {
  if (!isCaseTag(tag)) return tag;
  const labels = LABELS[tag];
  return language === "ne" ? labels.ne : labels.en;
}
