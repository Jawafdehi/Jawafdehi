import { GuestCaseResultCard } from "@/components/guest/GuestCaseResultCard";
import type { GuestCaseResultItem } from "@/types/guest-chat";

interface GuestCaseResultListProps {
  results: GuestCaseResultItem[];
}

export function GuestCaseResultList({
  results,
}: GuestCaseResultListProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No public cases matched this question yet.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Related public cases</p>
        <p className="text-xs text-muted-foreground">
          Open any case to continue on the public case page.
        </p>
      </div>
      <div className="space-y-3">
        {results.map((result) => (
          <GuestCaseResultCard key={result.caseItem.id} result={result} />
        ))}
      </div>
    </section>
  );
}
