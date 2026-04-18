import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaFacebook, FaYoutube, FaLinkedin, FaWhatsapp } from "react-icons/fa";
import { SiLinktree } from "react-icons/si";
import { JAWAFDEHI_SOCIALS } from "@/config/constants";

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-white/10 bg-navy">
      <div className="container mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">

          {/* Brand + mission — spans 2 cols on desktop */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img src="/logo.png" alt="Jawafdehi Logo" className="h-12 w-12" />
              <span className="text-base font-bold text-white font-heading">Jawafdehi.org</span>
            </Link>
            <p className="text-sm font-semibold text-primary mb-1 italic">
              Accountability has no Expiry.
            </p>
            <p className="text-sm text-white/60 max-w-sm leading-relaxed mb-5">
              Nepal's permanent public archive of CIAA corruption cases — free forever, built by Nepali volunteers.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-white/50">
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
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3 font-heading">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/cases" className="text-white/70 hover:text-primary transition-colors">
                    Cases
                  </Link>
                </li>
                <li>
                  <Link to="/our-process" className="text-white/70 hover:text-primary transition-colors">
                    Our Process
                  </Link>
                </li>
                <li>
                  <Link to="/commitment" className="text-white/70 hover:text-primary transition-colors">
                    Our Commitment
                  </Link>
                </li>
                <li>
                  <Link to="/volunteer" className="text-white/70 hover:text-primary transition-colors">
                    Volunteer
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3 font-heading">About</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/about" className="text-white/70 hover:text-primary transition-colors">
                    About Jawafdehi
                  </Link>
                </li>
                <li>
                  <Link to="/team" className="text-white/70 hover:text-primary transition-colors">
                    Our Team
                  </Link>
                </li>
                <li>
                  <Link to="/products" className="text-white/70 hover:text-primary transition-colors">
                    Our Products
                  </Link>
                </li>
                <li>
                  <Link to="/feedback" className="text-white/70 hover:text-primary transition-colors">
                    Feedback
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3 font-heading">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://portal.jawafdehi.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-primary transition-colors"
                >
                  Contributor Portal
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Jawafdehi/Jawafdehi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-primary transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href="https://stats.uptimerobot.com/lwVRcc5suC"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-primary transition-colors"
                >
                  Site Status
                </a>
              </li>
              <li className="pt-2 border-t border-white/10 mt-2">
                <a
                  href="https://LetsBuildNepal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-primary transition-colors"
                >
                  Let's Build Nepal (LBN)
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/10">
          {/* Social links */}
          <div className="flex justify-center gap-5 mb-4">
            <a
              href={JAWAFDEHI_SOCIALS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-primary transition-colors"
              aria-label={t("footer.social.facebook")}
            >
              <FaFacebook className="h-5 w-5" />
            </a>
            <a
              href={JAWAFDEHI_SOCIALS.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-primary transition-colors"
              aria-label={t("footer.social.youtube")}
            >
              <FaYoutube className="h-5 w-5" />
            </a>
            <a
              href={JAWAFDEHI_SOCIALS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-primary transition-colors"
              aria-label={t("footer.social.linkedin")}
            >
              <FaLinkedin className="h-5 w-5" />
            </a>
            <a
              href={JAWAFDEHI_SOCIALS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-primary transition-colors"
              aria-label={t("footer.social.whatsapp")}
            >
              <FaWhatsapp className="h-5 w-5" />
            </a>
            <a
              href={JAWAFDEHI_SOCIALS.linktree}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-primary transition-colors"
              aria-label={t("footer.social.linktree")}
            >
              <SiLinktree className="h-5 w-5" />
            </a>
          </div>
          <p className="text-xs text-white/40 italic text-center max-w-4xl mx-auto mb-3">
            {t("footer.disclaimer")}
          </p>
          <p className="text-center text-xs text-white/40">
            © {new Date().getFullYear()} Jawafdehi. All data is in the public domain.
          </p>
        </div>
      </div>
    </footer>
  );
};
