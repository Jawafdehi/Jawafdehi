import { useNavigate } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { GuestCaseResultItem } from "@/types/guest-chat";

interface GuestCaseResultCardProps {
  result: GuestCaseResultItem;
}

export function GuestCaseResultCard({
  result,
}: GuestCaseResultCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <article className="rounded-[24px] border border-border/70 bg-background/80 p-4 transition-colors hover:border-primary/40">
      <div className="space-y-3">
        <div className="space-y-2">
          <h3 className="text-base font-semibold leading-6 text-foreground">{result.caseItem.title}</h3>
        </div>
        <p className="line-clamp-4 text-sm text-muted-foreground">
          {result.caseItem.key_allegations?.[0] ||
            result.caseItem.description.replace(/<[^>]*>/g, " ")}
        </p>
      </div>
      <div className="mt-4">
        <Button
          variant="ghost"
          className="h-auto rounded-xl px-0 py-0 text-primary hover:bg-transparent hover:text-primary/80"
          onClick={() => navigate(`/case/${result.caseItem.id}`)}
        >
          <FileText className="mr-2 h-4 w-4" />
          {t("guestCaseResults.openCase")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
