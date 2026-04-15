import { useNavigate } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GuestCaseResultItem } from "@/types/guest-chat";

interface GuestCaseResultCardProps {
  result: GuestCaseResultItem;
}

export function GuestCaseResultCard({
  result,
}: GuestCaseResultCardProps) {
  const navigate = useNavigate();

  return (
    <article className="rounded-[24px] border border-border/70 bg-background/80 p-4 transition-colors hover:border-primary/40">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full">{result.caseItem.case_type}</Badge>
          <Badge variant="secondary" className="rounded-full">{result.caseItem.state}</Badge>
          {result.caseItem.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="rounded-full text-[11px]">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-semibold leading-6 text-foreground">{result.caseItem.title}</h3>
          <p className="text-sm text-muted-foreground">{result.matchReason}</p>
        </div>
        {result.matchedEntityNames.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.matchedEntityNames.slice(0, 3).map((name) => (
              <Badge key={name} variant="secondary" className="rounded-full">
                {name}
              </Badge>
            ))}
          </div>
        ) : null}
        <p className="line-clamp-4 text-sm text-muted-foreground">
          {result.caseItem.short_description ||
            result.caseItem.key_allegations?.[0] ||
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
          Open case
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}
