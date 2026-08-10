import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  AlertCircle,
  FilePlus2,
  Mail,
  Upload,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/SocialIcons";
import { trackEvent } from "@/utils/analytics";

export function ReportAllegationDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Check feature flag for case submission form
  const isFormEnabled = import.meta.env.VITE_ENABLE_CASE_SUBMISSION_FORM === 'true';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('allegation_submitted');
    toast({
      title: t("report.submitted.title"),
      description: t("report.submitted.description"),
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="mt-8 bg-white font-semibold text-primary shadow-lg shadow-black/10 hover:bg-white/90 dark:bg-white dark:text-primary-surface dark:hover:bg-white/90"
        >
          <FilePlus2 className="h-5 w-5" aria-hidden="true" />
          {t("report.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent
        overlayClassName="bg-black/65 backdrop-blur-[2px]"
        className="flex h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.25rem)] max-w-[calc(100vw-1.25rem)] flex-col gap-0 overflow-hidden rounded-[2rem] border-0 bg-background p-0 shadow-2xl shadow-black/25 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-3xl sm:rounded-[2rem] [&>button]:right-5 [&>button]:top-5 [&>button]:flex [&>button]:h-9 [&>button]:w-9 [&>button]:items-center [&>button]:justify-center [&>button]:!rounded-full [&>button]:bg-primary-surface/[0.06] [&>button]:text-primary [&>button]:opacity-100 [&>button]:transition-colors [&>button:hover]:bg-accent/10 [&>button:hover]:text-accent"
      >
        <DialogHeader className="shrink-0 bg-primary-surface/[0.035] px-6 pb-5 pt-7 text-left sm:px-8 sm:pb-6 sm:pt-8">
          <DialogTitle className="pr-10 text-2xl font-extrabold tracking-normal text-primary sm:text-3xl">
            {t("report.title")}
          </DialogTitle>
          <DialogDescription className="max-w-2xl text-sm leading-6 text-foreground/65 sm:text-base sm:leading-7">
            {t("report.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
              {isFormEnabled ? (
                // Original Form
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Entity Type */}
                  <div className="space-y-2">
                    <Label htmlFor="entityType">{t("report.entityType")}</Label>
                    <Select required>
                      <SelectTrigger id="entityType">
                        <SelectValue placeholder={t("report.selectEntityType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">{t("report.individual")}</SelectItem>
                        <SelectItem value="organization">{t("report.organization")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Entity Name */}
                  <div className="space-y-2">
                    <Label htmlFor="entityName">{t("report.entityName")}</Label>
                    <Input
                      id="entityName"
                      placeholder={t("report.entityNamePlaceholder")}
                      required
                    />
                  </div>

                  {/* Position/Role */}
                  <div className="space-y-2">
                    <Label htmlFor="position">{t("report.position")}</Label>
                    <Input
                      id="position"
                      placeholder={t("report.positionPlaceholder")}
                      required
                    />
                  </div>

                  {/* Allegation Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">{t("report.allegationTitle")}</Label>
                    <Input
                      id="title"
                      placeholder={t("report.allegationTitlePlaceholder")}
                      required
                    />
                  </div>

                  {/* Allegation Type */}
                  <div className="space-y-2">
                    <Label htmlFor="type">{t("report.allegationType")}</Label>
                    <Select required>
                      <SelectTrigger id="type">
                        <SelectValue placeholder={t("report.selectAllegationType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corruption">{t("report.corruption")}</SelectItem>
                        <SelectItem value="misappropriation">{t("report.misappropriation")}</SelectItem>
                        <SelectItem value="conflict-of-interest">{t("report.conflictOfInterest")}</SelectItem>
                        <SelectItem value="abuse-of-power">{t("report.abuseOfPower")}</SelectItem>
                        <SelectItem value="breach-of-trust">{t("report.breachOfTrust")}</SelectItem>
                        <SelectItem value="other">{t("report.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">{t("report.detailedDescription")}</Label>
                    <Textarea
                      id="description"
                      placeholder={t("report.detailedDescriptionPlaceholder")}
                      rows={6}
                      required
                    />
                  </div>

                  {/* Date of Incident */}
                  <div className="space-y-2">
                    <Label htmlFor="incidentDate">{t("report.incidentDate")}</Label>
                    <Input
                      id="incidentDate"
                      type="date"
                      required
                    />
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location">{t("report.location")}</Label>
                    <Input
                      id="location"
                      placeholder={t("report.locationPlaceholder")}
                      required
                    />
                  </div>

                  {/* Sources */}
                  <div className="space-y-2">
                    <Label htmlFor="sources">{t("report.sources")}</Label>
                    <Textarea
                      id="sources"
                      placeholder={t("report.sourcesPlaceholder")}
                      rows={4}
                    />
                  </div>

                  {/* Evidence Upload */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-none">
                      {t("report.evidence")}
                    </p>
                    <label
                      htmlFor="evidence"
                      className="block cursor-pointer rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 p-6 text-center transition-colors hover:border-primary/60 hover:bg-primary-surface/[0.03] has-[:focus-visible]:border-primary has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-1">{t("report.evidenceUpload")}</p>
                      <p className="text-xs text-muted-foreground">{t("report.evidenceFormat")}</p>
                      <Input
                        id="evidence"
                        type="file"
                        className="sr-only"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </label>
                  </div>

                  {/* Contributor Information */}
                  <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/35 p-5">
                    <h3 className="font-semibold text-foreground text-sm">{t("report.contributorInfo")}</h3>
                    <p className="text-xs text-muted-foreground">{t("report.contributorInfoDesc")}</p>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="anonymous"
                        checked={isAnonymous}
                        onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
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
                            required={!isAnonymous}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="contributorEmail">{t("report.yourEmail")}</Label>
                          <Input
                            id="contributorEmail"
                            type="email"
                            placeholder={t("report.yourEmailPlaceholder")}
                            required={!isAnonymous}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Disclaimer */}
                  <div className="flex items-start gap-3 rounded-2xl border border-warning/20 bg-warning/[0.07] p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
                    <div className="text-sm leading-6 text-foreground/65">
                      <p className="mb-1 font-bold text-foreground">{t("report.importantNotice")}</p>
                      <p>{t("report.importantNoticeText")}</p>
                    </div>
                  </div>

                  {/* Terms Agreement */}
                  <div className="flex items-start space-x-2">
                    <Checkbox id="terms" required />
                    <Label htmlFor="terms" className="text-sm cursor-pointer">
                      {t("report.termsAgreement")}
                    </Label>
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="submit" size="lg" className="flex-1">
                      {t("report.submitReport")}
                    </Button>
                    <Button type="button" variant="outline" size="lg" className="flex-1">
                      {t("report.saveDraft")}
                    </Button>
                  </div>
                </form>
              ) : (
                // Template Download Section
                <div className="space-y-7">
                  <div className="space-y-5">
                    <p className="text-base leading-7 text-foreground/70">
                      {t("report.templateDownload.description")}
                    </p>

                    <div className="space-y-4 rounded-2xl bg-primary-surface/[0.045] p-5">
                      <p className="text-sm font-medium leading-6 text-foreground/80">
                        {t("report.templateDownload.instructions")}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <a
                          href="mailto:report@jawafdehi.org"
                          className="group flex min-h-11 items-center gap-3 rounded-lg text-sm font-semibold text-primary outline-none transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-surface text-primary-foreground transition-colors group-hover:bg-accent">
                            <Mail className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="truncate">
                            {t("report.templateDownload.email")}
                          </span>
                        </a>
                        <a
                          href="https://wa.me/9779768630501"
                          target="_blank"
                          rel="noreferrer"
                          className="group flex min-h-11 items-center gap-3 rounded-lg text-sm font-semibold text-primary outline-none transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition-colors group-hover:bg-[#1fbd59]">
                            <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span>{t("report.templateDownload.whatsapp")}</span>
                        </a>
                      </div>
                      <p className="rounded-lg bg-background/80 px-3 py-2.5 text-sm font-semibold leading-5 text-primary shadow-sm">
                        {t("report.templateDownload.emailSubject")}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 rounded-2xl bg-muted/45 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-sm font-medium text-foreground/75">
                        {t("report.templateDownload.availableFormats")}
                      </h3>

                      <div className="flex flex-wrap gap-2">
                        <a
                          href="/case-entry-template/case-entry-template.docx"
                          download
                          className="inline-flex h-9 min-w-20 items-center justify-center rounded-md bg-primary-surface px-3 text-xs font-bold tracking-wide text-primary-foreground shadow-sm transition-colors hover:bg-primary-surface/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <span>{t("report.templateDownload.downloadDocx")}</span>
                        </a>

                        <a
                          href="/case-entry-template/case-entry-template.md"
                          download
                          className="inline-flex h-9 min-w-20 items-center justify-center rounded-md bg-accent px-3 text-xs font-bold tracking-wide text-accent-foreground shadow-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <span>{t("report.templateDownload.downloadMd")}</span>
                        </a>
                      </div>
                    </div>

                    {/* Important Notice */}
                    <div className="flex items-start gap-3 rounded-2xl bg-accent/[0.07] p-5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                        <AlertCircle className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="text-sm leading-6 text-foreground/70">
                        <p className="mb-1 font-bold text-accent">{t("report.importantNotice")}</p>
                        <p>{t("report.importantNoticeText")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
