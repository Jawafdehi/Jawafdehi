import { useEffect, useId, useState } from "react";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NEWSLETTER_PRIVACY_VERSION } from "@/config/newsletter";
import { JDSApiError, subscribeToNewsletter } from "@/services/jds-api";
import { cn } from "@/lib/utils";
import { OPEN_HOUSE_REGIONS, detectRegion, type OpenHouseRegion } from "./regions";

/**
 * Distinguishes an Open House signup from a newsletter signup inside the one
 * shared address book. The API keys the welcome email off this prefix, so it
 * must keep starting with "openhouse".
 */
const CONSENT_SOURCE = "openhouse_page";

type SubmitStatus = "idle" | "submitting" | "success";
type FieldErrors = { firstName: boolean; email: boolean; consent: boolean };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_FIELD_ERRORS: FieldErrors = { firstName: false, email: false, consent: false };

export function OpenHouseSignupForm({ className }: Readonly<{ className?: string }>) {
  const { i18n, t } = useTranslation();
  const fieldId = useId();

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [region, setRegion] = useState<OpenHouseRegion | "">("");
  const [forOrganisation, setForOrganisation] = useState(false);
  const [organisation, setOrganisation] = useState("");
  const [consented, setConsented] = useState(false);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(EMPTY_FIELD_ERRORS);
  const [formError, setFormError] = useState<string | null>(null);

  // Pre-fill the region from the browser's timezone. One fewer decision at the
  // exact moment we are trying to lower the hurdle, and more accurate than
  // asking. Runs in an effect so the pre-rendered HTML stays timezone-neutral.
  useEffect(() => {
    const detected = detectRegion();
    if (detected) setRegion(detected);
  }, []);

  if (status === "success") {
    return (
      <div role="status" className={cn("flex flex-col items-center gap-5 py-6 text-center", className)}>
        <Check className="h-16 w-16 shrink-0 stroke-[4] text-success" aria-hidden="true" />
        <div>
          <p className="mx-auto max-w-md text-base font-bold leading-7 text-foreground">
            {t("openHouse.signup.successTitle")}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {t("openHouse.signup.successMessage")}
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextFieldErrors: FieldErrors = {
      firstName: !firstName.trim(),
      email: !EMAIL_PATTERN.test(email.trim()),
      consent: !consented,
    };
    setFieldErrors(nextFieldErrors);
    setFormError(null);

    if (Object.values(nextFieldErrors).some(Boolean)) return;

    setStatus("submitting");
    try {
      await subscribeToNewsletter({
        firstName: firstName.trim(),
        email: email.trim(),
        consentAccepted: consented,
        consentSource: CONSENT_SOURCE,
        privacyVersion: NEWSLETTER_PRIVACY_VERSION,
        locale: i18n.resolvedLanguage ?? i18n.language,
        region: region || undefined,
        whatsapp: whatsapp.trim() || undefined,
        organisation: forOrganisation ? organisation.trim() || undefined : undefined,
      });
      setStatus("success");
    } catch (err) {
      let message = t("openHouse.signup.errorGeneric");
      if (err instanceof JDSApiError && err.statusCode === 409) {
        message = t("openHouse.signup.errorAlreadyOnList");
      } else if (err instanceof JDSApiError && err.statusCode === 429) {
        message = t("openHouse.signup.errorThrottled");
      }
      setFormError(message);
      setStatus("idle");
    }
  };

  const requiredMark = (
    <span aria-hidden="true" className="ml-1 text-accent">
      *
    </span>
  );
  const inputClass = (hasError: boolean) =>
    cn(hasError && "border-accent ring-1 ring-accent focus-visible:ring-accent focus-visible:ring-offset-2");

  return (
    <form onSubmit={handleSubmit} noValidate className={cn("space-y-4 text-left", className)}>
      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-first-name`}>
          {t("openHouse.signup.name")}
          {requiredMark}
        </Label>
        <Input
          id={`${fieldId}-first-name`}
          name="firstName"
          autoComplete="given-name"
          required
          aria-invalid={fieldErrors.firstName}
          aria-describedby={fieldErrors.firstName ? `${fieldId}-first-name-error` : undefined}
          className={inputClass(fieldErrors.firstName)}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        {fieldErrors.firstName && (
          <p id={`${fieldId}-first-name-error`} className="text-sm font-medium text-destructive">
            {t("openHouse.signup.nameRequired")}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-email`}>
          {t("openHouse.signup.email")}
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
          className={inputClass(fieldErrors.email)}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {fieldErrors.email && (
          <p id={`${fieldId}-email-error`} className="text-sm font-medium text-destructive">
            {t("openHouse.signup.emailInvalid")}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-region`}>{t("openHouse.signup.region")}</Label>
        <select
          id={`${fieldId}-region`}
          name="region"
          value={region}
          onChange={(e) => setRegion(e.target.value as OpenHouseRegion | "")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
        >
          <option value="">{t("openHouse.signup.regionUnset")}</option>
          {OPEN_HOUSE_REGIONS.map((value) => (
            <option key={value} value={value}>
              {t(`openHouse.regions.${value}`)}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">{t("openHouse.signup.regionHelp")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-whatsapp`}>{t("openHouse.signup.whatsapp")}</Label>
        <Input
          id={`${fieldId}-whatsapp`}
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+977 98…"
          aria-describedby={`${fieldId}-whatsapp-help`}
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
        <p id={`${fieldId}-whatsapp-help`} className="text-sm text-muted-foreground">
          {t("openHouse.signup.whatsappHelp")}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id={`${fieldId}-for-org`}
            checked={forOrganisation}
            onCheckedChange={(checked) => setForOrganisation(checked === true)}
          />
          <Label htmlFor={`${fieldId}-for-org`} className="text-sm font-normal leading-6">
            {t("openHouse.signup.forOrganisation")}
          </Label>
        </div>
        {forOrganisation && (
          <Input
            id={`${fieldId}-organisation`}
            name="organisation"
            autoComplete="organization"
            aria-label={t("openHouse.signup.organisationName")}
            placeholder={t("openHouse.signup.organisationName")}
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
          />
        )}
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id={`${fieldId}-consent`}
          checked={consented}
          aria-invalid={fieldErrors.consent}
          onCheckedChange={(checked) => setConsented(checked === true)}
        />
        <Label htmlFor={`${fieldId}-consent`} className="text-sm font-normal leading-6">
          {/* Says plainly that this also subscribes them to the newsletter. One
              shared list is fine; doing it silently is not. */}
          {t("openHouse.signup.consent")}{" "}
          <Link to="/privacy" className="underline underline-offset-2">
            {t("openHouse.signup.consentPrivacyLink")}
          </Link>
          .
        </Label>
      </div>
      {fieldErrors.consent && (
        <p className="text-sm font-medium text-destructive">
          {t("openHouse.signup.consentRequired")}
        </p>
      )}

      {formError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full font-semibold" disabled={status === "submitting"}>
        {status === "submitting"
          ? t("openHouse.signup.submitting")
          : t("openHouse.signup.submit")}
      </Button>
    </form>
  );
}
