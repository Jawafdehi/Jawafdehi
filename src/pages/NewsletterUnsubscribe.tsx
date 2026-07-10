import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { unsubscribeFromNewsletter } from "@/services/jds-api";

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
  const isError = state === "error";
  const Icon = isSuccess ? CheckCircle2 : XCircle;

  if (state === "idle" || state === "submitting") {
    return (
      <main className="bg-background py-16 md:py-24">
        <div className="container mx-auto max-w-xl px-4 text-center">
          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-primary md:text-4xl">
                {t("newsletter.unsubscribe.confirmTitle")}
              </h1>
              <p className="text-base leading-7 text-muted-foreground">
                {t("newsletter.unsubscribe.confirmMessage")}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button onClick={handleUnsubscribe} disabled={state === "submitting"}>
                {state === "submitting"
                  ? t("newsletter.unsubscribe.loading")
                  : t("newsletter.unsubscribe.action")}
              </Button>
              <Button asChild variant="outline">
                <Link to="/">{t("newsletter.unsubscribe.home")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background py-16 md:py-24">
      <div className="container mx-auto max-w-xl px-4 text-center">
        <div className="space-y-6">
          <Icon
            className={"mx-auto h-10 w-10 " + (isSuccess ? "text-success" : "text-destructive")}
            aria-hidden="true"
          />
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-primary md:text-4xl">
              {t(
                isSuccess
                  ? "newsletter.unsubscribe.successTitle"
                  : "newsletter.unsubscribe.errorTitle",
              )}
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              {t(
                isSuccess
                  ? "newsletter.unsubscribe.successMessage"
                  : "newsletter.unsubscribe.errorMessage",
              )}
            </p>
          </div>
          <Button asChild variant={isError ? "default" : "outline"}>
            <Link to="/">{t("newsletter.unsubscribe.home")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
