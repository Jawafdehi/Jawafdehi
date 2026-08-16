import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { User } from "lucide-react";
import type { CaseAuthorCredit } from "@/types/jds";
import { cn } from "@/lib/utils";

interface AuthorCardProps {
  author: CaseAuthorCredit;
  className?: string;
}

/** The author's name in the active language, falling back to the other one.
 *
 * A profile with only an English name must still render on the Nepali site —
 * showing a blank byline would be worse than showing the name in Latin script.
 */
function authorName(author: CaseAuthorCredit, language: string): string {
  if (language.startsWith("ne")) {
    return author.name_ne?.trim() || author.display_name;
  }
  return author.display_name;
}

// One credited author on a case page: photo, name and their one-line title.
//
// Links to /author/<slug> only when `has_public_page` is set. A profile row is
// created automatically the first time someone is credited and starts empty, so
// linking unconditionally would send readers to a blank page — the card renders
// as plain text in that case.
export function AuthorCard({ author, className }: Readonly<AuthorCardProps>) {
  const { i18n } = useTranslation();
  const name = authorName(author, i18n.language);
  const photo = author.photo_url?.trim();
  const title = author.title?.trim();
  const linkable = author.has_public_page && Boolean(author.slug);

  const body = (
    <>
      {photo ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <User className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-primary">{name}</span>
        {title && (
          <span className="block truncate text-xs text-muted-foreground">{title}</span>
        )}
      </span>
    </>
  );

  const shared = cn(
    "flex items-center gap-3 rounded-md border border-border/70 bg-background px-3 py-2",
    className,
  );

  if (!linkable) {
    return (
      <div className={shared} data-testid="author-card">
        {body}
      </div>
    );
  }

  return (
    <Link
      to={`/author/${author.slug}`}
      className={cn(shared, "transition-colors hover:border-primary/40 hover:bg-primary/5")}
      data-testid="author-card"
    >
      {body}
    </Link>
  );
}
