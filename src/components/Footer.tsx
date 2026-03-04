import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <span className="text-xl font-bold text-primary-foreground">जवा</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">{t("footer.title")}</span>
                <span className="text-xs text-muted-foreground">{t("footer.subtitle")}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              {t("footer.description")}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3">{t("footer.navigation")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link to="/cases" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("nav.cases")}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("nav.about")}
                </Link>
              </li>
              <li>
                <Link to="/report" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("report.title")}
                </Link>
              </li>
              <li>
                <Link to="/feedback" className="text-muted-foreground hover:text-primary transition-colors">
                  {t("feedback.title")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3">{t("footer.partners")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://LetsBuildNepal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Let's Build Nepal (LBN)
                </a>
              </li>
              <li>
                <a
                  href="https://NewNepal.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  NewNepal.org
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3">{t("footer.resources")}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://portal.jawafdehi.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.contributorPortal")}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/NewNepal-org/Jawafdehi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.githubRepo")}
                </a>
              </li>
              <li>
                <a
                  href="https://stats.uptimerobot.com/lwVRcc5suC"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("footer.siteStatus")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <div className="mb-4">
            <p className="text-xs text-muted-foreground italic max-w-4xl mx-auto text-center">
              {t("footer.disclaimer")}
            </p>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
};
