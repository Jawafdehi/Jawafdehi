import { useTranslation } from "react-i18next";

/** A solid crimson "New" label. White on --accent passes WCAG AA at this size,
 * on navy and on paper alike. */
export function NewBadge() {
  const { t } = useTranslation();
  return (
    <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
      {t("home.whatsNew.badge")}
    </span>
  );
}
