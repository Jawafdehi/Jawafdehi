import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/ui/empty-state";
import { unsubscribeFromNewsletter } from "@/services/jds-api";

const PILL_DARK =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-surface px-5 text-[15px] text-primary-foreground transition-[transform,background-color] duration-150 ease-out hover:bg-primary-surface/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const PILL =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-muted px-5 text-[15px] text-primary transition-[transform,background-color] duration-150 ease-out hover:bg-primary/[0.08] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type UnsubscribeState = "idle" | "submitting" | "success" | "error";

export default function NewsletterUnsubscribe() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<UnsubscribeState>(token ? "idle" : "error");

  const handleUnsubscribe = async () => {
    if (!token || state === "submitting") return;
    setState("submitting");
    try {
      await unsubscribeFromNewsletter(token);
      setState("success");
    } catch {
      setState("error");
    }
  };

  const isSuccess = state === "success";

  // One page, three moments: asking (someone sitting it out), done (a thank
  // you for having read), and a link that did not work.
  const asking = state === "idle" || state === "submitting";
  return (
    <main className="bg-background py-8 md:py-12">
      <div className="layout-container">
        <EmptyState
          kind={asking ? "waiting" : isSuccess ? "thanks" : "couldNotLoad"}
          fullHeight
          headingLevel="h1"
          title={t(
            asking
              ? "newsletter.unsubscribe.confirmTitle"
              : isSuccess
                ? "newsletter.unsubscribe.successTitle"
                : "newsletter.unsubscribe.errorTitle",
          )}
          description={t(
            asking
              ? "newsletter.unsubscribe.confirmMessage"
              : isSuccess
                ? "newsletter.unsubscribe.successMessage"
                : "newsletter.unsubscribe.errorMessage",
          )}
          actions={
            <>
              {asking ? (
                <button type="button" onClick={handleUnsubscribe} disabled={state === "submitting"} className={PILL_DARK}>
                  {state === "submitting" ? t("newsletter.unsubscribe.loading") : t("newsletter.unsubscribe.action")}
                </button>
              ) : null}
              <Link to="/" className={asking || isSuccess ? PILL : PILL_DARK}>
                {t("newsletter.unsubscribe.home")}
              </Link>
            </>
          }
        />
      </div>
    </main>
  );
}
