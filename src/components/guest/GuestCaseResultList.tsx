import { useTranslation } from "react-i18next";
import { GuestCaseResultCard } from "@/components/guest/GuestCaseResultCard";
import type { GuestCaseResultItem } from "@/types/guest-chat";

interface GuestCaseResultListProps {
  results: GuestCaseResultItem[];
}

export function GuestCaseResultList({
  results,
}: GuestCaseResultListProps) {
  const { t } = useTranslation();

  const groupedResults = results.reduce<
    Array<{ description?: string; items: GuestCaseResultItem[] }>
  >((groups, result) => {
    const existingGroup = result.exampleDescription
      ? groups.find((group) => group.description === result.exampleDescription)
      : undefined;

    if (existingGroup) {
      existingGroup.items.push(result);
      return groups;
    }

    groups.push({
      description: result.exampleDescription,
      items: [result],
    });

    return groups;
  }, []);

  const formatSharedDescription = (description: string, count: number) => {
    if (count < 2) {
      return description;
    }

    if (description.startsWith("Here, ")) {
      return description.replace(/^Here, /, "In these cases, ");
    }

    if (description.startsWith("यहाँ ")) {
      return description.replace(/^यहाँ /, "यी मुद्दाहरूमा ");
    }

    return description;
  };

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {t("guestCaseResults.empty")}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{t("guestCaseResults.title")}</p>
        <p className="text-xs text-muted-foreground">
          {t("guestCaseResults.description")}
        </p>
      </div>
      <div className="space-y-3">
        {groupedResults.map((group, groupIndex) => (
          <div key={`${group.description ?? "group"}-${groupIndex}`} className="space-y-3">
            {group.items.map((result) => (
              <GuestCaseResultCard key={result.caseItem.id} result={result} />
            ))}
            {group.description ? (
              <p className="px-2 text-sm leading-7 text-muted-foreground">
                {formatSharedDescription(group.description, group.items.length)}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
