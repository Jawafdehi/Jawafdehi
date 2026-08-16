import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, Clock, Loader2, Paperclip, Upload, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFeedbackSubmit } from "@/hooks/useFeedbackSubmit";
import { trackEvent } from "@/utils/analytics";
import type { ContactMethodType, FeedbackSubmission } from "@/services/jds-api";

const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Field budgets. The API caps `description` at 5000 characters and `subject`
// at 200; these limits keep the worst-case composed body inside that.
const LIMITS = {
    subject: 200,
    entityName: 200,
    position: 200,
    location: 200,
    description: 2500,
    sources: 1200,
} as const;

const ALLEGATION_TYPES = [
    "corruption",
    "misappropriation",
    "conflictOfInterest",
    "abuseOfPower",
    "breachOfTrust",
    "other",
] as const;

type AllegationType = (typeof ALLEGATION_TYPES)[number];

// Fixed English labels for the composed report body. The reporter writes in
// whichever language they like, but the moderation queue reads one shape
// regardless of which locale the form was filled in.
const BODY_LABELS: Record<string, string> = {
    entityType: "Subject of the report",
    entityName: "Name",
    position: "Position / role",
    allegationType: "Allegation type",
    incidentDate: "Date of incident",
    location: "Location",
    description: "What happened",
    sources: "Sources and references",
};

function composeBody(fields: Array<[keyof typeof BODY_LABELS, string]>): string {
    return fields
        .filter(([, value]) => value.trim() !== "")
        .map(([key, value]) => `${BODY_LABELS[key]}:\n${value.trim()}`)
        .join("\n\n");
}

export interface CaseReportFormProps {
    onSuccess?: () => void;
}

export function CaseReportForm({ onSuccess }: Readonly<CaseReportFormProps>) {
    const { t } = useTranslation();

    const [form, setForm] = useState({
        entityType: "individual",
        entityName: "",
        position: "",
        subject: "",
        allegationType: "corruption" as AllegationType,
        description: "",
        incidentDate: "",
        location: "",
        sources: "",
        contributorName: "",
        contactType: "email" as ContactMethodType,
        contactValue: "",
    });

    const [isAnonymous, setIsAnonymous] = useState(false);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentError, setAttachmentError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    // The API returns the row id, but the acknowledgement must not depend on
    // it — a response without one still means the report was accepted.
    const [reference, setReference] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        submit,
        isSubmitting,
        generalError,
        getFieldError,
        countdown,
        isRateLimited,
        formatCountdown,
    } = useFeedbackSubmit();

    const update = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setAttachmentError(null);
        if (file && file.size > ATTACHMENT_MAX_BYTES) {
            setAttachmentError(t("feedback.attachmentTooLarge"));
            setAttachment(null);
            e.target.value = "";
            return;
        }
        setAttachment(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const submission: FeedbackSubmission = {
            feedbackType: "case_report",
            subject: form.subject,
            description: composeBody([
                ["entityType", t(`report.${form.entityType}`, { lng: "en" })],
                ["entityName", form.entityName],
                ["position", form.position],
                ["allegationType", t(`report.${form.allegationType}`, { lng: "en" })],
                ["incidentDate", form.incidentDate],
                ["location", form.location],
                ["description", form.description],
                ["sources", form.sources],
            ]),
        };

        // An anonymous report carries no contact block at all, so there is
        // nothing to redact later if the record is ever exported.
        if (!isAnonymous) {
            const contactInfo: NonNullable<FeedbackSubmission["contactInfo"]> = {};
            if (form.contributorName.trim()) contactInfo.name = form.contributorName.trim();
            if (form.contactValue.trim()) {
                contactInfo.contactMethods = [{ type: form.contactType, value: form.contactValue.trim() }];
            }
            if (Object.keys(contactInfo).length > 0) submission.contactInfo = contactInfo;
        }

        if (attachment) submission.attachment = attachment;

        const response = await submit(submission);
        if (!response) return;

        trackEvent("allegation_submitted");
        setReference(typeof response.id === "number" ? response.id : null);
        setSubmitted(true);
        onSuccess?.();
    };

    if (submitted) {
        return (
            <div className="space-y-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-6">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <div className="space-y-2">
                        <p className="font-bold text-foreground">{t("report.submitted.title")}</p>
                        <p className="text-sm leading-6 text-foreground/70">{t("report.submitted.description")}</p>
                        {reference !== null && (
                            <p className="text-sm leading-6 text-foreground/70">
                                {t("report.submitted.reference", {
                                    reference: `#${reference}`,
                                    defaultValue: `Your reference number is #${reference}. Keep it if you want to follow up.`,
                                })}
                            </p>
                        )}
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        setSubmitted(false);
                        setReference(null);
                        setForm({
                            entityType: "individual",
                            entityName: "",
                            position: "",
                            subject: "",
                            allegationType: "corruption",
                            description: "",
                            incidentDate: "",
                            location: "",
                            sources: "",
                            contributorName: "",
                            contactType: "email",
                            contactValue: "",
                        });
                        setAttachment(null);
                        setIsAnonymous(false);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                >
                    {t("report.submitAnother", { defaultValue: "Submit another report" })}
                </Button>
            </div>
        );
    }

    const fieldClass = (field: string) =>
        getFieldError(field) ? "rounded-2xl border-destructive" : "rounded-2xl";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {generalError && (
                <Alert variant="destructive">
                    {isRateLimited ? <Clock className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertDescription>
                        {generalError}
                        {isRateLimited && (
                            <div className="mt-2 font-mono text-sm">
                                {t("feedback.error.rateLimitCountdown", {
                                    time: formatCountdown(countdown),
                                    defaultValue: `Time remaining: ${formatCountdown(countdown)}`,
                                })}
                            </div>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-2">
                <Label htmlFor="subject">{t("report.allegationTitle")} *</Label>
                <Input
                    id="subject"
                    required
                    maxLength={LIMITS.subject}
                    placeholder={t("report.allegationTitlePlaceholder")}
                    value={form.subject}
                    onChange={(e) => update({ subject: e.target.value })}
                    className={fieldClass("subject")}
                />
                {getFieldError("subject") && (
                    <p className="text-xs text-destructive">{getFieldError("subject")}</p>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="entityType">{t("report.entityType")}</Label>
                    <Select value={form.entityType} onValueChange={(value) => update({ entityType: value })}>
                        <SelectTrigger id="entityType" className="rounded-2xl">
                            <SelectValue placeholder={t("report.selectEntityType")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="individual">{t("report.individual")}</SelectItem>
                            <SelectItem value="organization">{t("report.organization")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="allegationType">{t("report.allegationType")}</Label>
                    <Select
                        value={form.allegationType}
                        onValueChange={(value) => update({ allegationType: value as AllegationType })}
                    >
                        <SelectTrigger id="allegationType" className="rounded-2xl">
                            <SelectValue placeholder={t("report.selectAllegationType")} />
                        </SelectTrigger>
                        <SelectContent>
                            {ALLEGATION_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {t(`report.${type}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="entityName">{t("report.entityName")}</Label>
                    <Input
                        id="entityName"
                        maxLength={LIMITS.entityName}
                        placeholder={t("report.entityNamePlaceholder")}
                        value={form.entityName}
                        onChange={(e) => update({ entityName: e.target.value })}
                        className="rounded-2xl"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="position">{t("report.position")}</Label>
                    <Input
                        id="position"
                        maxLength={LIMITS.position}
                        placeholder={t("report.positionPlaceholder")}
                        value={form.position}
                        onChange={(e) => update({ position: e.target.value })}
                        className="rounded-2xl"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="incidentDate">{t("report.incidentDate")}</Label>
                    <Input
                        id="incidentDate"
                        type="date"
                        value={form.incidentDate}
                        onChange={(e) => update({ incidentDate: e.target.value })}
                        className="rounded-2xl"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="location">{t("report.location")}</Label>
                    <Input
                        id="location"
                        maxLength={LIMITS.location}
                        placeholder={t("report.locationPlaceholder")}
                        value={form.location}
                        onChange={(e) => update({ location: e.target.value })}
                        className="rounded-2xl"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">{t("report.detailedDescription")} *</Label>
                <Textarea
                    id="description"
                    required
                    rows={7}
                    maxLength={LIMITS.description}
                    placeholder={t("report.detailedDescriptionPlaceholder")}
                    value={form.description}
                    onChange={(e) => update({ description: e.target.value })}
                    className={fieldClass("description")}
                />
                <p className="text-xs text-muted-foreground">
                    {form.description.length} / {LIMITS.description}
                </p>
                {getFieldError("description") && (
                    <p className="text-xs text-destructive">{getFieldError("description")}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="sources">{t("report.sources")}</Label>
                <Textarea
                    id="sources"
                    rows={4}
                    maxLength={LIMITS.sources}
                    placeholder={t("report.sourcesPlaceholder")}
                    value={form.sources}
                    onChange={(e) => update({ sources: e.target.value })}
                    className="rounded-2xl"
                />
            </div>

            <div className="space-y-2">
                <p className="text-sm font-medium leading-none">{t("report.evidence")}</p>
                <label
                    htmlFor="evidence"
                    className="block cursor-pointer rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 p-6 text-center transition-colors hover:border-primary/60 hover:bg-primary/[0.03] has-[:focus-visible]:border-primary has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
                >
                    <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    <p className="mb-1 text-sm text-muted-foreground">{t("report.evidenceUpload")}</p>
                    <p className="text-xs text-muted-foreground">{t("report.evidenceFormat")}</p>
                    {/* A plain <input>, not <Input>: this field is visually
                        hidden and the <label> above is the affordance, so it
                        needs no input styling — and `Input`'s base string forces
                        `flex h-10 w-full`, which tailwind-merge keeps alongside
                        `sr-only` (different conflict groups) and Tailwind emits
                        after it (.sr-only is rule 169, .h-10 is 324, .w-full is
                        480). Equal specificity, so the later rules won: the field
                        stayed absolutely positioned at 360x40, clipped but laid
                        out, and an abspos box still extends scrollWidth. That was
                        the whole 65px of horizontal overflow on /report. */}
                    <input
                        id="evidence"
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="sr-only"
                        accept="image/*,application/pdf,video/*,.doc,.docx,.xls,.xlsx"
                    />
                </label>
                {attachment && (
                    <div className="flex items-center gap-2">
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="h-3 w-3" aria-hidden="true" />
                            {attachment.name} ({(attachment.size / 1024).toFixed(1)} KB)
                        </p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("feedback.removeAttachment", { defaultValue: "Remove attachment" })}
                            onClick={() => {
                                setAttachment(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
                {attachmentError && <p className="text-xs text-destructive">{attachmentError}</p>}
            </div>

            <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/35 p-5">
                <h3 className="text-sm font-semibold text-foreground">{t("report.contributorInfo")}</h3>
                <p className="text-xs text-muted-foreground">{t("report.contributorInfoDesc")}</p>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="anonymous"
                        checked={isAnonymous}
                        onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                    />
                    <Label htmlFor="anonymous" className="cursor-pointer">
                        {t("report.submitAnonymously")}
                    </Label>
                </div>

                {!isAnonymous && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="contributorName">{t("report.yourName")}</Label>
                            <Input
                                id="contributorName"
                                placeholder={t("report.yourNamePlaceholder")}
                                value={form.contributorName}
                                onChange={(e) => update({ contributorName: e.target.value })}
                                className="rounded-2xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contactValue">{t("report.howToReachYou", { defaultValue: "How we can reach you" })}</Label>
                            <div className="flex gap-2">
                                <Select
                                    value={form.contactType}
                                    onValueChange={(value) => update({ contactType: value as ContactMethodType })}
                                >
                                    <SelectTrigger
                                        className="w-[130px] rounded-2xl"
                                        aria-label={t("report.howToReachYou", { defaultValue: "How we can reach you" })}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="email">{t("report.yourEmail")}</SelectItem>
                                        <SelectItem value="phone">{t("report.phone")}</SelectItem>
                                        <SelectItem value="whatsapp">{t("report.whatsapp")}</SelectItem>
                                        <SelectItem value="other">{t("report.otherContactMethod")}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    id="contactValue"
                                    className="flex-1 rounded-2xl"
                                    placeholder={
                                        form.contactType === "email"
                                            ? t("report.yourEmailPlaceholder")
                                            : t("report.phonePlaceholder")
                                    }
                                    value={form.contactValue}
                                    onChange={(e) => update({ contactValue: e.target.value })}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/[0.07] p-5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <div className="text-sm leading-6 text-foreground/70">
                    <p className="mb-1 font-bold text-accent">{t("report.importantNotice")}</p>
                    <p>{t("report.importantNoticeText")}</p>
                </div>
            </div>

            <div className="flex items-start space-x-2">
                <Checkbox id="terms" required />
                <Label htmlFor="terms" className="cursor-pointer text-sm">
                    {t("report.termsAgreement")}
                </Label>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || isRateLimited}>
                {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isRateLimited ? (
                    <Clock className="mr-2 h-4 w-4" />
                ) : null}
                {isRateLimited
                    ? t("feedback.rateLimitedButton", {
                          time: formatCountdown(countdown),
                          defaultValue: `Wait ${formatCountdown(countdown)}`,
                      })
                    : t("report.submitReport")}
            </Button>
        </form>
    );
}
