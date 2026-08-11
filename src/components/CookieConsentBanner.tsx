import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useIsNarrow } from "@/hooks/useIsNarrow";
import { getConsent, setConsent } from "@/lib/consent";
import { loadGoogleAnalytics } from "@/lib/ga";
import { telemetryAllowedHere } from "@/lib/telemetry";

/**
 * Opt-in cookie consent banner. Analytics (Google Analytics) load only after
 * the visitor accepts. If a prior decision exists, the banner stays hidden and
 * analytics load only when consent was previously granted.
 *
 * The banner is a fixed overlay, so every pixel of it is a pixel of the page the
 * visitor cannot read. On a 360 x 640 budget Android it used to stand 201px tall
 * — 31% of the viewport — which on /search began mid-way through the sort control
 * and ran to the bottom, hiding every search result until the notice was
 * dismissed. Two things kept it that tall, and both are handled below:
 *   - the copy was written for a desktop-width bar, so it wrapped to six lines;
 *     `useIsNarrow` swaps in a shorter phrasing under `sm`.
 *   - the inner wrapper used `container`, whose 2rem side padding cost 64px of a
 *     360px screen on top of the bar's own padding, narrowing the text column to
 *     264px and forcing still more wrapping.
 * Whatever height it does end up at is then reserved as body padding, so the
 * overlay can never sit on top of the end of the document.
 */
export function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  // 639.98 rather than the hook's default 640: Tailwind's `sm:` is a
  // `min-width: 640px` rule, so at exactly 640px a `max-width: 640px` query
  // matches too and the short copy would render inside the wide row layout.
  const isNarrow = useIsNarrow(639.98);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // On dev builds, localhost, and *.workers.dev previews, GA never loads, so
    // there's nothing to consent to — don't prompt.
    if (!telemetryAllowedHere()) return;
    const decision = getConsent();
    if (decision === null) {
      setVisible(true);
    } else if (decision === "granted") {
      loadGoogleAnalytics();
    }
  }, []);

  // Reserve the banner's own height at the foot of the document. Without this
  // the last screenful of any page — the final search results and the pager —
  // stays under the overlay no matter how far the visitor scrolls.
  useEffect(() => {
    const node = bannerRef.current;
    if (!node) return;

    const previousPaddingBottom = document.body.style.paddingBottom;

    const reserve = () => {
      document.body.style.paddingBottom = `${node.offsetHeight}px`;
    };

    reserve();

    // The bar re-wraps on rotate and on a language change, so its height is not
    // a constant we can measure once.
    const resizeObserver = new ResizeObserver(reserve);
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
      document.body.style.paddingBottom = previousPaddingBottom;
    };
  }, [visible]);

  if (!visible) return null;

  const accept = () => {
    setConsent("granted");
    loadGoogleAnalytics();
    setVisible(false);
  };

  const decline = () => {
    setConsent("denied");
    setVisible(false);
  };

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-label={t("cookieConsent.ariaLabel", "Cookie consent")}
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur-sm p-3 sm:p-4 shadow-lg no-print"
    >
      {/* Deliberately NOT `container`/`layout-container`: their side padding is
          unconditional, and on a 360px screen that costs 64px (32px under
          `layout-container`, which resolves to `container … px-4`) that this bar
          cannot spare — #305 measured it. `sm:px-8` restores it from the `sm`
          breakpoint up, and `max-w-[1400px]` matches the cap `container`
          applies, so wider screens are laid out as before. */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8">
        <p className="text-sm text-muted-foreground max-w-3xl">
          <Trans
            i18nKey={
              isNarrow ? "cookieConsent.messageShort" : "cookieConsent.message"
            }
            defaults={
              isNarrow
                ? "Analytics cookies are used only if you accept. See our <privacy>Privacy Policy</privacy>."
                : "We use cookies that are necessary for the site to work, and—only with your consent—Google Analytics to understand how the platform is used. You can decline analytics without affecting your use of the site. See our <privacy>Privacy Policy</privacy>."
            }
            components={{
              privacy: (
                <Link
                  to="/privacy"
                  className="text-primary underline hover:no-underline"
                />
              ),
            }}
          />
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={decline}>
            {t("cookieConsent.decline", "Decline")}
          </Button>
          {/* The visible label shortens to fit, but the accessible name keeps
              saying what is being accepted — "Accept" alone is a poor label for
              a consent control read out of context in a screen reader's button
              list. */}
          <Button
            size="sm"
            onClick={accept}
            aria-label={
              isNarrow ? t("cookieConsent.accept", "Accept analytics") : undefined
            }
          >
            {isNarrow
              ? t("cookieConsent.acceptShort", "Accept")
              : t("cookieConsent.accept", "Accept analytics")}
          </Button>
        </div>
      </div>
    </div>
  );
}
