import { useTranslation } from "react-i18next";

import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

/**
 * The pill copy button from the likhit benchmark — a text label that swaps from
 * "Copy" to "Copied" rather than the icon button the rest of the site uses.
 *
 * Both labels share one grid cell (see .lk-copy-swap in src/pages/likhit.css), so
 * the button is sized by the wider of the two and never moves when it swaps. A
 * button that resized on click would nudge the command next to it at exactly the
 * moment a reader is looking at it.
 *
 * Styled by class, not by Tailwind utilities: everything on /likhit is, because
 * the page is typeset in likhit's own design language and the stylesheet is a
 * port of that project's. See the header comment in src/pages/likhit.css.
 */
export function LikhitCopyButton({
  value,
  label,
}: Readonly<{ value: string; label: string }>) {
  const { t } = useTranslation();
  const { status, copy } = useCopyToClipboard(value);

  const copied = status === "copied";
  const failed = status === "failed";

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className={`lk-copy-button${copied ? " is-copied" : ""}`}
      >
        <span className="lk-copy-swap" aria-hidden="true">
          <span className="lk-copy-face lk-copy-face-resting">{t("likhit.copy")}</span>
          <span className="lk-copy-face lk-copy-face-done">{t("common.copied")}</span>
        </span>
      </button>

      {/* The swap above is hidden from assistive tech — it is two labels in one
          box, which reads as nonsense — so the outcome is announced here instead.
          A failure also prints, because the fix (select it by hand) is not
          guessable from a button that simply did nothing. */}
      {failed ? <span className="lk-copy-failed">{t("common.copyFailed")}</span> : null}

      <span aria-live="polite" className="sr-only">
        {copied ? t("common.copied") : ""}
        {failed ? t("common.copyFailed") : ""}
      </span>
    </>
  );
}
