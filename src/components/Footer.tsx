import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">

          {/* Brand + mission — spans 2 cols on desktop */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img src="/favicon.png" alt="Jawafdehi Logo" className="h-9 w-9" />
              <span className="text-base font-bold text-foreground">Jawafdehi.org</span>
            </Link>
            <p className="text-sm font-medium text-foreground mb-1 italic">
              Accountability has no Expiry.
            </p>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-5">
              Nepal's permanent public archive of CIAA corruption cases — free forever, built by Nepali volunteers.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>🇳🇵 Built by Nepali</span>
              <span>·</span>
              <span>🔓 Public Domain</span>
              <span>·</span>
              <span>⚙️ Open Source</span>
            </div>
          </div>

          {/* Navigation — 2 sub-columns */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/cases" className="text-muted-foreground hover:text-primary transition-colors">
                    Cases
                  </Link>
                </li>
                <li>
                  <Link to="/our-process" className="text-muted-foreground hover:text-primary transition-colors">
                    Our Process
                  </Link>
                </li>
                <li>
                  <Link to="/commitment" className="text-muted-foreground hover:text-primary transition-colors">
                    Our Commitment
                  </Link>
                </li>
                <li>
                  <Link to="/volunteer" className="text-muted-foreground hover:text-primary transition-colors">
                    Volunteer
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">About</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                    About Jawafdehi
                  </Link>
                </li>
                <li>
                  <Link to="/team" className="text-muted-foreground hover:text-primary transition-colors">
                    Our Team
                  </Link>
                </li>
                <li>
                  <Link to="/products" className="text-muted-foreground hover:text-primary transition-colors">
                    Our Products
                  </Link>
                </li>
                <li>
                  <Link to="/feedback" className="text-muted-foreground hover:text-primary transition-colors">
                    Feedback
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://portal.jawafdehi.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Contributor Portal
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Jawafdehi/Jawafdehi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href="https://stats.uptimerobot.com/lwVRcc5suC"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Site Status
                </a>
              </li>
              <li className="pt-2 border-t border-border mt-2">
                <a
                  href="https://LetsBuildNepal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Let's Build Nepal (LBN)
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground italic text-center max-w-4xl mx-auto mb-3">
            {t("footer.disclaimer")}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Jawafdehi. All data is in the public domain.
          </p>
        </div>
      </div>
    </footer>
  );
};
