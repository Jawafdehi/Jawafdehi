import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";

const PAYPAL_DONATE_URL =
  "https://www.paypal.com/donate/?hosted_button_id=ZYCQYYBFK7SDY";

export function PayPalDonation() {
  const { t } = useTranslation();
  const [isDonationLinkCopied, setIsDonationLinkCopied] = useState(false);

  const copyDonationLink = async () => {
    try {
      await navigator.clipboard.writeText(PAYPAL_DONATE_URL);
      setIsDonationLinkCopied(true);
      window.setTimeout(() => setIsDonationLinkCopied(false), 1800);
    } catch {
      setIsDonationLinkCopied(false);
    }
  };

  return (
    <section
      id="donate"
      className="scroll-mt-[76px] bg-background py-16 md:py-20"
      aria-labelledby="donate-international-title"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,18rem)] lg:gap-16">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              {t("donate.international.eyebrow")}
            </p>

            <h2
              id="donate-international-title"
              className="max-w-2xl text-4xl font-bold leading-[0.98] tracking-tight text-primary md:text-5xl"
            >
              {t("donate.international.title")}
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-8 text-foreground/65 md:text-lg">
              {t("donate.international.description")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                variant="primary"
                size="lg"
                className="w-full gap-2 rounded-full px-7 font-semibold sm:w-auto"
              >
                <a
                  href={PAYPAL_DONATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>{t("donate.international.primaryCta")}</span>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={copyDonationLink}
                aria-label={t("donate.international.copyAria")}
                className="w-full gap-2 rounded-full border-border/80 bg-transparent px-7 font-semibold text-primary hover:border-primary/25 hover:bg-muted/50 sm:w-auto"
              >
                {isDonationLinkCopied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}

                <span aria-live="polite">
                  {isDonationLinkCopied
                    ? t("donate.international.copyCopied")
                    : t("donate.international.secondaryCta")}
                </span>
              </Button>
            </div>

            <p className="mt-7 max-w-xl text-sm leading-6 text-foreground/50">
              {t("donate.international.trustNote")}
            </p>
          </div>

          <div className="flex justify-start lg:justify-center">
            <div className="flex w-fit flex-col items-center text-center">
              <p className="mb-4 text-center text-sm font-semibold text-primary">
                {t("donate.international.qrLabel")}
              </p>

              <a
                href={PAYPAL_DONATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("donate.international.qrAlt")}
                className="inline-flex rounded-2xl bg-white p-4 ring-1 ring-border/70 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <QRCodeSVG
                  value={PAYPAL_DONATE_URL}
                  size={196}
                  includeMargin={true}
                  level="M"
                  title={t("donate.international.qrAlt")}
                />
              </a>

              <p className="mt-4 max-w-52 text-center text-xs leading-5 text-foreground/50">
                {t("donate.international.qrHelper")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
