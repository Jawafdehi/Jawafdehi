import { ArrowRight, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { PublicChatRelatedCase } from "@/types/public-chat";

interface PublicChatRelatedCasesProps {
  cases: PublicChatRelatedCase[];
}

function casePath(caseItem: PublicChatRelatedCase) {
  const url = caseItem.url || (caseItem.slug ? `/case/${caseItem.slug}` : "");
  if (url.startsWith("/")) {
    return url;
  }
  if (url) {
    return `/case/${url}`;
  }
  return `/case/${caseItem.id}`;
}

export function PublicChatRelatedCases({ cases }: PublicChatRelatedCasesProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (cases.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {t("guestChat.sections.relatedCases", { defaultValue: "Related cases" })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("guestChat.sections.relatedCasesDescription", {
            defaultValue: "Published cases that look relevant to this question.",
          })}
        </p>
      </div>

      <div className="space-y-3">
        {cases.map((caseItem) => (
          <article
            key={caseItem.id}
            className="rounded-[24px] border border-border/70 bg-background/80 p-4 transition-colors hover:border-primary/40"
          >
            <div className="space-y-4">
              <h3 className="text-base font-semibold leading-6 text-foreground">
                {caseItem.title}
              </h3>
              {caseItem.short_description ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  {caseItem.short_description}
                </p>
              ) : null}
              <Button
                variant="ghost"
                className="h-auto rounded-xl px-0 py-0 text-primary hover:bg-transparent hover:text-primary/80"
                onClick={() => navigate(casePath(caseItem))}
              >
                <FileText className="mr-2 h-4 w-4" />
                {t("guestCaseResults.openCase")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
