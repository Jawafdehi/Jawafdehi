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
                <Button variant="default" className="gap-2 shadow-sm border-secondary-foreground/10">
                    <AlertCircle className="h-4 w-4" />
                    <span className="mt-1.5 font-semibold">
                        {t("caseDetail.reportInfo")}
                    </span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("caseDetail.reportInfo")}</DialogTitle>
                    <DialogDescription>
                        {t("caseDetail.reportInfoDesc")}
                    </DialogDescription>
                </DialogHeader>

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

                <div className="pt-4 border-t space-y-3">
                    <h4 className="font-semibold text-sm">{t("caseDetail.contact")}</h4>
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
            </DialogContent>
        </Dialog>
    );
}
