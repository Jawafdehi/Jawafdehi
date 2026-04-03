import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Phone, MessageCircle, HelpCircle, Loader2, AlertCircle, Plus, X, Instagram, Facebook, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { submitFeedback, JDSApiError, type FeedbackSubmission, type ContactMethod as ApiContactMethod, type FeedbackType, type ContactMethodType } from "@/services/jds-api";

const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

interface FeedbackFormProps {
    initialFeedbackType?: FeedbackType;
    initialSubject?: string;
    initialRelatedPage?: string;
    showFeedbackTypeSelector?: boolean;
    allowAttachment?: boolean;
    onSuccess?: () => void;
}

interface ContactMethod {
    type: ContactMethodType;
    value: string;
}

interface ValidationError {
    [key: string]: string[] | ValidationError;
}

export function FeedbackForm({
    initialFeedbackType = "general",
    initialSubject = "",
    initialRelatedPage = "",
    showFeedbackTypeSelector = true,
    allowAttachment = false,
    onSuccess,
}: FeedbackFormProps) {
    const { t } = useTranslation();

    const [formData, setFormData] = useState({
        feedbackType: initialFeedbackType,
        subject: initialSubject,
        description: "",
        relatedPage: initialRelatedPage,
        name: "",
    });

    const [contactMethods, setContactMethods] = useState<ContactMethod[]>([
        { type: "email", value: "" }
    ]);

    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentError, setAttachmentError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ValidationError | null>(null);
    const [generalError, setGeneralError] = useState<string | null>(null);

    const addContactMethod = () => {
        if (contactMethods.length >= 5) {
            toast({
                title: t("feedback.error.title"),
                description: "Maximum 5 contact methods allowed",
                variant: "destructive",
            });
            return;
        }
        setContactMethods([...contactMethods, { type: "phone", value: "" }]);
    };

    const removeContactMethod = (index: number) => {
        setContactMethods(contactMethods.filter((_, i) => i !== index));
    };

    const updateContactMethod = (index: number, field: "type" | "value", newValue: string) => {
        const updated = [...contactMethods];
        if (field === "type") {
            updated[index][field] = newValue as ContactMethodType;
        } else {
            updated[index][field] = newValue;
        }
        setContactMethods(updated);
    };

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
        setIsSubmitting(true);
        setValidationErrors(null);
        setGeneralError(null);

        try {
            const submission: FeedbackSubmission = {
                feedbackType: formData.feedbackType,
                subject: formData.subject,
                description: formData.description,
            };

            if (formData.relatedPage.trim()) {
                submission.relatedPage = formData.relatedPage;
            }

            const hasContactInfo = formData.name.trim() || contactMethods.some(m => m.value.trim());
            if (hasContactInfo) {
                submission.contactInfo = {};
                if (formData.name.trim()) {
                    submission.contactInfo.name = formData.name;
                }
                const filledContactMethods = contactMethods.filter(m => m.value.trim()) as ApiContactMethod[];
                if (filledContactMethods.length > 0) {
                    submission.contactInfo.contactMethods = filledContactMethods;
                }
            }

            if (attachment) {
                submission.attachment = attachment;
            }

            const response = await submitFeedback(submission);

            toast({
                title: t("feedback.submitted.title"),
                description: response.message || t("feedback.submitted.description"),
            });

            // Reset form
            setFormData({
                feedbackType: initialFeedbackType,
                subject: initialSubject,
                description: "",
                relatedPage: initialRelatedPage,
                name: "",
            });
            setContactMethods([{ type: "email", value: "" }]);
            setAttachment(null);
            setAttachmentError(null);
            if (fileInputRef.current) fileInputRef.current.value = "";

            if (onSuccess) onSuccess();

        } catch (error) {
            console.error('Feedback submission error:', error);
            if (error instanceof JDSApiError) {
                if (error.statusCode === 400 && error.validationErrors) {
                    setValidationErrors(error.validationErrors);
                } else {
                    setGeneralError(error.message);
                }
            } else {
                setGeneralError("Network error. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFieldError = (fieldName: string): string | null => {
        if (!validationErrors) return null;
        const error = validationErrors[fieldName];
        if (Array.isArray(error)) return error[0];
        return null;
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {generalError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{generalError}</AlertDescription>
                </Alert>
            )}

            {showFeedbackTypeSelector && (
                <div className="space-y-2">
                    <Label htmlFor="feedbackType">{t("feedback.feedbackType")} *</Label>
                    <Select
                        required
                        value={formData.feedbackType}
                        onValueChange={(value) => setFormData({ ...formData, feedbackType: value as FeedbackType })}
                    >
                        <SelectTrigger id="feedbackType" className={getFieldError("feedbackType") ? "border-destructive" : ""}>
                            <SelectValue placeholder={t("feedback.selectFeedbackType")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="bug">{t("feedback.bug")}</SelectItem>
                            <SelectItem value="feature">{t("feedback.feature")}</SelectItem>
                            <SelectItem value="usability">{t("feedback.usability")}</SelectItem>
                            <SelectItem value="content">{t("feedback.content")}</SelectItem>
                            <SelectItem value="general">{t("feedback.general")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="subject">{t("feedback.subject")} *</Label>
                <Input
                    id="subject"
                    placeholder={t("feedback.subjectPlaceholder")}
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className={getFieldError("subject") ? "border-destructive" : ""}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">{t("feedback.descriptionLabel")} *</Label>
                <Textarea
                    id="description"
                    placeholder={t("feedback.descriptionPlaceholder")}
                    required
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={getFieldError("description") ? "border-destructive" : ""}
                />
            </div>

            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold text-sm">{t("feedback.contactInfo")}</h3>
                <div className="space-y-2">
                    <Label htmlFor="name">{t("feedback.name")}</Label>
                    <Input
                        id="name"
                        placeholder={t("feedback.namePlaceholder")}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                {contactMethods.map((method, index) => (
                    <div key={index} className="flex gap-2">
                        <Select
                            value={method.type}
                            onValueChange={(value) => updateContactMethod(index, "type", value)}
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="phone">Phone</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="instagram">Instagram</SelectItem>
                                <SelectItem value="facebook">Facebook</SelectItem>
                                <SelectItem value="other">{t("feedback.otherContactMethod")}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            className="flex-1"
                            placeholder={method.type === "email" ? "email@example.com" : "+977..."}
                            value={method.value}
                            onChange={(e) => updateContactMethod(index, "value", e.target.value)}
                        />
                        {contactMethods.length > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeContactMethod(index)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addContactMethod}
                    className="w-full text-xs"
                    disabled={contactMethods.length >= 5}
                >
                    <Plus className="h-3 w-3 mr-2" />
                    {t("feedback.addContactMethod")}
                </Button>
            </div>

            {allowAttachment && (
                <div className="space-y-2">
                    <Label htmlFor="attachment">
                        {t("feedback.attachment")}{" "}
                        <span className="text-muted-foreground text-xs">({t("feedback.attachmentOptional")})</span>
                    </Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="attachment"
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="cursor-pointer"
                            accept="image/*,application/pdf,video/*,.doc,.docx,.xls,.xlsx"
                        />
                        {attachment && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setAttachment(null);
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    {attachment && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {attachment.name} ({(attachment.size / 1024).toFixed(1)} KB)
                        </p>
                    )}
                    {attachmentError && (
                        <p className="text-xs text-destructive">{attachmentError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{t("feedback.attachmentMaxSize")}</p>
                </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("feedback.submitFeedback")}
            </Button>
        </form>
    );
}
