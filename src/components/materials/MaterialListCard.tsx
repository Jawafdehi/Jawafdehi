import { Download, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MaterialSeries } from "@/data/material-series";
import { getMaterialSourceLinks } from "@/lib/material-links";
import {
  formatLedgerDate,
  pickLocalized,
  resolveMaterialDate,
} from "@/lib/materials-landing";
import { materialTail } from "@/services/datalake-api";
import { SITE_URL } from "@/utils/seo";

import type { Material } from "@/services/datalake-api";

const ACTION_BUTTON_CLASS = "h-9 w-28 justify-center px-3";
const ICON_ACTION_BUTTON_CLASS = "h-9 w-9 rounded-full p-0";

function materialName(material: Material, language: string): string {
  if (typeof material.name === "string") return material.name;
  return pickLocalized(material.name, language);
}

function extensionLabel(extension: string | null): string {
  return extension ? `.${extension.toUpperCase()}` : "File";
}

export function MaterialListCard({
  material,
  series,
}: Readonly<{
  material: Material;
  series: MaterialSeries;
}>) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const title =
    materialName(material, language) ||
    t("materialsLanding.recent.untitled", "Untitled document");
  const date = resolveMaterialDate({
    date: material.datePublished || material.dateCreated,
  });
  const dateLabel =
    formatLedgerDate(date, language) ||
    t("materialsLanding.series.undated", "Undated");
  const tail = materialTail(material["@id"]);
  const detailsPath = `/material/${tail}`;
  const links = getMaterialSourceLinks(material);

  return (
    <li>
      <Card className="grid gap-5 rounded-xl border-0 bg-surface p-5 shadow-elev-md transition-shadow hover:shadow-elev-lg md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0">
          <Link
            to={detailsPath}
            className="line-clamp-2 text-lg font-semibold leading-snug text-primary outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-accent"
          >
            {title}
          </Link>
          <p className="mt-1.5 text-sm italic text-muted-foreground">
            {pickLocalized(series.typeLabel, language)} · {dateLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {links.slice(0, 2).map((link) => (
            <Button
              asChild
              key={link.href}
              variant={link.isExternal ? "ghost" : "default"}
              size={link.isExternal ? "icon" : "sm"}
              className={link.isExternal ? ICON_ACTION_BUTTON_CLASS : ACTION_BUTTON_CLASS}
            >
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={
                  link.isExternal
                    ? t("materialsLanding.series.openSource", "Open original source")
                    : `Download ${extensionLabel(link.extension)}`
                }
              >
                {link.isExternal ? (
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  <>
                    <Download aria-hidden="true" className="h-3.5 w-3.5" />
                    {extensionLabel(link.extension)}
                  </>
                )}
              </a>
            </Button>
          ))}
          <ShareButton
            url={`${SITE_URL}${detailsPath}`}
            title={title}
            variant="ghost"
            size="icon"
            showLabel={false}
            className={ICON_ACTION_BUTTON_CLASS}
          />
        </div>
      </Card>
    </li>
  );
}
