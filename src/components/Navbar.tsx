import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

type NavItem = {
  key: string;
  label: string;
  to: string;
  exact?: boolean;
};

type PillStyle = {
  opacity: number;
  transform: string;
  width: number;
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

const useIsomorphicLayoutEffect =
  typeof globalThis.window !== "undefined" ? useLayoutEffect : useEffect;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-2xl px-4 py-3 text-sm font-normal transition-all duration-200",
    isActive
      ? "bg-secondary/55 text-foreground/80"
      : "text-foreground/65 hover:bg-secondary/35 hover:text-foreground/80",
  );

export function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [pillStyle, setPillStyle] = useState<PillStyle>({
    opacity: 0,
    transform: "translateX(0px)",
    width: 0,
  });
  const navRefs = useRef<Record<string, HTMLElement | null>>({});

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
    ],
    [t],
  );

  const aboutNavItems = useMemo<NavItem[]>(
    () => [
      { key: "about", label: t("nav.about"), to: "/about", exact: true },
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

    if (["/about", "/our-process", "/commitment", "/team", "/products", "/faq"].includes(path)) {
      return "about";
    }
    if (
      ["/cases", "/search", "/materials", "/courtcases"].includes(path) ||
      path.startsWith("/case/") ||
      path.startsWith("/material/") ||
      path.startsWith("/courtcase/") ||
      path.startsWith("/research/")
    ) {
      return "archive";
    }

    return navItems.find((item) => path === item.to || path.startsWith(`${item.to}/`))?.key ?? null;
  }, [location.pathname, navItems]);

  const pillKey = hoveredKey ?? activeKey;
  const showPill = isScrolled && Boolean(pillKey);

  // The home hero is a full-bleed navy stage, and at rest the header is
  // transparent directly on top of it — where the navy logo and nav text
  // would vanish. Every other page opens on a light surface. So the at-rest
  // header is light-on-dark on "/" only, and snaps back to the normal navy-on-
  // light treatment the moment it gains its opaque background (isScrolled).
  const overDarkHero = !isScrolled && location.pathname === "/";

  useIsomorphicLayoutEffect(() => {
    if (!showPill || !pillKey) {
      setPillStyle((current) => ({ ...current, opacity: 0 }));
      return;
    }

    const node = navRefs.current[pillKey];
    if (!node) {
      return;
    }

    setPillStyle({
      opacity: 1,
      transform: `translateX(${node.offsetLeft}px)`,
      width: node.offsetWidth,
    });
  }, [pillKey, showPill, location.pathname]);

  const setNavRef = (key: string) => (node: HTMLElement | null) => {
    navRefs.current[key] = node;
  };

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
      {/* Once scrolled, the header itself has to be opaque. It used to stay
          `bg-transparent` at every scroll position, with `isScrolled` only
          turning on backgrounds for the individual controls inside it (logo
          pill, search/menu buttons, language toggle) — so the page scrolled
          directly behind the band and only those pills masked anything. Measured
          at eight real scroll positions on the home page: 0 full-width masks and
          page text under the header at every position but the top, worst case the
          hero headline "स्थायी अभिलेख" overlapping by 46px.
          This is worse on a phone than on desktop: a desktop header carries a
          full nav row that incidentally covers the band, while a 360px header has
          four small pills and mostly open space. Devanagari makes it worse again,
          since tall matras and conjuncts collide with the pill shapes.
          Still deliberately transparent at the top, for the hero. */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-colors duration-200 ease-out",
          // Fully opaque on phones; glass from `md` up.
          //
          // A full-width `backdrop-filter` repaints on every scroll frame, and that
          // cost lands on the low-end-Android audience this whole change is for. It
          // is also not measurable here — CPU throttling does not throttle the
          // compositor — so the phone case takes the option that needs no GPU work
          // at all rather than the one that merely looks cheap.
          //
          // It has to be *opaque*, not just more opaque: `/95` without blur still
          // let the hero headline through as a sharp, legible ghost, because the
          // blur was what diffused the residual. Screenshotted both. Translucency
          // and no-blur do not combine.
          isScrolled
            ? "bg-background md:bg-background/85 md:backdrop-blur-md"
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
              "flex h-11 min-w-0 items-center justify-self-start rounded-full border px-3 transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isScrolled
                ? "border-border/70 bg-white/75 shadow-sm shadow-foreground/5 backdrop-blur-md dark:border-border/70 dark:bg-background/70"
                : "border-transparent bg-transparent shadow-none backdrop-blur-0",
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
            onPointerLeave={() => setHoveredKey(null)}
            className={cn(
              "relative hidden items-center justify-self-center rounded-full border p-1 transition-all duration-200 ease-out xl:flex",
              isScrolled
                ? "border-border/70 bg-white/85 shadow-sm shadow-foreground/5 backdrop-blur-md dark:border-border/70 dark:bg-background/80"
                : "border-transparent bg-transparent shadow-none backdrop-blur-0",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-0 top-1 h-10 rounded-full bg-muted shadow-sm transition-[transform,width,opacity] duration-200 ease-out motion-reduce:transition-none dark:bg-secondary/55",
                !isScrolled && "shadow-none",
              )}
              style={pillStyle}
            />

            {homeNavItem ? (
              <NavLink
                to={homeNavItem.to}
                end={homeNavItem.exact}
                ref={setNavRef(homeNavItem.key)}
                onPointerEnter={() => setHoveredKey(homeNavItem.key)}
                className={({ isActive }) =>
                  cn(
                    "relative z-10 inline-flex h-10 items-center justify-center rounded-full px-3 text-center text-sm font-normal text-foreground/62 transition-colors duration-200 hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    desktopNavWidthClass[homeNavItem.key],
                    isActive && "font-medium text-foreground/82",
                    overDarkHero && "text-primary-foreground/75 hover:text-primary-foreground",
                    overDarkHero && isActive && "text-primary-foreground",
                  )
                }
              >
                {homeNavItem.label}
              </NavLink>
            ) : null}

            <DropdownMenu open={aboutOpen} onOpenChange={setAboutOpen}>
              <DropdownMenuTrigger
                ref={setNavRef("about")}
                onPointerEnter={() => setHoveredKey("about")}
                className={cn(
                  "relative z-10 inline-flex h-10 items-center justify-center gap-1 rounded-full px-3 text-center text-sm font-normal text-foreground/62 transition-colors duration-200 hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  desktopNavWidthClass.about,
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

            {secondaryNavItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.exact}
                ref={setNavRef(item.key)}
                onPointerEnter={() => setHoveredKey(item.key)}
                className={({ isActive }) =>
                  cn(
                    "relative z-10 inline-flex h-10 items-center justify-center rounded-full px-3 text-center text-sm font-normal text-foreground/62 transition-colors duration-200 hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    desktopNavWidthClass[item.key],
                    isActive && "font-medium text-foreground/82",
                    overDarkHero && "text-primary-foreground/75 hover:text-primary-foreground",
                    overDarkHero && isActive && "text-primary-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}

            <DropdownMenu open={archiveOpen} onOpenChange={setArchiveOpen}>
              <DropdownMenuTrigger
                ref={setNavRef("archive")}
                onPointerEnter={() => setHoveredKey("archive")}
                className={cn(
                  "relative z-10 inline-flex h-10 items-center justify-center gap-1 rounded-full px-3 text-center text-sm font-normal text-foreground/62 transition-colors duration-200 hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  desktopNavWidthClass.archive,
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
          </nav>

          <div className="hidden items-center justify-end gap-2 justify-self-end xl:flex">
            <LanguageToggle quiet={!isScrolled} onDark={overDarkHero} />

            <div
              className={cn(
                "flex items-center gap-1 rounded-full transition-all duration-200 ease-out",
                isScrolled
                  ? " dark:border-border/70 dark:bg-background/70"
                  : "border-transparent bg-transparent shadow-none backdrop-blur-0",
              )}
            >
              <Button
                variant="navIcon"
                size="icon"
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label={t("searchCommand.open")}
                title={t("searchCommand.open")}
                className={cn(
                  isScrolled
                    ? "border-border/70 bg-white/70 dark:border-border/70 dark:bg-background/70"
                    : "border-transparent bg-transparent shadow-none hover:translate-y-0 hover:border-transparent hover:bg-secondary/35 hover:shadow-none",
                  overDarkHero && "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground",
                )}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <Button
              asChild
              variant="secondary"
              className={cn(
                "min-w-[8rem] whitespace-nowrap bg-accent px-4 font-semibold text-accent-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-accent/90",
                isScrolled ? "shadow-md shadow-accent/20" : "shadow-none",
              )}
            >
              <Link to="/donate">
                <HeartHandshake className="h-4 w-4" />
                {t("nav.donate")}
              </Link>
            </Button>

            <Button
              asChild
              variant="primary"
              size="navCta"
              className={cn(
                "min-w-[12rem] whitespace-nowrap transition-all duration-200 ease-out hover:-translate-y-0.5",
                isScrolled ? "shadow-md shadow-primary-surface/15" : "shadow-none",
                // bg-primary-surface is the same navy as the home hero — the
                // button vanishes into the stage without the glass treatment.
                overDarkHero &&
                  "bg-primary-foreground/10 text-primary-foreground ring-1 ring-inset ring-primary-foreground/25 hover:bg-primary-foreground/15",
              )}
            >
              <a href="https://chat.jawafdehi.org" target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" />
                {t("header.askAiAssistant")}
              </a>
            </Button>
          </div>

          <div className="flex items-center gap-2 justify-self-end xl:hidden">
            <LanguageToggle quiet={!isScrolled} onDark={overDarkHero} />
            <Button
              variant="navIcon"
              size="navMenuIcon"
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label={t("searchCommand.open")}
              title={t("searchCommand.open")}
              className={cn(
                isScrolled
                  ? "border-border/70 bg-white/75 dark:border-border/70 dark:bg-background/70"
                  : "border-transparent bg-transparent shadow-none hover:translate-y-0 hover:border-transparent hover:bg-secondary/35 hover:shadow-none",
                  overDarkHero && "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground",
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
                    isScrolled
                      ? "border-border/70 bg-white/75 dark:border-border/70 dark:bg-background/70"
                      : "border-transparent bg-transparent shadow-none hover:translate-y-0 hover:border-transparent hover:bg-secondary/35 hover:shadow-none",
                  overDarkHero && "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground",
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
                </nav>

                <div className="mt-8 grid gap-3">
                  <Button
                    asChild
                    size="navSheet"
                    className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
                    onClick={() => setIsOpen(false)}
                  >
                    <Link to="/donate">
                      <HeartHandshake className="h-4 w-4" />
                      {t("nav.donate")}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="primary"
                    size="navSheet"
                    onClick={() => setIsOpen(false)}
                  >
                    <a href="https://chat.jawafdehi.org" target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4" />
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
