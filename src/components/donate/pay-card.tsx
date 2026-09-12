import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, ExternalLink, HeartHandshake } from "lucide-react";
import { SiPaypal } from "react-icons/si";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackEvent } from "@/utils/analytics";

// US 501(c)(3) donation rails (Jawafdehi Initiative, Inc.). Both settle to the
// same entity; they differ only in what the donor sees at checkout.
//
// Zeffy is offered in a dialog, so the donor never leaves the page. Two URLs,
// because the dialog is an enhancement and the link underneath it has to work
// on its own: ``FORM`` is the hosted page (the anchor's real href — no-JS,
// middle-click, "open in new tab"), ``EMBED`` is the same form in the frameable
// shape Zeffy serves for embedding.
//
// We do NOT ship Zeffy's own pop-up snippet, and the reasons are in its source
// (2.1 KB, read before this was written): it binds on `DOMContentLoaded`, which
// has already fired by the time a client-side route change reaches /donate — so
// on an SPA the button would silently do nothing — and it appends a hidden,
// eagerly-loading zeffy.com iframe for every `[zeffy-form-link]` on page load,
// so every visitor to /donate would pay for a payment iframe they never open.
// The dialog below mounts the iframe on click instead.
const ZEFFY_FORM_URL =
  "https://www.zeffy.com/donation-form/donate-to-change-lives-19421";
const ZEFFY_EMBED_URL =
  "https://www.zeffy.com/embed/donation-form/donate-to-change-lives-19421?modal=true";
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

// One rail on the abroad panel: brand line, one line of detail, one outbound
// link. Shared by both rails so they cannot drift apart — in particular the CTA
// classes, which are load-bearing:
//
// `whitespace-normal` and `w-full` until `sm`, because each label is a sentence
// in Nepali ("PayPal Giving Fund मार्फत आर्थिक सहयोग गर्नुहोस्").
// `buttonVariants`' base string is `whitespace-nowrap`, and `w-fit` then sizes
// the button to that unbreakable line — 350px of min-content, which floors the
// grid track and overflows a 320px phone. See
// tests/layout/no-horizontal-overflow.test.tsx. `h-auto` because a wrapped
// label no longer fits `size="sm"`'s 36px.
function AbroadRail({
  id,
  href,
  icon,
  brandClassName,
  variant,
  onActivate,
}: {
  id: "zeffy" | "paypal";
  href: string;
  icon: ReactNode;
  brandClassName: string;
  variant: "primary" | "outline";
  // Called for a plain left-click only, and only when the rail wants to handle
  // the click itself (Zeffy opens a dialog). Modified clicks are left alone so
  // "open in new tab" keeps working on a link that is still a real link.
  onActivate?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <span className="inline-flex items-center gap-1.5">
        {icon}
        <span className={`text-base font-bold ${brandClassName}`}>
          {t(`donate.ways.us.${id}.title`)}
        </span>
      </span>
      <p className="text-sm leading-5 text-card-foreground/70">
        {t(`donate.ways.us.${id}.detail`)}
      </p>
      <Button
        asChild
        variant={variant}
        size="sm"
        className="mt-1 h-auto w-full min-w-0 gap-1.5 whitespace-normal py-2.5 text-center sm:w-fit"
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            const plainClick =
              event.button === 0 &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey;
            if (onActivate && plainClick) {
              event.preventDefault();
              onActivate();
              trackEvent("donate_click", {
                method: id,
                action: "modal_open",
                link_url: href,
              });
              return;
            }
            trackEvent("donate_click", {
              method: id,
              action: "outbound",
              link_url: href,
            });
          }}
        >
          <span>{t(`donate.ways.us.${id}.cta`)}</span>
          {/* The arrow means "this leaves the site", so it is not shown on a rail
              that opens in a dialog — even though the href underneath it is a
              real external link for a modified click or a no-JS reader. */}
          {onActivate ? null : (
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          )}
        </a>
      </Button>
    </div>
  );
}

// Outside Nepal — two rails into the US 501(c)(3), Zeffy first and PayPal
// Giving Fund second. Nothing else belongs here. Nepal's foreign-exchange rules
// do not permit donations from abroad to be paid into the Nepal bank account:
// Jawafdehi Initiative, Inc. (USA) holds the project approval that lets it fund
// the work in Nepal, so every gift from outside the country is routed through
// it. An earlier revision of this page offered a remittance-service path
// (Wise/Remitly/Western Union) straight into the Nepal account — that was
// withdrawn as non-compliant, not merely redundant. Do not reinstate it without
// a written legal sign-off.
function AbroadPanel() {
  const { t } = useTranslation();
  const [zeffyOpen, setZeffyOpen] = useState(false);
  // Mount the iframe on first open and leave it mounted, so closing and
  // reopening does not throw away a part-filled form.
  const [zeffyLoaded, setZeffyLoaded] = useState(false);

  return (
    <div>
      <p className="text-sm font-medium text-accent">
        {t("donate.ways.us.whoFor")}
      </p>
      <p className="mt-2 text-xs font-medium leading-5 text-accent">
        {t("donate.ways.us.proceedsNote")}
      </p>

      {/* Two rails, one visual weight each: Zeffy carries the filled button and
          PayPal the outlined one, so the order reads as a recommendation
          without a second line of copy explaining it. */}
      <div className="mt-5 flex flex-col gap-5 border-t border-border/60 pt-5">
        <AbroadRail
          id="zeffy"
          href={ZEFFY_FORM_URL}
          icon={
            <HeartHandshake
              className="h-5 w-5 text-primary"
              aria-hidden="true"
            />
          }
          brandClassName="text-primary"
          variant="primary"
          onActivate={() => {
            setZeffyLoaded(true);
            setZeffyOpen(true);
          }}
        />
        <AbroadRail
          id="paypal"
          href={PAYPAL_DONATE_URL}
          icon={
            <SiPaypal
              className="h-5 w-5 text-[#003087] dark:text-[#6cb2ff]"
              aria-hidden="true"
            />
          }
          brandClassName="text-[#003087] dark:text-[#6cb2ff]"
          variant="outline"
        />
      </div>

      <div className="mt-5 border-t border-border/60 pt-4">
        <p className="text-xs leading-5 text-card-foreground/60">
          {t("donate.ways.us.capitalControlNote")}
        </p>
      </div>

      {/* Zeffy's hosted form, framed. `allow="payment"` is what lets the Payment
          Request API run inside a cross-origin frame — without it card wallets
          (Apple Pay / Google Pay) are unavailable and the donor is dropped to
          manual card entry. The CSP needs `frame-src https://www.zeffy.com`
          (worker.ts) or the browser blocks this frame outright.
          `p-0` because the form brings its own padding, and a tall viewport-
          relative box because a donation form is a full page, not a prompt. */}
      {zeffyLoaded ? (
        <Dialog open={zeffyOpen} onOpenChange={setZeffyOpen}>
          <DialogContent className="h-[92svh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-hidden p-0 sm:h-[86svh]">
            <DialogTitle className="sr-only">
              {t("donate.ways.us.zeffy.dialogTitle")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("donate.ways.us.zeffy.dialogDescription")}
            </DialogDescription>
            <iframe
              src={ZEFFY_EMBED_URL}
              title={t("donate.ways.us.zeffy.dialogTitle")}
              allow="payment"
              className="h-full w-full border-0"
            />
          </DialogContent>
        </Dialog>
      ) : null}
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
 * networks + bank transfer) is the default tab; giving from abroad (Zeffy or
 * PayPal Giving Fund → the US 501(c)(3)) is the other. Both panels stay mounted
 * so switching never re-fetches the QR images and never loses copy state.
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
