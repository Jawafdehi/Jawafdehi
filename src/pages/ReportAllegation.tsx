import { Footer } from "@/components/Footer";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, Upload, Download, FileText, Mail } from "lucide-react";

export default function ReportAllegation() {
  const { t } = useTranslation();
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Check feature flag for case submission form
  const isFormEnabled = import.meta.env.VITE_ENABLE_CASE_SUBMISSION_FORM === 'true';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: t("report.submitted.title"),
      description: t("report.submitted.description"),
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Report Allegation | Jawafdehi</title>
        <meta name="description" content={t("report.description")} />
      </Helmet>
      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{t("report.title")}</CardTitle>
              <CardDescription className="text-base">
                {t("report.description")}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!isFormEnabled ? (
                // Template Download Section
                <div className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      {t("report.templateDownload.description")}
                    </p>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <p className="text-sm font-medium">{t("report.templateDownload.instructions")}</p>
                      <div className="flex items-center gap-2 p-3 bg-background rounded border">
                        <Mail className="h-4 w-4 text-primary" />
                        <a
                          href="mailto:cases@jawafdehi.org"
                          className="text-primary hover:underline font-medium"
                        >
                          {t("report.templateDownload.email")}
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("report.templateDownload.emailSubject")}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-foreground">
                        {t("report.templateDownload.availableFormats")}
                      </h3>

                      <div className="grid gap-3">
                        {/* DOCX Download */}
                        <a
                          href="/case-entry-template/case-entry-template.docx"
                          download
                          className="flex items-center justify-between p-4 border rounded-lg hover:border-primary hover:bg-accent transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded">
                              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium group-hover:text-primary transition-colors">
                                {t("report.templateDownload.downloadDocx")}
                              </p>
                              <p className="text-xs text-muted-foreground">Microsoft Word format</p>
                            </div>
                          </div>
                          <Download className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </a>

                        {/* Markdown Download */}
                        <a
                          href="/case-entry-template/case-entry-template.md"
                          download
                          className="flex items-center justify-between p-4 border rounded-lg hover:border-primary hover:bg-accent transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-950 rounded">
                              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="font-medium group-hover:text-primary transition-colors">
                                {t("report.templateDownload.downloadMd")}
                              </p>
                              <p className="text-xs text-muted-foreground">Plain text format</p>
                            </div>
                          </div>
                          <Download className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </a>
                      </div>
                    </div>

                    {/* Important Notice */}
                    <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-semibold text-foreground mb-1">{t("report.importantNotice")}</p>
                        <p>{t("report.importantNoticeText")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
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
                    <Label htmlFor="evidence">{t("report.evidence")}</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-1">{t("report.evidenceUpload")}</p>
                      <p className="text-xs text-muted-foreground">{t("report.evidenceFormat")}</p>
                      <Input
                        id="evidence"
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </div>
                  </div>

                  {/* Contributor Information */}
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
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
                  <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground mb-1">{t("report.importantNotice")}</p>
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
                  <div className="flex gap-4">
                    <Button type="submit" className="flex-1">
                      {t("report.submitReport")}
                    </Button>
                    <Button type="button" variant="outline" className="flex-1">
                      {t("report.saveDraft")}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />


    </div>
  );
}
