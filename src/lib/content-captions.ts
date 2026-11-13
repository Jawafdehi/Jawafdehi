/**
 * Judging whether an extracted caption is usable as a title.
 *
 * Lives here rather than beside the panel that renders it: it is a pure string
 * predicate with no React in it, and a component file that also exports helpers
 * breaks fast refresh for the whole module.
 */

/** Trailing punctuation a real title may carry, stripped before judging length.
 *
 * ⚠️ The visarga is written as `ः` rather than literally. It is a combining
 * mark, and a literal one sitting after `:` in a character class reads as the
 * single combined character `:ः` -- which is what `no-misleading-character-class`
 * flags, and it is right to: the class would then be asserting something other
 * than what it appears to. */
const CAPTION_TRAILING = /[\sः:–—-]+$/u;

/** A finite or participial verb ending a clause. A title is a noun phrase and does
 *  not end on one; `… रहेको छ`, `… दायर गरिएको` are the ends of sentences. */
const CAPTION_CLAUSE_END =
  /(?:छ|छन्|थियो|थिए|गरिएको|भएको|रहेको|रहेका|लिइएको|दिइएको)$/u;

/** Nothing but digits, separators and punctuation — a table CELL, not a caption. */
const CAPTION_DIGITS_ONLY = /^[\s०-९0-9.,/।-]+$/u;

/**
 * Does this caption read as a sentence tail rather than a title?
 *
 * 🛑 **A fragment is worse than no caption at all.** The upstream extractor takes
 * the text immediately before a table and keeps its end, so a table with a real
 * `तालिका २.१ …` heading gets a good caption and every other table gets the last
 * few words of the preceding paragraph — `छ।`, `दायर गरिएको छ।`,
 * `देहायबमोजिम रहेको छ:-`. Rendered as a title those are not merely unhelpful,
 * they are wrong: `छ।` means "is." A reader scanning the list learns nothing and
 * cannot tell one row from another, where a plain `Table 30` at least orders them.
 *
 * Measured over all 1,735 tables on the CIAA annual-report shelf: 504 captions are
 * empty upstream, **259 are fragments**, and 972 are real titles. So this
 * reclassifies about 15% of the non-empty ones and leaves the rest alone.
 *
 * ⚠️ The length floor is deliberately low — 4 characters after trailing
 * punctuation. `तपसिल`, `संकेत`, `विवरण` and `निकाय` are legitimate Nepali table
 * headings and a stricter floor discards them; measured, raising it to 8 drops all
 * four. The digits rule is what catches the real strays (`४५००`, `८००० ७२६४`,
 * `७१२,४८२।५६`, `-६-`), which are cell values the extractor mistook for a caption.
 *
 * ⚠️ This is a DISPLAY decision and changes no stored data. The caption is still
 * served as extracted; a client that wants the raw string still has it.
 */
export function isCaptionFragment(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return true;
  // The danda terminates a sentence. Tested at the END only, so a danda used as a
  // date separator inside a title (`आ.व २०७३।७४ सालको बजेट व्यवस्था`) is kept.
  if (trimmed.endsWith("।")) return true;
  if (CAPTION_DIGITS_ONLY.test(trimmed)) return true;
  const core = trimmed.replace(CAPTION_TRAILING, "");
  if (core.length < 4) return true;
  return CAPTION_CLAUSE_END.test(core);
}

/** A caption if it is usable, otherwise ``fallback``. */
export function captionOr(value: string | null | undefined, fallback: string): string {
  return isCaptionFragment(value) ? fallback : (value as string).trim();
}
