import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

const PAYPAL_DONATE_URL =
  "https://www.paypal.com/donate/?hosted_button_id=ZYCQYYBFK7SDY";
const NEPALI_BANK_ACCOUNT_NUMBER = "04601000000088900197";

// Copy-to-clipboard with transient "copied" feedback. Clears any pending timer
// on the next copy (so rapid clicks don't reset the state early) and on unmount.
function useCopyFeedback(duration = 1800) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopied(false), duration);
      } catch {
        setCopied(false);
      }
    },
    [duration],
  );

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return { copied, copy };
}

export function DonationInfo() {
  const { t } = useTranslation();
  const { copied: isDonationLinkCopied, copy: copyDonationLink } =
    useCopyFeedback();
  const { copied: isBankAccountCopied, copy: copyBankAccountNumber } =
    useCopyFeedback();

  return (
    <section
      id="donate"
      className="scroll-mt-[76px] bg-background py-16 md:py-20"
      aria-labelledby="donate-ways-title"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Eyebrow className="mb-4 tracking-[0.22em]">
              {t("donate.ways.eyebrow")}
            </Eyebrow>
            <h2
              id="donate-ways-title"
              className="text-4xl font-bold leading-tight tracking-normal text-primary md:text-5xl"
            >
              {t("donate.ways.title")}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-foreground/65 md:text-lg">
              {t("donate.ways.description")}
            </p>
          </div>

          <div className="mt-10 grid items-start gap-5 md:mt-12 md:grid-cols-2 md:gap-6 lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)]">
            <article className="flex flex-col rounded-lg bg-card p-6 text-card-foreground md:p-8">
              <div className="relative">
                <Eyebrow className="mb-3 text-[11px]">
                  {t("donate.ways.nepali.eyebrow")}
                </Eyebrow>
                <h3 className="max-w-xs text-3xl font-bold leading-[1.05] text-primary">
                  {t("donate.ways.nepali.title")}
                </h3>
              </div>

              <dl className="mt-5 grid gap-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-accent/70">
                    {t("donate.ways.nepali.nameLabel")}
                  </dt>
                  <dd className="mt-1 text-base font-medium leading-5 text-card-foreground">
                    {t("donate.ways.nepali.accountName")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-accent/70">
                    {t("donate.ways.nepali.bankLabel")}
                  </dt>
                  <dd className="mt-1 text-base font-medium leading-5 text-card-foreground">
                    {t("donate.ways.nepali.bankName")} ({t("donate.ways.nepali.branchName")})
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-accent/70">
                    {t("donate.ways.nepali.accountLabel")}
                  </dt>
                  <dd className="mt-1 flex items-center gap-1">
                    <span className="min-w-0 break-all font-mono text-xl font-medium tracking-wide text-primary">
                      {NEPALI_BANK_ACCOUNT_NUMBER}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyBankAccountNumber(NEPALI_BANK_ACCOUNT_NUMBER)}
                      aria-label={
                        isBankAccountCopied
                          ? t("donate.ways.copied")
                          : t("donate.ways.nepali.copyAria")
                      }
                      title={
                        isBankAccountCopied
                          ? t("donate.ways.copied")
                          : t("donate.ways.nepali.copyAria")
                      }
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {isBankAccountCopied ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span aria-live="polite" className="sr-only">
                        {isBankAccountCopied ? t("donate.ways.copied") : ""}
                      </span>
                    </button>
                  </dd>
                </div>
              </dl>

              <p className="mt-3 max-w-md text-sm font-normal leading-5 text-accent">
                {t("donate.ways.nepali.preferredNote")}
              </p>
            </article>

            <article className="flex flex-col rounded-lg bg-card p-6 text-card-foreground md:p-8">
              <div className="relative">
                <Eyebrow className="mb-3 text-[11px]">
                  {t("donate.ways.paypal.eyebrow")}
                </Eyebrow>
                <h3 className="text-3xl font-bold leading-[1.05] text-primary">
                  {t("donate.ways.paypal.title")}
                </h3>
              </div>

              <div className="mt-8 grid items-start gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
                <a
                  href={PAYPAL_DONATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("donate.ways.paypal.qrAlt")}
                  className="inline-flex shrink-0 rounded-lg bg-white p-2.5 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:p-3"
                >
                  <QRCodeSVG
                    value={PAYPAL_DONATE_URL}
                    size={148}
                    className="h-32 w-32 md:h-[148px] md:w-[148px]"
                    includeMargin={true}
                    level="M"
                  />
                </a>
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-8 text-primary md:text-lg">
                    {t("donate.ways.paypal.qrTitle")}
                  </p>
                  <p className="mt-2 text-sm leading-5 text-card-foreground/55">
                    {t("donate.ways.paypal.qrDescription")}
                  </p>

                  <p className="mt-4 text-sm leading-5 text-primary">
                    {t("donate.ways.paypal.recipient")}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <Button
                      asChild
                      variant="primary"
                      size="lg"
                      className="w-full min-w-0 gap-1.5 px-2 text-xs font-semibold"
                    >
                      <a
                        href={PAYPAL_DONATE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>{t("donate.ways.paypal.cta")}</span>
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => copyDonationLink(PAYPAL_DONATE_URL)}
                      aria-label={t("donate.ways.paypal.copyAria")}
                      className="w-full min-w-0 gap-1.5 border-border/80 bg-transparent px-2 text-xs font-semibold text-primary hover:border-primary/25 hover:bg-muted/50"
                    >
                      {isDonationLinkCopied ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      )}

                      <span aria-live="polite">
                        {isDonationLinkCopied
                          ? t("donate.ways.copied")
                          : t("donate.ways.paypal.copyCta")}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>

              <p className="mt-4 w-full text-sm font-normal leading-5 text-accent">
                {t("donate.ways.paypal.feeNote")}
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
