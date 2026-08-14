import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, ExternalLink } from "lucide-react";
import { SiPaypal } from "react-icons/si";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { trackEvent } from "@/utils/analytics";

// US 501(c)(3) donation rails (Jawafdehi Initiative, Inc.).
const PAYPAL_DONATE_URL =
  "https://www.paypal.com/us/fundraiser/charity/6001485";
// Prime Commercial Bank, Pushpalal Chowk (Biratnagar) — Jawafdehi Initiative.
const NEPALI_BANK_ACCOUNT_NUMBER = "04601000000088900197";

// The bank issued two merchant QRs for this one account, on the two Nepali QR
// networks: FonePay (EMVCo template 26, GUID `fonepay.com`) and NepalPay
// (template 29, GUID `NCHL0000`). An app that only speaks one network cannot
// read the other's code, so both are offered — but they settle to the same
// account, so the choice only affects which app can scan. Both are static
// (tag 01 = "11"), hence reusable and safe to publish.
const WALLETS = [
  { id: "fonepay", src: "/assets/fonepay-qr.png" },
  { id: "nepalpay", src: "/assets/nepalpay-qr.png" },
] as const;

type WalletId = (typeof WALLETS)[number]["id"];

// Best-effort clipboard write. Prefers the async Clipboard API but falls back to
// a legacy execCommand("copy") for insecure (HTTP) contexts and older browsers
// where navigator.clipboard is unavailable. Returns whether the copy succeeded.
async function writeToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy path below.
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    // Keep it out of view and unfocusable to screen users without breaking selection.
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

// Copy-to-clipboard with transient "copied"/"failed" feedback. Clears any pending
// timer on the next copy (so rapid clicks don't reset the state early) and on
// unmount. On failure it surfaces a `failed` flag so the UI can prompt the user
// to copy manually instead of silently doing nothing.
function useCopyFeedback(duration = 1800) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<number | null>(null);

  const copy = useCallback(
    async (text: string) => {
      const ok = await writeToClipboard(text);
      setCopied(ok);
      setFailed(!ok);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
        setFailed(false);
      }, duration);
    },
    [duration],
  );

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return { copied, failed, copy };
}

// Nepal — direct bank transfer, plus the two Nepali QR networks.
function NepalCard() {
  const { t } = useTranslation();
  const { copied, failed, copy } = useCopyFeedback();
  // FonePay first: it is the wider-reach network of the two.
  const [wallet, setWallet] = useState<WalletId>("fonepay");

  return (
    <article className="flex flex-col rounded-lg bg-card p-6 text-card-foreground md:p-8">
      <Eyebrow className="mb-3 text-[11px]">
        {t("donate.ways.nepali.eyebrow")}
      </Eyebrow>
      <h3 className="text-3xl font-bold leading-[1.05] text-primary">
        {t("donate.ways.nepali.title")}
      </h3>
      <p className="mt-2 max-w-xs text-sm font-medium text-accent">
        {t("donate.ways.nepali.whoFor")}
      </p>

      <dl className="mt-5 grid gap-2.5">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-accent/70">
            {t("donate.ways.nepali.nameLabel")}
          </dt>
          <dd className="mt-0.5 text-sm font-medium leading-5 text-card-foreground">
            {t("donate.ways.nepali.accountName")}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-accent/70">
            {t("donate.ways.nepali.bankLabel")}
          </dt>
          <dd className="mt-0.5 text-sm font-medium leading-5 text-card-foreground">
            {t("donate.ways.nepali.bankName")} (
            {t("donate.ways.nepali.branchName")})
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-accent/70">
            {t("donate.ways.nepali.accountLabel")}
          </dt>
          <dd className="mt-0.5 flex items-center gap-1">
            <span className="min-w-0 select-all break-all font-mono text-base font-medium tracking-wide text-primary">
              {NEPALI_BANK_ACCOUNT_NUMBER}
            </span>
            <button
              type="button"
              onClick={() => {
                copy(NEPALI_BANK_ACCOUNT_NUMBER);
                trackEvent("donate_click", {
                  method: "nepal_bank",
                  action: "copy_account",
                });
              }}
              aria-label={
                copied
                  ? t("donate.ways.copied")
                  : failed
                    ? t("donate.ways.copyFailed")
                    : t("donate.ways.nepali.copyAria")
              }
              title={
                copied
                  ? t("donate.ways.copied")
                  : failed
                    ? t("donate.ways.copyFailed")
                    : t("donate.ways.nepali.copyAria")
              }
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              <span aria-live="polite" className="sr-only">
                {copied
                  ? t("donate.ways.copied")
                  : failed
                    ? t("donate.ways.copyFailed")
                    : ""}
              </span>
            </button>
          </dd>
          {failed ? (
            <p className="mt-1 text-xs font-medium text-destructive">
              {t("donate.ways.copyFailed")}
            </p>
          ) : null}
        </div>
      </dl>

      <div className="mt-6 border-t border-border/60 pt-5">
        <p className="text-base font-semibold leading-6 text-primary">
          {t("donate.ways.nepali.qrTitle")}
        </p>
        <p className="mt-1.5 text-sm leading-5 text-card-foreground/70">
          {t("donate.ways.nepali.qrDescription")}
        </p>

        <div
          role="group"
          aria-label={t("donate.ways.nepali.walletSwitchAria")}
          className="mt-4 inline-flex gap-1 rounded-full bg-muted/60 p-1"
        >
          {WALLETS.map(({ id }) => (
            <button
              key={id}
              type="button"
              aria-pressed={id === wallet}
              onClick={() => setWallet(id)}
              className={
                id === wallet
                  ? "rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
                  : "rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
              }
            >
              {t(`donate.ways.nepali.wallets.${id}.label`)}
            </button>
          ))}
        </div>

        {/* Both networks stay mounted so switching never re-fetches, and the two
            images share one canvas size so the card cannot shift height. */}
        <div className="mt-3 w-[200px] overflow-hidden rounded-md bg-white p-2">
          {WALLETS.map(({ id, src }) => (
            <img
              key={id}
              src={src}
              alt={t(`donate.ways.nepali.wallets.${id}.alt`)}
              width={600}
              height={736}
              loading="lazy"
              hidden={id !== wallet}
              className="h-auto w-full"
            />
          ))}
        </div>
      </div>
    </article>
  );
}

// Outside Nepal — the US 501(c)(3), via PayPal Giving Fund.
function UsCard() {
  const { t } = useTranslation();

  return (
    <article className="flex flex-col rounded-lg bg-card p-6 text-card-foreground md:p-8">
      <Eyebrow className="mb-3 text-[11px]">
        {t("donate.ways.us.eyebrow")}
      </Eyebrow>
      <h3 className="text-3xl font-bold leading-[1.05] text-primary">
        {t("donate.ways.us.title")}
      </h3>
      <p className="mt-2 text-sm font-medium text-accent">
        {t("donate.ways.us.whoFor")}
      </p>
      <p className="mt-2 text-xs font-medium leading-5 text-accent">
        {t("donate.ways.us.deductibleNote")}
      </p>

      <div className="mt-5 flex flex-col gap-2 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5">
            <SiPaypal
              className="h-5 w-5 text-[#003087] dark:text-[#6cb2ff]"
              aria-hidden="true"
            />
            <span className="text-base font-bold text-[#003087] dark:text-[#6cb2ff]">
              {t("donate.ways.us.paypal.title")}
            </span>
          </span>
          <span className="shrink-0 text-[11px] font-medium text-foreground/50">
            {t("donate.ways.us.paypal.fee")}
          </span>
        </div>
        <p className="text-sm leading-5 text-card-foreground/70">
          {t("donate.ways.us.paypal.detail")}
        </p>
        <Button asChild variant="primary" size="sm" className="mt-1 w-fit gap-1.5">
          <a
            href={PAYPAL_DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent("donate_click", {
                method: "paypal",
                action: "outbound",
                link_url: PAYPAL_DONATE_URL,
              })
            }
          >
            <span>{t("donate.ways.us.paypal.cta")}</span>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </article>
  );
}

export function DonationInfo() {
  const { t } = useTranslation();

  return (
    <section
      id="donate"
      className="scroll-mt-[76px] bg-background py-16 md:py-20"
      aria-labelledby="donate-ways-title"
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <h2
              id="donate-ways-title"
              className="text-4xl font-bold leading-tight tracking-normal text-primary md:text-5xl"
            >
              {t("donate.ways.title")}
            </h2>
          </div>

          <div className="mt-10 grid items-start gap-5 md:grid-cols-2 md:gap-6">
            <NepalCard />
            <UsCard />
          </div>
        </div>
      </div>
    </section>
  );
}
