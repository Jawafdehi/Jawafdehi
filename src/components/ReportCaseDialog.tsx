import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, MessageCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { FeedbackForm } from "@/components/FeedbackForm";
import { JAWAFDEHI_WHATSAPP_NUMBER, JAWAFDEHI_EMAIL } from "@/config/constants";

interface ReportCaseDialogProps {
    caseId: string;
    caseTitle: string;
}

export function ReportCaseDialog({ caseId, caseTitle }: ReportCaseDialogProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="primary" className="gap-2 shadow-sm border-secondary-foreground/10">
                    <AlertCircle className="h-4 w-4" />
                    <span className="mt-1.5 font-semibold">
                        {t("caseDetail.reportInfo")}
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-[600px] sm:gap-4 sm:rounded-lg sm:p-6">
                <div className="flex min-h-0 flex-1 flex-col">
                    <DialogHeader className="shrink-0 px-4 pt-6 pb-4 text-left sm:px-0 sm:pt-0">
                        <DialogTitle>{t("caseDetail.reportInfo")}</DialogTitle>
                        <DialogDescription>
                            {t("caseDetail.reportInfoDesc")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-0 sm:pb-0">
                        <div className="py-4">
                            <FeedbackForm
                                initialFeedbackType="content"
                                initialSubject={`Correction/Addition Inquiry: ${caseTitle}`}
                                initialRelatedPage={`Case Detail: ${caseId} (${caseTitle})`}
                                showFeedbackTypeSelector={false}
                                allowAttachment={true}
                                onSuccess={() => setOpen(false)}
                            />
                        </div>

                        <div className="space-y-3 border-t pt-4">
                            <h4 className="text-sm font-semibold">{t("caseDetail.contact")}</h4>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span>{JAWAFDEHI_EMAIL}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <MessageCircle className="h-4 w-4" />
                                    <span>{t("caseDetail.whatsappLabel")}: {JAWAFDEHI_WHATSAPP_NUMBER}</span>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t("caseDetail.contactDesc")}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
