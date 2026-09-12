import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, ExternalLink } from "lucide-react";
import { SiPaypal } from "react-icons/si";

import { Button } from "@/components/ui/button";
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

const REGIONS = ["nepal", "abroad"] as const;
type Region = (typeof REGIONS)[number];

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

// One copyable row of the bank-details block: label, value, and a copy button
// that owns its own transient feedback state, so copying one row never
// flashes "copied" on another.
function CopyRow({
  label,
  display,
  copyText,
  copyAria,
  action,
  trackMethod,
  mono = false,
}: {
  label: string;
  display: string;
  copyText: string;
  copyAria: string;
  action: string;
  trackMethod: string;
  mono?: boolean;
}) {
  const { t } = useTranslation();
  const { copied, failed, copy } = useCopyFeedback();

  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-accent/70">
        {label}
      </dt>
      <dd className="mt-0.5 flex items-center gap-1">
        <span
          className={
            mono
              ? "min-w-0 select-all break-all font-mono text-base font-medium tracking-wide text-primary"
              : "min-w-0 select-all text-sm font-medium leading-5 text-card-foreground"
          }
        >
          {display}
        </span>
        <button
          type="button"
          onClick={() => {
            copy(copyText);
            trackEvent("donate_click", { method: trackMethod, action });
          }}
          aria-label={
            copied
              ? t("donate.ways.copied")
              : failed
                ? t("donate.ways.copyFailed")
                : copyAria
          }
          title={
            copied
              ? t("donate.ways.copied")
              : failed
                ? t("donate.ways.copyFailed")
                : copyAria
          }
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary-surface/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
  );
}

// The Prime Commercial Bank account block. Shown only on the Nepal panel:
// donations from abroad legally cannot be paid into this account (see
// AbroadPanel). `trackMethod` names the context in analytics. Every row is
// copyable — donors paste each field into their banking app — and each row owns
// its feedback state independently.
function BankDetails({ trackMethod }: { trackMethod: string }) {
  const { t } = useTranslation();

  return (
    <dl className="grid gap-2.5">
      <CopyRow
        label={t("donate.ways.nepali.nameLabel")}
        display={t("donate.ways.nepali.accountName")}
        copyText={t("donate.ways.nepali.accountName")}
        copyAria={t("donate.ways.nepali.copyNameAria")}
        action="copy_name"
        trackMethod={trackMethod}
      />
      <CopyRow
        label={t("donate.ways.nepali.bankLabel")}
        display={`${t("donate.ways.nepali.bankName")} (${t("donate.ways.nepali.branchName")})`}
        copyText={t("donate.ways.nepali.bankName")}
        copyAria={t("donate.ways.nepali.copyBankAria")}
        action="copy_bank"
        trackMethod={trackMethod}
      />
      <CopyRow
        label={t("donate.ways.nepali.accountLabel")}
        display={NEPALI_BANK_ACCOUNT_NUMBER}
        copyText={NEPALI_BANK_ACCOUNT_NUMBER}
        copyAria={t("donate.ways.nepali.copyAria")}
        action="copy_account"
        trackMethod={trackMethod}
        mono
      />
    </dl>
  );
}

// Nepal — the two Nepali QR networks, plus direct bank transfer.
function NepalPanel() {
  const { t } = useTranslation();
  // FonePay first: it is the wider-reach network of the two.
  const [wallet, setWallet] = useState<WalletId>("fonepay");

  return (
    <div>
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
            className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              id === wallet
                ? "rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
                : "rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
            }`}
          >
            {t(`donate.ways.nepali.wallets.${id}.label`)}
          </button>
        ))}
      </div>

      {/* Both networks stay mounted so switching never re-fetches, and the two
          images share one canvas size so the card cannot shift height. */}
      <div className="mt-3 w-[180px] overflow-hidden rounded-md bg-white p-2">
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

      <div className="mt-5 border-t border-border/60 pt-4">
        <BankDetails trackMethod="nepal_bank" />
      </div>
    </div>
  );
}

// Outside Nepal — PayPal Giving Fund (the US 501(c)(3)) is the ONLY rail, and
// deliberately so. Nepal's foreign-exchange rules do not permit donations from
// abroad to be paid into the Nepal bank account: Jawafdehi Initiative, Inc.
// (USA) holds the project approval that lets it fund the work in Nepal, so
// every gift from outside the country is routed through it. An earlier revision
// of this page offered a remittance-service path (Wise/Remitly/Western Union)
// straight into the Nepal account — that was withdrawn as non-compliant, not
// merely redundant. Do not reinstate it without a written legal sign-off.
function AbroadPanel() {
  const { t } = useTranslation();

  return (
    <div>
      <p className="text-sm font-medium text-accent">
        {t("donate.ways.us.whoFor")}
      </p>
      <p className="mt-2 text-xs font-medium leading-5 text-accent">
        {t("donate.ways.us.proceedsNote")}
      </p>

      <div className="mt-5 flex flex-col gap-2 border-t border-border/60 pt-5">
        <span className="inline-flex items-center gap-1.5">
          <SiPaypal
            className="h-5 w-5 text-[#003087] dark:text-[#6cb2ff]"
            aria-hidden="true"
          />
          <span className="text-base font-bold text-[#003087] dark:text-[#6cb2ff]">
            {t("donate.ways.us.paypal.title")}
          </span>
        </span>
        <p className="text-sm leading-5 text-card-foreground/70">
          {t("donate.ways.us.paypal.detail")}
        </p>
        {/* `whitespace-normal` and `w-full` until `sm`, because this label is a
            sentence in Nepali: "PayPal Giving Fund मार्फत आर्थिक सहयोग गर्नुहोस्".
            `buttonVariants`' base string is `whitespace-nowrap`, and `w-fit` then
            sizes the button to that unbreakable line — 350px of min-content, which
            floors the grid track and overflows a 320px phone. See
            tests/layout/no-horizontal-overflow.test.tsx. `h-auto` because a
            wrapped label no longer fits `size="sm"`'s 36px. */}
        <Button
          asChild
          variant="primary"
          size="sm"
          className="mt-1 h-auto w-full min-w-0 gap-1.5 whitespace-normal py-2.5 text-center sm:w-fit"
        >
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

      <div className="mt-5 border-t border-border/60 pt-4">
        <p className="text-xs leading-5 text-card-foreground/60">
          {t("donate.ways.us.capitalControlNote")}
        </p>
      </div>
    </div>
  );
}

// Best-effort guess of whether the visitor is giving from inside Nepal, so the
// card opens on the payment methods they can actually use. Timezone is the
// signal: Asia/Kathmandu means QR + local bank transfer work; anything else
// (or an unreadable timezone) means PayPal is the likelier path. Runs only
// after hydration — the pre-rendered HTML must stay deterministic ("nepal").
function guessRegion(): Region {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz === "Asia/Kathmandu" ? "nepal" : "abroad";
  } catch {
    return "nepal";
  }
}

/**
 * The payment card: one card, two regions. Giving from inside Nepal (QR
 * networks + bank transfer) is the default tab; giving from abroad (PayPal
 * Giving Fund → the US 501(c)(3)) is the other. Both panels stay mounted so
 * switching never re-fetches the QR images and never loses copy state.
 *
 * The tab auto-selects from the visitor's timezone after hydration, but only
 * until they touch it — a manual toggle always wins.
 */
export function PayCard() {
  const { t } = useTranslation();
  const [region, setRegion] = useState<Region>("nepal");
  const userChoseRef = useRef(false);

  useEffect(() => {
    if (userChoseRef.current) return;
    const guessed = guessRegion();
    if (guessed !== "nepal") setRegion(guessed);
  }, []);

  return (
    <article className="flex flex-col rounded-lg bg-card p-6 text-card-foreground shadow-lg md:p-7">
      <div
        role="group"
        aria-label={t("donate.ways.title")}
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1"
      >
        {REGIONS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={id === region}
            onClick={() => {
              userChoseRef.current = true;
              setRegion(id);
              trackEvent("donate_click", {
                method: "region_toggle",
                action: id,
              });
            }}
            className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              id === region
                ? "rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                : "rounded-md px-3 py-2 text-sm font-semibold text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
            }`}
          >
            {t(
              id === "nepal"
                ? "donate.ways.nepali.title"
                : "donate.ways.us.title",
            )}
          </button>
        ))}
      </div>

      <div className="mt-5" hidden={region !== "nepal"}>
        <NepalPanel />
      </div>
      <div className="mt-5" hidden={region !== "abroad"}>
        <AbroadPanel />
      </div>
    </article>
  );
}
