import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
    submitFeedback,
    JDSApiError,
    type FeedbackResponse,
    type FeedbackSubmission,
} from "@/services/jds-api";

export interface ValidationError {
    [key: string]: string[] | ValidationError;
}

// Shared submit machinery for the two public forms that post to /api/feedback/:
// the general feedback form and the corruption-case report form. Both need the
// same 429 countdown and the same field-level error mapping, so it lives here
// rather than being written twice.
export function useFeedbackSubmit() {
    const { t } = useTranslation();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ValidationError | null>(null);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
    const [countdown, setCountdown] = useState<number>(0);

    useEffect(() => {
        if (!rateLimitedUntil) return;

        const updateCountdown = () => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((rateLimitedUntil - now) / 1000));
            setCountdown(remaining);

            if (remaining === 0) {
                setRateLimitedUntil(null);
                setGeneralError(null);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [rateLimitedUntil]);

    const describeRateLimit = useCallback(
        (retryAfter: number) => {
            const minutes = Math.floor(retryAfter / 60);
            const seconds = retryAfter % 60;
            const minuteStr = `${minutes} minute${minutes !== 1 ? "s" : ""}`;
            const secondStr = `${seconds} second${seconds !== 1 ? "s" : ""}`;
            const builtTime =
                minutes > 0
                    ? `${minuteStr}${seconds > 0 ? ` and ${secondStr}` : ""}`
                    : secondStr;
            const timeString =
                minutes > 0
                    ? t("feedback.error.rateLimitWaitTime", { value: builtTime, defaultValue: builtTime })
                    : t("feedback.error.rateLimitWaitTimeSeconds", { value: builtTime, defaultValue: builtTime });

            return t("feedback.error.rateLimitMessage", {
                time: timeString,
                defaultValue: `Too many submissions. Please wait ${timeString} before trying again.`,
            });
        },
        [t],
    );

    // Posts the submission and returns the created record, or null if it failed.
    // Errors land in generalError / validationErrors rather than throwing, so
    // callers only need to branch on the return value.
    const submit = useCallback(
        async (submission: FeedbackSubmission): Promise<FeedbackResponse | null> => {
            setIsSubmitting(true);
            setValidationErrors(null);
            setGeneralError(null);

            try {
                return await submitFeedback(submission);
            } catch (error) {
                console.error("Feedback submission error:", error);
                if (error instanceof JDSApiError) {
                    if (error.statusCode === 429 && error.retryAfter) {
                        setRateLimitedUntil(Date.now() + error.retryAfter * 1000);
                        setGeneralError(describeRateLimit(error.retryAfter));
                    } else if (error.statusCode === 400 && error.validationErrors) {
                        setValidationErrors(error.validationErrors);
                    } else {
                        setGeneralError(error.message);
                    }
                } else {
                    setGeneralError("Network error. Please try again.");
                }
                return null;
            } finally {
                setIsSubmitting(false);
            }
        },
        [describeRateLimit],
    );

    const getFieldError = useCallback(
        (fieldName: string): string | null => {
            if (!validationErrors) return null;
            const error = validationErrors[fieldName];
            if (Array.isArray(error)) return error[0];
            return null;
        },
        [validationErrors],
    );

    const isRateLimited = rateLimitedUntil !== null && countdown > 0;

    const formatCountdown = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) {
            return `${mins}:${secs.toString().padStart(2, "0")}`;
        }
        return `${secs}s`;
    };

    return {
        submit,
        isSubmitting,
        generalError,
        getFieldError,
        countdown,
        isRateLimited,
        formatCountdown,
    };
}
