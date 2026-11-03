import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  HeartHandshake,
  Menu,
  MessageCircle,
  Search,
} from "lucide-react";

import { AppSearchCommand } from "@/components/AppSearchCommand";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CHAT_URL } from "@/lib/external-links";

type NavItem = {
  key: string;
  label: string;
  to: string;
  exact?: boolean;
};

const desktopNavWidthClass: Record<string, string> = {
  home: "min-w-[4.5rem]",
  process: "min-w-[7.25rem]",
  cases: "min-w-[4.75rem]",
  volunteer: "min-w-[6.25rem]",
  faq: "min-w-[4.25rem]",
  updates: "min-w-[5.5rem]",
  commitment: "min-w-[8.75rem]",
  about: "min-w-[5.75rem]",
  archive: "min-w-[5.75rem]",
};

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-2xl px-4 py-3 text-sm font-normal transition-all duration-200",
    isActive
      ? "bg-secondary/55 text-foreground/80"
      : "text-foreground/65 hover:bg-secondary/35 hover:text-foreground/80",
  );

// One flat bar: links sit straight on the header with no pill behind them, and
// the current page carries a short crimson underline.
const NAV_ITEM_CLASS =
  "relative inline-flex h-10 items-center justify-center px-3 text-center text-[15px] font-normal text-foreground/62 transition-colors duration-200 hover:text-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const NAV_ACTIVE_CLASS =
  "after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-accent after:content-['']";
// Icon buttons (search, menu) are bare glyphs: no border, no fill at rest.
const NAV_ICON_CLASS =
  "border-transparent bg-transparent shadow-none hover:translate-y-0 hover:border-transparent hover:bg-secondary/35 hover:shadow-none";
const NAV_ICON_ON_DARK_CLASS = "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground";

/** Routes whose page opens on a full-bleed navy hero (see overDarkHero). */
const DARK_HERO_PATHS = new Set(["/", "/mcp", "/mcp/"]);

export function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const navItems = useMemo<NavItem[]>(
    () => [
      { key: "home", label: t("nav.home"), to: "/", exact: true },
      { key: "volunteer", label: t("nav.volunteer"), to: "/volunteer" },
      { key: "updates", label: t("nav.updates"), to: "/updates" },
    ],
    [t],
  );

  // Unified public archive: full search + the data-lake single-type browse views.
  const archiveNavItems = useMemo<NavItem[]>(
    () => [
      { key: "search", label: t("nav.searchArchive", "Search archive"), to: "/search", exact: true },
      { key: "materials", label: t("nav.materials", "Documents & other materials"), to: "/materials" },
      { key: "courtcases", label: t("nav.courtCases", "Court cases"), to: "/courtcases" },
      { key: "research", label: t("nav.research", "Research"), to: "/research/corruption-accountability" },
      { key: "mcp", label: t("nav.mcp", "Jawafdehi MCP"), to: "/mcp" },
    ],
    [t],
  );

  // Feeds BOTH the desktop "हाम्रो बारेमा" dropdown and the mobile sheet, which
  // maps this same list — so an entry added here appears in both.
  const aboutNavItems = useMemo<NavItem[]>(
    () => [
      { key: "about", label: t("nav.about"), to: "/about", exact: true },
      // Placed second rather than last: it is the only item in this group with
      // a live action behind it, and the one being shared with prospects.
      { key: "openhouse", label: t("nav.openHouse"), to: "/openhouse" },
      { key: "process", label: t("nav.ourProcess"), to: "/our-process" },
      { key: "commitment", label: t("nav.ourCommitment"), to: "/commitment" },
      { key: "team", label: t("nav.team"), to: "/team" },
      { key: "products", label: t("nav.products"), to: "/products" },
      { key: "faq", label: t("nav.faq"), to: "/faq" },
    ],
    [t],
  );

  const activeKey = useMemo(() => {
    const path = location.pathname;

    // Derived from aboutNavItems rather than a second hardcoded list of the
    // same paths: the two had to be edited together, so they would eventually
    // drift and the group's underline would go missing on a page inside it.
    if (aboutNavItems.some((item) => item.to === path)) {
      return "about";
    }
    // Derived from archiveNavItems for the same reason as the group above —
    // and this list had already drifted: it was a copy of the menu's paths, so
    // /mcp went into the menu while the trigger stayed unmarked on that page. The
    // extra entries below are the ones with no menu item of their own: /cases
    // (reached from the header, not this menu) and the detail-page prefixes.
    if (
      archiveNavItems.some((item) => item.to === path) ||
      path === "/cases" ||
      path.startsWith("/case/") ||
      path.startsWith("/material/") ||
      path.startsWith("/courtcase/") ||
      path.startsWith("/research/")
    ) {
      return "archive";
    }

    return navItems.find((item) => path === item.to || path.startsWith(`${item.to}/`))?.key ?? null;
  }, [location.pathname, navItems, aboutNavItems, archiveNavItems]);

  // The home and MCP heroes are full-bleed navy stages, and at rest the header
  // is transparent directly on top of them — where the navy logo and nav text
  // would vanish. Every other page opens on a light surface. So the at-rest
  // header is light-on-dark on those routes only, and snaps back to the normal
  // navy-on-light treatment the moment it gains its opaque background.
  const overDarkHero = !isScrolled && DARK_HERO_PATHS.has(location.pathname);

  const [homeNavItem, ...secondaryNavItems] = navItems;

  useEffect(() => {
    const updateScrolled = () => {
      const nextScrolled = window.scrollY > 20;
      setIsScrolled((current) => (current === nextScrolled ? current : nextScrolled));
    };

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen((open) => !open);
        return;
      }

      if (!isTyping && event.key === "/") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    globalThis.window.addEventListener("keydown", onKeyDown);
    return () => globalThis.window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      {/* Transparent at rest, over the navy heroes; once scrolled, one solid
          white bar with a hairline and a soft shadow. It must be opaque, not
          glass: translucency without blur let the hero headline through as a
          sharp ghost, and a full-width backdrop-filter repaints on every scroll
          frame on the low-end phones this site is built for. */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-colors duration-200 ease-out",
          isScrolled
            ? "bg-background shadow-[0_1px_0_hsl(var(--border)),0_10px_30px_-24px_hsl(var(--primary-surface)/0.45)]"
            : "bg-transparent",
        )}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {t("nav.skipToContent")}
        </a>

        <div className="layout-container grid h-[76px] grid-cols-[1fr_auto] items-center gap-3 xl:grid-cols-[auto_1fr_auto]">
          <Link
            to="/"
            aria-label={t("nav.homeAria")}
            className={cn(
              "flex h-11 min-w-0 items-center justify-self-start rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            {/* The wordmark in logo.svg is navy and disappears on the dark
                page. logo-dark.svg is the light-on-dark cut the Footer already
                uses over its navy panel — and the one the transparent header
                needs while it sits on the navy home hero. */}
            <img
              src="/assets/logo.svg"
              alt="Jawafdehi"
              className={cn(
                "block h-8 w-auto object-contain dark:hidden",
                overDarkHero && "hidden",
              )}
            />
            <img
              src="/assets/logo-dark.svg"
              alt=""
              aria-hidden="true"
              className={cn(
                "hidden h-8 w-auto object-contain dark:block",
                overDarkHero && "block",
              )}
            />
          </Link>

          <nav
            aria-label="Primary"
            className="relative hidden items-center justify-self-center xl:flex"
          >

            {homeNavItem ? (
              <NavLink
                to={homeNavItem.to}
                end={homeNavItem.exact}
                className={({ isActive }) =>
                  cn(
                    NAV_ITEM_CLASS,
                    desktopNavWidthClass[homeNavItem.key],
                    isActive && cn("text-foreground/82", NAV_ACTIVE_CLASS),
                    overDarkHero && "text-primary-foreground/75 hover:text-primary-foreground",
                    overDarkHero && isActive && "text-primary-foreground",
                  )
                }
              >
                {homeNavItem.label}
              </NavLink>
            ) : null}

            {/* Archive sits directly after Home: the public archive is what most
                visitors come for, so it leads and About closes the row. */}
            <DropdownMenu open={archiveOpen} onOpenChange={setArchiveOpen}>
              <DropdownMenuTrigger
                className={cn(
                  cn(NAV_ITEM_CLASS, "gap-1"),
                  desktopNavWidthClass.archive,
                  activeKey === "archive" && NAV_ACTIVE_CLASS,
                  (activeKey === "archive" || archiveOpen) && "text-foreground/82",
                  overDarkHero && "text-primary-foreground/75 hover:text-primary-foreground",
                  overDarkHero && (activeKey === "archive" || archiveOpen) && "text-primary-foreground",
                )}
              >
                {t("nav.archive", "Archive")}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 opacity-60 transition-transform duration-200",
                    archiveOpen && "rotate-180",
                  )}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                className="mt-3 w-52 rounded-2xl border-border/70 bg-background/95 p-2 shadow-xl shadow-foreground/10 backdrop-blur-[12px]"
              >
                {archiveNavItems.map((item) => (
                  <DropdownMenuItem key={item.key} asChild className="rounded-xl text-sm font-normal">
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {secondaryNavItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  cn(
                    NAV_ITEM_CLASS,
                    desktopNavWidthClass[item.key],
                    isActive && cn("text-foreground/82", NAV_ACTIVE_CLASS),
                    overDarkHero && "text-primary-foreground/75 hover:text-primary-foreground",
                    overDarkHero && isActive && "text-primary-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}

            <DropdownMenu open={aboutOpen} onOpenChange={setAboutOpen}>
              <DropdownMenuTrigger
                className={cn(
                  cn(NAV_ITEM_CLASS, "gap-1"),
                  desktopNavWidthClass.about,
                  activeKey === "about" && NAV_ACTIVE_CLASS,
                  (activeKey === "about" || aboutOpen) && "text-foreground/82",
                  overDarkHero && "text-primary-foreground/75 hover:text-primary-foreground",
                  overDarkHero && (activeKey === "about" || aboutOpen) && "text-primary-foreground",
                )}
              >
                {t("nav.about")}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 opacity-60 transition-transform duration-200",
                    aboutOpen && "rotate-180",
                  )}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                className="mt-3 w-56 rounded-2xl border-border/70 bg-background/95 p-2 shadow-xl shadow-foreground/10 backdrop-blur-[12px]"
              >
                {aboutNavItems.map((item) => (
                  <DropdownMenuItem key={item.key} asChild className="rounded-xl text-sm font-normal">
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="hidden items-center justify-end gap-2 justify-self-end xl:flex">
            <LanguageToggle quiet onDark={overDarkHero} />

            <Button
                variant="navIcon"
                size="icon"
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label={t("searchCommand.open")}
                title={t("searchCommand.open")}
                className={cn(NAV_ICON_CLASS, overDarkHero && NAV_ICON_ON_DARK_CLASS)}
              >
                <Search className="h-4 w-4" />
              </Button>

            <Button asChild variant="accent">
              <Link to="/donate">
                <HeartHandshake aria-hidden="true" />
                {t("nav.donate")}
              </Link>
            </Button>

            <Button asChild variant={overDarkHero ? "quietOnDark" : "quiet"}>
              <a href={CHAT_URL} target="_blank" rel="noreferrer">
                <MessageCircle aria-hidden="true" />
                {t("header.askAiAssistant")}
              </a>
            </Button>
          </div>

          <div className="flex items-center gap-2 justify-self-end xl:hidden">
            <LanguageToggle quiet onDark={overDarkHero} />
            <Button
              variant="navIcon"
              size="navMenuIcon"
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label={t("searchCommand.open")}
              title={t("searchCommand.open")}
              className={cn(
                NAV_ICON_CLASS,
                overDarkHero && NAV_ICON_ON_DARK_CLASS,
              )}
            >
              <Search className="h-5 w-5" />
            </Button>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="navIcon"
                  size="navMenuIcon"
                  className={cn(
                    NAV_ICON_CLASS,
                    overDarkHero && NAV_ICON_ON_DARK_CLASS,
                  )}
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{t("nav.menu")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-[320px] border-border/70 bg-background/95 p-5 backdrop-blur-[12px] sm:max-w-[390px]">
                <SheetHeader className="text-left">
                  <SheetTitle className="flex items-center gap-3 text-base">
                    <img
                      src="/assets/logo.svg"
                      alt="Jawafdehi"
                      className="block h-8 w-auto object-contain dark:hidden"
                    />
                    <img
                      src="/assets/logo-dark.svg"
                      alt=""
                      aria-hidden="true"
                      className="hidden h-8 w-auto object-contain dark:block"
                    />
                    {/* SheetTitle supplies the dialog's accessible name. In dark
                        the light logo is display:none (so its alt leaves the a11y
                        tree) and the dark one is aria-hidden, which would leave
                        the dialog unnamed. This carries the name in both themes. */}
                    <span className="sr-only">Jawafdehi</span>
                  </SheetTitle>
                </SheetHeader>

                <nav className="mt-8 flex flex-col gap-2">
                  {homeNavItem ? (
                    <NavLink
                      to={homeNavItem.to}
                      end={homeNavItem.exact}
                      className={mobileNavLinkClass}
                      onClick={() => setIsOpen(false)}
                    >
                      {homeNavItem.label}
                    </NavLink>
                  ) : null}
                  {/* Same order as the desktop row: Archive first, About last. */}
                  {archiveNavItems.map((item) => (
                    <NavLink
                      key={item.key}
                      to={item.to}
                      end={item.exact}
                      className={mobileNavLinkClass}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                  {secondaryNavItems.map((item) => (
                    <NavLink
                      key={item.key}
                      to={item.to}
                      end={item.exact}
                      className={mobileNavLinkClass}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                  {aboutNavItems.map((item) => (
                    <NavLink
                      key={item.key}
                      to={item.to}
                      end={item.exact}
                      className={mobileNavLinkClass}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>

                <div className="mt-8 grid gap-3">
                  <Button
                    asChild
                    size="navSheet"
                    className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
                    onClick={() => setIsOpen(false)}
                  >
                    <Link to="/donate">
                      <HeartHandshake aria-hidden="true" />
                      {t("nav.donate")}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="primary"
                    size="navSheet"
                    onClick={() => setIsOpen(false)}
                  >
                    <a href={CHAT_URL} target="_blank" rel="noreferrer">
                      <MessageCircle aria-hidden="true" />
                      {t("header.askAiAssistant")}
                    </a>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <AppSearchCommand open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  );
}
