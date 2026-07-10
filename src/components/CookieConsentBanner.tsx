import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent } from "@/lib/consent";
import { loadGoogleAnalytics } from "@/lib/ga";
import { telemetryAllowedHere } from "@/lib/telemetry";

/**
 * Opt-in cookie consent banner. Analytics (Google Analytics) load only after
 * the visitor accepts. If a prior decision exists, the banner stays hidden and
 * analytics load only when consent was previously granted.
 */
export function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

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
      role="dialog"
      aria-label={t("cookieConsent.ariaLabel", "Cookie consent")}
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur-sm p-4 shadow-lg no-print"
    >
      <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground max-w-3xl">
          <Trans
            i18nKey="cookieConsent.message"
            defaults="We use cookies that are necessary for the site to work, and—only with your consent—Google Analytics to understand how the platform is used. You can decline analytics without affecting your use of the site. See our <privacy>Privacy Policy</privacy>."
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
          <Button size="sm" onClick={accept}>
            {t("cookieConsent.accept", "Accept analytics")}
          </Button>
        </div>
      </div>
    </div>
  );
}
