import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, ExternalLink, Globe, HeartHandshake, MapPin } from "@/components/icons";
import { SiPaypal } from "react-icons/si";

import { ShaderBackdrop } from "@/components/brand-shaders/shader-backdrop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { trackEvent, type DonateAction, type DonateMethod } from "@/utils/analytics";

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
/**
 * PayPal Giving Fund is hidden from the abroad panel, leaving Zeffy as the only
 * rail. Hidden rather than deleted: the fundraiser, the URL and the `paypal`
 * analytics method all still exist, so this is one line to reverse.
 *
 * `: boolean` is load-bearing — without it the literal type narrows to `false`
 * and the rail below becomes statically dead code.
 *
 * `/donate/cancel` carried the other PayPal link on the site. It is an
 * unguarded, pre-rendered route — reachable by typing the URL, not only by a
 * payment return — so hiding the rail here left a live PayPal CTA one URL
 * away. That page now points back at /donate instead of at a hosted button.
 */
const SHOW_PAYPAL: boolean = false;
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
  action: DonateAction;
  trackMethod: DonateMethod;
  mono?: boolean;
}) {
  const { t } = useTranslation();
  const { copied, failed, copy } = useCopyFeedback();

  return (
    // One row of the details table (OKX, Kraken): the label in its own column
    // from lg up, the value, and the copy button at the row's end where the
    // thumb expects it. On a phone the label sits above the value.
    <div className="grid gap-x-6 gap-y-0.5 border-b border-border py-3 lg:grid-cols-[6.5rem_minmax(0,1fr)] lg:items-center">
      <dt className="text-sm text-muted-foreground">
        {label}
      </dt>
      <dd className="flex min-w-0 items-center justify-between gap-3">
        <span
          className={
            mono
              ? "min-w-0 select-all break-all text-base tabular-nums text-primary"
              : "min-w-0 select-all text-base leading-6 text-primary"
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
        <p className="text-sm text-destructive lg:col-start-2">
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
function BankDetails({ trackMethod }: { trackMethod: DonateMethod }) {
  const { t } = useTranslation();

  return (
    <dl className="[&>div:last-child]:border-b-0">
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

// The card follows the shader cards on /likhit and /mcp: the words on the mist
// on the left, the working part on a frosted white panel on the right. Each
// route therefore comes in two halves — its words and its action — rendered
// into those two columns.
const FROSTED_PANEL =
  "rounded-3xl border border-border/60 bg-surface/90 p-5 backdrop-blur-sm sm:p-6";

// Nepal — the two Nepali QR networks, plus direct bank transfer.
function NepalWords() {
  const { t } = useTranslation();
  return (
    <>
      <h3 className="text-lg leading-7 text-primary">{t("donate.ways.nepali.qrTitle")}</h3>
      <p className="mt-1 max-w-xl text-base leading-7 text-muted-foreground">
        {t("donate.ways.nepali.qrDescription")}
      </p>
      {/* The details you copy sit with the words; the code you scan is the
          action on the right. On a phone this comes first: someone on their
          phone cannot scan a code shown on that phone, but can copy a number. */}
      <div className={FROSTED_PANEL + " mt-6 py-2 sm:py-2"}>
        <BankDetails trackMethod="nepal_bank" />
      </div>
    </>
  );
}

// The network switch and its code, centred in the frosted panel.
function NepalAction() {
  const { t } = useTranslation();
  // FonePay first: it is the wider-reach network of the two.
  const [wallet, setWallet] = useState<WalletId>("fonepay");

  return (
    <div className="flex flex-col items-center">
      <div
        role="group"
        aria-label={t("donate.ways.nepali.walletSwitchAria")}
        className="inline-flex gap-1 rounded-full bg-muted p-1"
      >
        {WALLETS.map(({ id }) => (
          <button
            key={id}
            type="button"
            aria-pressed={id === wallet}
            onClick={() => setWallet(id)}
            className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              id === wallet
                ? "rounded-full bg-primary px-3.5 py-1.5 text-sm text-primary-foreground"
                : "rounded-full px-3.5 py-1.5 text-sm text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
            }`}
          >
            {t(`donate.ways.nepali.wallets.${id}.label`)}
          </button>
        ))}
      </div>

      {/* Both networks stay mounted so switching never re-fetches, and the two
          images share one canvas size so the card cannot shift height. */}
      <div className="mt-4 w-[180px] overflow-hidden rounded-2xl bg-white">
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
  );
}

// One rail on the abroad panel: brand line, one line of detail, one outbound
// link. Shared by both rails so they cannot drift apart — in particular the CTA
// classes, which are load-bearing:
//
// `whitespace-normal` and `w-full` at every width: the rail sits in a fixed
// tile, so the button fills it, and each label is a sentence in Nepali
// ("PayPal Giving Fund मार्फत आर्थिक सहयोग गर्नुहोस्"). `buttonVariants`' base
// string is `whitespace-nowrap`; sized to fit that unbreakable line (`w-fit`)
// it was 350px of min-content, which floors the grid track and overflows a
// 320px phone. See
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
        <span className={`text-lg ${brandClassName}`}>
          {t(`donate.ways.us.${id}.title`)}
        </span>
      </span>
      <p className="text-base leading-7 text-muted-foreground">
        {t(`donate.ways.us.${id}.detail`)}
      </p>
      <Button
        asChild
        variant={variant}
        size="sm"
        className="mt-1 h-auto w-full min-w-0 gap-1.5 whitespace-normal py-2.5 text-center"
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
// Giving Fund second. Nothing else belongs here. Nepal's capital control
// policies do not permit donations from abroad to be paid into the Nepal
// bank account:
// Jawafdehi Initiative, Inc. (USA) holds the project approval that lets it fund
// the work in Nepal, so every gift from outside the country is routed through
// it. An earlier revision of this page offered a remittance-service path
// (Wise/Remitly/Western Union) straight into the Nepal account — that was
// withdrawn as non-compliant, not merely redundant. Do not reinstate it without
// a written legal sign-off.
function AbroadWords() {
  const { t } = useTranslation();
  return (
    <>
      <h3 className="text-lg leading-7 text-primary">{t("donate.ways.us.whoFor")}</h3>
      {/* Who actually receives the money, and under which EIN. A disclosure,
          not a pitch, so it is grey rather than crimson. Worded without naming
          a rail, so it stays true whether one route shows or both. */}
      <p className="mt-1 max-w-xl text-base leading-7 text-muted-foreground">
        {t("donate.ways.us.proceedsNote")}
      </p>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
        {t("donate.ways.us.capitalControlNote")}
      </p>
    </>
  );
}

function AbroadAction() {
  const { t } = useTranslation();
  const [zeffyOpen, setZeffyOpen] = useState(false);
  // Mount the iframe on first open and leave it mounted, so closing and
  // reopening does not throw away a part-filled form.
  const [zeffyLoaded, setZeffyLoaded] = useState(false);

  return (
    <div className="w-full">
      {/* Zeffy carries the filled button. The outlined PayPal rail below it is
          hidden (see SHOW_PAYPAL), so in practice this is a single rail — the
          gap and column direction are kept so restoring PayPal needs no layout
          work. */}
      <div className="flex flex-col gap-5">
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
        {SHOW_PAYPAL ? (
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
        ) : null}
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
export function PayCard({
  header,
  footer,
}: Readonly<{ header?: ReactNode; footer?: ReactNode }>) {
  const { t } = useTranslation();
  const [region, setRegion] = useState<Region>("nepal");
  const userChoseRef = useRef(false);

  useEffect(() => {
    if (userChoseRef.current) return;
    const guessed = guessRegion();
    if (guessed !== "nepal") setRegion(guessed);
  }, []);

  return (
    // The /likhit and /mcp shader card: one hairline card on the mist, the
    // heading with the route switch beside it, then that route's words on the
    // left and the working part on a frosted white panel on the right. Both routes stay mounted
    // (the inactive one is `hidden`), so switching keeps a chosen wallet and a
    // part-filled Zeffy form.
    <article className="relative isolate overflow-hidden rounded-[28px] border border-border/70 bg-surface p-6 text-card-foreground md:p-10">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <ShaderBackdrop design="mist" />
      </div>

      {/* The heading and the route switch share the top line. */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {header}
        <div
          role="group"
          aria-label={t("donate.ways.title")}
          className="inline-flex w-fit gap-1 rounded-full border border-border/60 bg-surface/90 p-1 backdrop-blur-sm"
        >
          {REGIONS.map((id) => {
            const selected = id === region;
            const Icon = id === "nepal" ? MapPin : Globe;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  userChoseRef.current = true;
                  setRegion(id);
                  trackEvent("donate_click", {
                    method: "region_toggle",
                    action: id,
                  });
                }}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm transition-[background-color,color,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "text-primary/70 hover:bg-primary/10 hover:text-primary",
                )}
              >
                <Icon className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" />
                {t(
                  id === "nepal"
                    ? "donate.ways.nepali.title"
                    : "donate.ways.us.title",
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* The words take 60%, the action 40%. The action panel stretches to the
          words' height and centres its content, so neither side floats. */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-12">
        <div className="min-w-0">
          <div hidden={region !== "nepal"}>
            <NepalWords />
          </div>
          <div hidden={region !== "abroad"}>
            <AbroadWords />
          </div>
        </div>

        <div className="min-w-0">
          <div hidden={region !== "nepal"} className={FROSTED_PANEL + " h-full"}>
            <div className="flex h-full items-center justify-center">
              <NepalAction />
            </div>
          </div>
          <div hidden={region !== "abroad"} className={FROSTED_PANEL + " h-full"}>
            <div className="flex h-full items-center">
              <AbroadAction />
            </div>
          </div>
        </div>
      </div>

      {footer ? <div className="mt-8">{footer}</div> : null}
    </article>
  );
}
