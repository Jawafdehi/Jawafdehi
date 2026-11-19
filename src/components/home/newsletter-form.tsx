import { useId, useState } from "react";
import { Check } from "@/components/icons";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JDSApiError, subscribeToNewsletter } from "@/services/jds-api";
import { cn } from "@/lib/utils";
import { NEWSLETTER_PRIVACY_VERSION } from "@/config/newsletter";

type NewsletterFormProps = {
  /** Extra field shown by the landing-page section but not the entry modal. */
  withLastName?: boolean;
  /** Compact variant for the modal: placeholder-only fields, full-width button. */
  compact?: boolean;
  /** High-contrast variant for use on primary/dark backgrounds. */
  inverted?: boolean;
  /**
   * The footer's form: placeholder-only fields, name and email side by side
   * from sm up, coloured from the footer's own --footer-* tokens so
   * it follows the footer from navy (light) to cream (dark).
   */
  footer?: boolean;
  submitLabel: string;
  onSubscribed?: () => void;
  className?: string;
};

type SubmitStatus = "idle" | "submitting" | "success";
type FieldErrors = {
  firstName: boolean;
  email: boolean;
  consent: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_FIELD_ERRORS: FieldErrors = {
  firstName: false,
  email: false,
  consent: false,
};

export function NewsletterForm({
  withLastName = false,
  compact = false,
  inverted = false,
  footer = false,
  submitLabel,
  onSubscribed,
  className,
}: Readonly<NewsletterFormProps>) {
  const { i18n, t } = useTranslation();
  const fieldId = useId();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [consented, setConsented] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_FIELD_ERRORS);
  const [formError, setFormError] = useState<string | null>(null);

  if (status === "success") {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-col items-center gap-6 py-6 text-center",
          inverted && "text-primary-foreground",
          footer && "items-start py-2 text-left",
          className,
        )}
      >
        <Check
          className={cn(
            "h-20 w-20 shrink-0 stroke-[4] text-success",
            inverted && "text-primary-foreground",
            footer && "h-10 w-10 stroke-[3] text-[var(--footer-title)]",
          )}
          aria-hidden="true"
        />
        <div>
          <p
            className={cn(
              "mx-auto max-w-md text-lg leading-7 text-primary",
              inverted && "text-primary-foreground",
              footer && "mx-0 text-[var(--footer-fg)]",
            )}
          >
            {t("newsletter.form.successTitle")}
          </p>
          <p
            className={cn(
              "mx-auto mt-2 max-w-md text-base leading-7 text-muted-foreground",
              inverted && "text-primary-foreground/80",
              footer && "mx-0 text-[var(--footer-link)]",
            )}
          >
            {t("newsletter.form.successMessage")}
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextFieldErrors = {
      firstName: !firstName.trim(),
      email: !EMAIL_PATTERN.test(email.trim()),
      consent: !consented,
    };
    setFieldErrors(nextFieldErrors);
    setFormError(null);

    if (Object.values(nextFieldErrors).some(Boolean)) {
      return;
    }

    setFormError(null);
    setStatus("submitting");
    try {
      await subscribeToNewsletter({
        firstName: firstName.trim(),
        lastName: withLastName ? lastName.trim() || undefined : undefined,
        email: email.trim(),
        consentAccepted: consented,
        consentSource: footer ? "footer" : compact ? "newsletter_modal" : "share_our_vision",
        privacyVersion: NEWSLETTER_PRIVACY_VERSION,
        locale: i18n.resolvedLanguage ?? i18n.language,
      });
      setStatus("success");
      onSubscribed?.();
    } catch (err) {
      setFormError(
        err instanceof JDSApiError && err.statusCode === 409
          ? t("newsletter.form.errorUnsubscribed")
          : err instanceof JDSApiError && err.statusCode === 429
            ? t("newsletter.form.errorThrottled")
            : t("newsletter.form.errorGeneric"),
      );
      setStatus("idle");
    }
  };

  const placeholders = compact || footer;
  const labelClassName = cn(placeholders && "sr-only", inverted && "text-primary-foreground");
  const requiredMark = (
    <span aria-hidden="true" className="ml-1 text-accent">
      *
    </span>
  );
  const getInputClassName = (hasError: boolean) =>
    cn(
      inverted &&
        "border-primary-foreground/25 bg-primary-foreground text-foreground placeholder:text-muted-foreground focus-visible:ring-primary-foreground focus-visible:ring-offset-primary",
      footer &&
        "h-11 rounded-full border-[var(--footer-border)] bg-[var(--footer-soft)] px-4 text-[var(--footer-fg)] placeholder:text-[var(--footer-muted)] hover:border-[var(--footer-border-hover)] focus-visible:ring-[var(--footer-fg)] focus-visible:ring-offset-0",
      hasError &&
        "border-accent ring-1 ring-accent focus-visible:ring-accent focus-visible:ring-offset-2",
    );
  const fieldErrorClassName = cn(
    "text-sm font-medium text-destructive",
    inverted && "text-primary-foreground",
    footer && "text-[var(--footer-title)]",
  );

  const submitButton = (
    <Button
      type="submit"
      variant="primary"
      disabled={status === "submitting"}
      className={cn(
        compact && "w-full",
        inverted &&
          "bg-primary-foreground text-primary shadow-primary-foreground/10 hover:bg-primary-foreground/90",
        footer &&
          "h-11 rounded-full bg-[var(--footer-fg)] px-5 text-[var(--footer-bg)] shadow-none transition-transform duration-150 hover:bg-[var(--footer-fg)]/90 active:scale-[0.97]",
      )}
    >
      {status === "submitting" ? t("newsletter.form.submitting") : submitLabel}
    </Button>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className={cn("space-y-4 text-left", className)}>
      <div className={cn("space-y-4", footer && "grid gap-3 space-y-0 sm:grid-cols-2 sm:items-start")}>
      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-first-name`} className={labelClassName}>
          {t("newsletter.form.firstName")}
          {requiredMark}
        </Label>
        <Input
          id={`${fieldId}-first-name`}
          name="firstName"
          autoComplete="given-name"
          required
          aria-invalid={fieldErrors.firstName}
          aria-describedby={fieldErrors.firstName ? `${fieldId}-first-name-error` : undefined}
          placeholder={placeholders ? `${t("newsletter.form.firstName")} *` : undefined}
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
            if (fieldErrors.firstName && e.target.value.trim()) {
              setFieldErrors((prev) => ({ ...prev, firstName: false }));
            }
          }}
          className={getInputClassName(fieldErrors.firstName)}
        />
        {fieldErrors.firstName && (
          <p id={`${fieldId}-first-name-error`} role="alert" className={fieldErrorClassName}>
            {t("newsletter.form.errorFirstName")}
          </p>
        )}
      </div>

      {withLastName && (
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-last-name`} className={labelClassName}>
            {t("newsletter.form.lastName")}
          </Label>
          <Input
            id={`${fieldId}-last-name`}
            name="lastName"
            autoComplete="family-name"
            placeholder={placeholders ? t("newsletter.form.lastName") : undefined}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={getInputClassName(false)}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-email`} className={labelClassName}>
          {t("newsletter.form.email")}
          {requiredMark}
        </Label>
        <Input
          id={`${fieldId}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={fieldErrors.email}
          aria-describedby={fieldErrors.email ? `${fieldId}-email-error` : undefined}
          placeholder={placeholders ? `${t("newsletter.form.email")} *` : undefined}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email && EMAIL_PATTERN.test(e.target.value.trim())) {
              setFieldErrors((prev) => ({ ...prev, email: false }));
            }
          }}
          className={getInputClassName(fieldErrors.email)}
        />
        {fieldErrors.email && (
          <p id={`${fieldId}-email-error`} role="alert" className={fieldErrorClassName}>
            {t("newsletter.form.errorEmail")}
          </p>
        )}
      </div>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id={`${fieldId}-consent`}
          className={cn(
            "mt-0.5",
            footer &&
              "border-[var(--footer-border-hover)] bg-transparent data-[state=checked]:border-[var(--footer-fg)] data-[state=checked]:bg-[var(--footer-fg)] data-[state=checked]:text-[var(--footer-bg)] focus-visible:ring-[var(--footer-fg)] focus-visible:ring-offset-0",
            inverted &&
              "border-primary-foreground/70 bg-transparent text-primary data-[state=checked]:border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary focus-visible:ring-primary-foreground focus-visible:ring-offset-primary",
            fieldErrors.consent &&
              "border-accent ring-1 ring-accent focus-visible:ring-accent focus-visible:ring-offset-2",
          )}
          checked={consented}
          aria-invalid={fieldErrors.consent}
          aria-describedby={fieldErrors.consent ? `${fieldId}-consent-error` : undefined}
          required
          onCheckedChange={(checked) => {
            const nextChecked = checked === true;
            setConsented(nextChecked);
            if (nextChecked) {
              setFieldErrors((prev) => ({ ...prev, consent: false }));
            }
          }}
        />
        <Label
          htmlFor={`${fieldId}-consent`}
          className={cn(
            "text-sm font-normal text-muted-foreground",
            inverted && "text-primary-foreground/75",
            footer && "text-[var(--footer-link)]",
          )}
        >
          {requiredMark}{" "}
          {t("newsletter.form.privacyPrefix")}{" "}
          <Link
            to="/privacy"
            className={cn(
              "text-primary underline hover:no-underline",
              footer && "text-[var(--footer-fg)] decoration-[var(--footer-border-hover)]",
              inverted &&
                "text-primary-foreground decoration-primary-foreground/60 hover:decoration-primary-foreground",
            )}
          >
            {t("newsletter.form.privacyLink")}
          </Link>
          {/* A space before a word ("…सँग सहमत छु।"), none before bare
              punctuation, or English reads "Privacy Policy ." */}
          {/^[.,;:!?।]/.test(t("newsletter.form.privacySuffix")) ? "" : " "}
          {t("newsletter.form.privacySuffix")}
        </Label>
      </div>

      {fieldErrors.consent && (
        <p id={`${fieldId}-consent-error`} role="alert" className={fieldErrorClassName}>
          {t("newsletter.form.errorConsent")}
        </p>
      )}

      {formError && (
        <p
          role="alert"
          className={cn(
            "text-sm font-medium text-destructive",
            inverted && "text-primary-foreground",
            footer && "text-[var(--footer-title)]",
          )}
        >
          {formError}
        </p>
      )}

      {submitButton}
    </form>
  );
}
