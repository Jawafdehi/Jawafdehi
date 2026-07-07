import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent } from "@/lib/consent";
import { loadGoogleAnalytics } from "@/lib/ga";

/**
 * Opt-in cookie consent banner. Analytics (Google Analytics) load only after
 * the visitor accepts. If a prior decision exists, the banner stays hidden and
 * analytics load only when consent was previously granted.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur-sm p-4 shadow-lg no-print"
    >
      <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground max-w-3xl">
          We use cookies that are necessary for the site to work, and—only with
          your consent—Google Analytics to understand how the platform is used.
          You can decline analytics without affecting your use of the site. See
          our{" "}
          <Link to="/privacy" className="text-primary underline hover:no-underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={decline}>
            Decline
          </Button>
          <Button size="sm" onClick={accept}>
            Accept analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
