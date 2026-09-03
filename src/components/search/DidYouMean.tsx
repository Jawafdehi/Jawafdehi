import { useTranslation } from "react-i18next";

/**
 * The spelling suggestion for an archive search — `did_you_mean` from
 * `GET /api/search/`.
 *
 * Deliberately NOT part of the empty state. The backend offers a suggestion on
 * either of design §11's two triggers: the search returned nothing, OR it
 * returned only fuzzy matches (no result matched the query as typed, so the hits
 * have no exactly-matching anchor). The second case is the common one now that
 * bounded fuzzy matching ships — `?q=coruption` finds 199 real records AND
 * suggests "corruption" — so a banner that only rendered when there were no
 * results would stay invisible almost always.
 *
 * That second trigger is judged from the RETURNED PAGE, so the API only offers it
 * on the first page of a relevance-sorted search. Paging on, or re-sorting, drops
 * the field and this unmounts — deliberate, not a glitch to paper over. Holding a
 * stale suggestion across a page the backend declined to vouch for is precisely
 * what the gating exists to prevent. See `ArchiveSearchResponse.did_you_mean`.
 *
 * The suggestion is an OFFER, never applied for the reader. Silently rewriting a
 * search for a person's name in an accountability archive would show records
 * about someone the reader never asked about, with nothing to indicate it
 * happened.
 */
export function DidYouMean({
  onAccept,
  suggestion,
}: Readonly<{ onAccept: (suggestion: string) => void; suggestion: string }>) {
  const { t } = useTranslation();
  return (
    // Plain text, not a card. The bordered/filled box read as another result
    // tile — same rounded-xl border as the cards directly beneath it — so a
    // one-line aside competed with the results it was meant to annotate. The
    // margin is the element's own because the parent section has no `space-y`
    // and the results grid carries no top margin; without it this would sit flush
    // against the first card.
    <p className="mb-4 text-sm">
      {t("archiveSearch.didYouMean", "Did you mean")}{" "}
      {/* A button, not a link: accepting it edits the query that is already on
          screen rather than navigating somewhere new, and the correction lands in
          the URL by the same path a typed search takes. */}
      <button
        className="font-bold text-foreground underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={() => onAccept(suggestion)}
        type="button"
      >
        {suggestion}
      </button>
      {t("archiveSearch.didYouMeanPunctuation", "?")}
    </p>
  );
}
