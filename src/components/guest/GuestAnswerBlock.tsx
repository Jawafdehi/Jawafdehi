import { useTranslation } from "react-i18next";

interface GuestAnswerBlockProps {
  answer: string;
  resultCount: number;
}

export function GuestAnswerBlock({
  answer,
  resultCount,
}: GuestAnswerBlockProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <img
          src="/assets/bot.svg"
          alt={t("guestCommon.assistantAlt")}
          className="h-8 w-8"
        />
      </div>
      <div className="min-w-0 flex-1 rounded-[28px] border border-border/70 bg-card p-5 shadow-sm">
        <p className="whitespace-pre-line text-sm leading-7 text-foreground">{answer}</p>
        {resultCount > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("guestAnswerBlock.resultSummary", { count: resultCount })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
