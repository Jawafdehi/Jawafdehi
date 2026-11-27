import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaWhatsapp } from "react-icons/fa";
import { Loader2, ShieldCheck } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { COPY, type Copy, type Lang } from "@/components/volunteer-apply/copy";
import { sendWhatsAppCode, verifyWhatsAppCode } from "@/components/volunteer-apply/mock-api";
import { saveVerification } from "@/components/volunteer-apply/verification";
import { Field } from "@/components/volunteer-apply/field";
import { digitsOf, INVALID_RING, LangCtx, NEPAL_MOBILE, REQUIRED, useCopy } from "@/components/volunteer-apply/shared";

function OtpInput({
  value,
  onChange,
  disabled,
  invalid,
}: Readonly<{ value: string; onChange: (v: string) => void; disabled?: boolean; invalid?: boolean }>) {
  const { c } = useCopy();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
  useEffect(() => {
    refs.current[0]?.focus();
  }, []);
  const put = (from: number, raw: string) => {
    const incoming = raw.replace(/\D/g, "");
    if (!incoming) return;
    const next = (value.slice(0, from) + incoming).slice(0, 6);
    onChange(next);
    refs.current[Math.min(next.length, 5)]?.focus();
  };
  return (
    <div className="flex gap-2 sm:gap-3" role="group" aria-label={c.codeLabel}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          id={i === 0 ? "code" : undefined}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={c.digit(i + 1)}
          maxLength={6}
          disabled={disabled}
          value={d}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => put(i, e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            put(0, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d && i > 0) {
              onChange(value.slice(0, i - 1));
              refs.current[i - 1]?.focus();
            } else if (e.key === "Backspace") {
              onChange(value.slice(0, i));
            }
          }}
          className={cn(
            "font-input h-12 w-10 min-w-0 rounded-xl border bg-background text-center text-xl font-semibold text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-14 sm:w-12 sm:text-2xl",
            invalid ? INVALID_RING : d ? "border-primary/50" : "border-input",
          )}
        />
      ))}
    </div>
  );
}

function PhoneStep({
  phone,
  setPhone,
  onVerified,
  devSkip,
}: Readonly<{
  phone: string;
  setPhone: (v: string) => void;
  onVerified: (token: string) => void;
  devSkip?: boolean;
}>) {
  const { c } = useCopy();
  const [stage, setStage] = useState<"enter" | "code">("enter");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const digits = digitsOf(phone);
  const full = `+977${digits}`;

  const send = async () => {
    if (!digits) {
      setError(REQUIRED);
      return;
    }
    if (!NEPAL_MOBILE.test(digits)) {
      setError(c.phoneInvalid);
      return;
    }
    setBusy(true);
    setError(null);
    const { devCode } = await sendWhatsAppCode(full);
    console.info(`[volunteer-apply] WhatsApp code for ${full}: ${devCode}`);
    setBusy(false);
    setStage("code");
    setCooldown(60);
    setCode("");
  };

  const verify = async (value = code) => {
    setBusy(true);
    setError(null);
    try {
      const { token } = await verifyWhatsAppCode(full, value);
      onVerified(token);
    } catch (e) {
      const key = (e as Error).message as keyof Copy["otpErrors"];
      setError(c.otpErrors[key] ?? c.otpErrors.mismatch);
      setBusy(false);
    }
  };

  return (
    <div>
      <DialogHeader className="mb-6 space-y-2 text-left">
        <DialogTitle className="font-home-display text-xl leading-tight text-primary sm:text-2xl md:text-3xl [:root[lang=ne]_&]:leading-snug">
          {c.phoneTitle}
        </DialogTitle>
        <DialogDescription className="text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
          {c.phoneLede}
        </DialogDescription>
      </DialogHeader>

      {stage === "enter" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="space-y-5"
        >
          <Field label={c.mobile} htmlFor="phone" error={error ?? undefined} required>
            <div
              className={cn(
                "flex h-12 max-w-sm items-center rounded-full border border-input bg-background pl-5 transition-[box-shadow,border-color] focus-within:ring-2 focus-within:ring-ring",
                error && INVALID_RING,
              )}
            >
              <span id="phone-prefix" className="shrink-0 text-base text-muted-foreground">
                +977
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98XXXXXXXX"
                maxLength={10}
                aria-required="true"
                aria-invalid={error ? true : undefined}
                aria-describedby="phone-prefix"
                value={phone}
                onChange={(e) => {
                  setPhone(digitsOf(e.target.value).slice(0, 10));
                  setError(null);
                }}
                className="font-input h-full min-w-0 flex-1 rounded-r-full bg-transparent px-3 text-base tracking-wide text-primary outline-none placeholder:text-muted-foreground"
              />
            </div>
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" disabled={busy} className="w-full gap-2 rounded-full sm:w-auto">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaWhatsapp className="h-4 w-4" />}
              {c.sendCode}
            </Button>
            {import.meta.env.DEV && devSkip ? (
              <Button
                data-dev-only
                type="button"
                variant="ghost"
                size="lg"
                className="rounded-full"
                onClick={() => onVerified(`dev-${Date.now()}`)}
              >
                Skip (dev)
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
          className="space-y-5"
        >
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-4 text-sm text-primary">
            <FaWhatsapp className="h-5 w-5 shrink-0 text-[#25D366]" aria-hidden="true" />
            <span>
              {c.codeSentTo} <strong>+977 {digits}</strong>.{" "}
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => {
                  setStage("enter");
                  setError(null);
                }}
              >
                {c.changeNumber}
              </button>
            </span>
          </div>

          <Field label={c.codeLabel} htmlFor="code" error={error ?? undefined}>
            <OtpInput
              value={code}
              disabled={busy}
              invalid={Boolean(error)}
              onChange={(v) => {
                setCode(v);
                setError(null);
                if (v.length === 6) void verify(v);
              }}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" size="lg" disabled={busy || code.length !== 6} className="gap-2 rounded-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {c.verify}
            </Button>
            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={() => void send()}
              className="text-sm text-muted-foreground underline-offset-4 enabled:hover:text-primary enabled:hover:underline disabled:opacity-60"
            >
              {cooldown > 0 ? c.resendIn(cooldown) : c.resend}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function VerifyPhoneDialog({
  open,
  onOpenChange,
  onVerified,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void; onVerified: () => void }>) {
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith("ne") ? "ne" : "en";
  const ctx = useMemo(() => ({ c: COPY[lang], lang }), [lang]);
  const [phone, setPhone] = useState("");

  return (
    <LangCtx.Provider value={ctx}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overflow-x-hidden rounded-3xl p-6 sm:rounded-3xl md:p-8 [&>*]:min-w-0">
          <PhoneStep
            phone={phone}
            setPhone={setPhone}
            devSkip={import.meta.env.DEV}
            onVerified={(token) => {
              saveVerification({ phone: phone || "9841234567", token });
              onVerified();
            }}
          />
        </DialogContent>
      </Dialog>
    </LangCtx.Provider>
  );
}
