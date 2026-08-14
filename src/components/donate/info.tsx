import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, ExternalLink, Star } from "lucide-react";
import { SiPaypal } from "react-icons/si";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { trackEvent } from "@/utils/analytics";

// US 501(c)(3) donation rails (Jawafdehi Initiative, Inc.).
const PAYPAL_DONATE_URL =
  "https://www.paypal.com/us/fundraiser/charity/6001485";
// Prime Commercial Bank, Pushpalal Chowk (Biratnagar) — Jawafdehi Initiative.
const NEPALI_BANK_ACCOUNT_NUMBER = "04601000000088900197";
// FonePay merchant QR for the same account, issued by the bank. Static (EMVCo
// tag 01 = "11"), so it is reusable and safe to publish; every FonePay member
// mobile banking app and wallet in Nepal can scan it.
const FONEPAY_QR_SRC = "/assets/fonepay-qr.png";

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

// Nepal — direct bank transfer (preferred, zero fees, not US-deductible).
function NepalCard() {
  const { t } = useTranslation();
  const { copied, failed, copy } = useCopyFeedback();

  return (
    <article className="relative flex flex-col rounded-lg bg-card p-6 text-card-foreground md:p-8">
      <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
        <Star className="h-3 w-3" aria-hidden="true" />
        {t("donate.ways.preferredBadge")}
      </span>

      <Eyebrow className="mb-3 text-[11px]">
        {t("donate.ways.nepali.eyebrow")}
      </Eyebrow>
      <h3 className="text-3xl font-bold leading-[1.05] text-primary">
        {t("donate.ways.nepali.title")}
      </h3>
      <p className="mt-2 max-w-xs text-sm font-medium text-accent">
        {t("donate.ways.nepali.whoFor")}
      </p>

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
            {t("donate.ways.nepali.bankName")} (
            {t("donate.ways.nepali.branchName")})
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-accent/70">
            {t("donate.ways.nepali.accountLabel")}
          </dt>
          <dd className="mt-1 flex items-center gap-1">
            <span className="min-w-0 select-all break-all font-mono text-xl font-medium tracking-wide text-primary">
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
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

      {/* The FonePay payload packs into a dense 54-module symbol, so it needs to
          render large enough for a phone camera (~3px per module) to lock on.
          Stacked until the card itself is wide enough to sit them side by side. */}
      <div className="mt-6 flex flex-col items-start gap-4 border-t border-border/60 pt-5 lg:flex-row">
        <img
          src={FONEPAY_QR_SRC}
          alt={t("donate.ways.nepali.qrAlt")}
          width={168}
          height={168}
          loading="lazy"
          className="h-40 w-40 shrink-0 rounded-md bg-white p-2 md:h-[168px] md:w-[168px]"
        />
        <div className="min-w-0">
          <p className="text-base font-semibold leading-6 text-primary">
            {t("donate.ways.nepali.qrTitle")}
          </p>
          <p className="mt-1.5 text-sm leading-5 text-card-foreground/70">
            {t("donate.ways.nepali.qrDescription")}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-accent">
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("donate.ways.nepali.feeNote")}
        </p>
        <p className="text-xs leading-5 text-foreground/55">
          {t("donate.ways.nepali.deductibleNote")}
        </p>
      </div>
    </article>
  );
}

// US 501(c)(3) — tax-deductible rails, free-first (check, Crowded, PayPal).
function UsCard() {
  const { t } = useTranslation();
  const { copied, failed, copy } = useCopyFeedback();
  const payee = t("donate.ways.us.check.payee");

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
      <p className="mt-2 text-xs leading-5 text-foreground/55">
        {t("donate.ways.us.deductibleNote")}
      </p>

      <ul className="mt-5 flex flex-col divide-y divide-border/60">
        {/* PayPal — card / balance */}
        <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
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
        </li>

        {/* Check — free */}
        <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-base font-semibold text-primary">
              {t("donate.ways.us.check.title")}
            </span>
            <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
              {t("donate.ways.us.check.fee")}
            </span>
          </div>
          <p className="text-sm leading-5 text-card-foreground/70">
            {t("donate.ways.us.check.detail")}
          </p>
          <button
            type="button"
            onClick={() => {
              copy(payee);
              trackEvent("donate_click", {
                method: "check",
                action: "copy_payee",
              });
            }}
            aria-label={
              copied
                ? t("donate.ways.copied")
                : failed
                  ? t("donate.ways.copyFailed")
                  : t("donate.ways.us.check.copyAria")
            }
            title={
              copied
                ? t("donate.ways.copied")
                : failed
                  ? t("donate.ways.copyFailed")
                  : t("donate.ways.us.check.copyAria")
            }
            className="inline-flex items-center gap-1.5 self-start rounded-md border border-border/70 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary/25 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="font-mono">{payee}</span>
            <span aria-live="polite" className="sr-only">
              {copied
                ? t("donate.ways.copied")
                : failed
                  ? t("donate.ways.copyFailed")
                  : ""}
            </span>
          </button>
          <p className="text-xs leading-5 text-foreground/55">
            {t("donate.ways.us.check.addressNote")}
          </p>
        </li>
      </ul>
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

          <div className="mt-10 grid items-start gap-5 md:grid-cols-2 md:gap-6">
            <NepalCard />
            <UsCard />
          </div>
        </div>
      </div>
    </section>
  );
}
