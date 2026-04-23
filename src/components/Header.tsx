import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, ChevronDown, Users, Info, Package, MessageCircle, Newspaper } from "lucide-react";
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

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium transition-colors ${
    isActive ? "text-primary" : "text-foreground/70 hover:text-foreground"
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-lg font-medium transition-colors py-2 ${
    isActive ? "text-primary" : "text-foreground hover:text-primary"
  }`;

export const Header = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isAboutActive = location.pathname === "/about";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Skip to content
      </a>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2.5">
          <img src="/favicon.png" alt="Jawafdehi Logo" className="h-9 w-9" />
          <span className="text-lg font-bold text-foreground tracking-tight">
            Jawafdehi.org
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-7">
          <NavLink to="/our-process" className={navLinkClass}>
            Our Process
          </NavLink>
          <NavLink to="/volunteer" className={navLinkClass}>
            Volunteer
          </NavLink>
          <NavLink to="/commitment" className={navLinkClass}>
            Our Commitment
          </NavLink>

          {/* About dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isAboutActive ? "text-primary" : "text-foreground/70 hover:text-foreground"
              }`}
            >
              {t("nav.about")}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem asChild>
                <Link to="/about" className="flex items-center gap-2 cursor-pointer">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  About Jawafdehi
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/team" className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Our Team
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/products" className="flex items-center gap-2 cursor-pointer">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Our Products
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/updates" className="flex items-center gap-2 cursor-pointer">
                  <Newspaper className="h-4 w-4 text-muted-foreground" />
                  {t("nav.updates")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <LanguageToggle />
          <ThemeToggle />
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center space-x-3">
          <Button asChild variant="primary">
            <Link to="/ask" className="inline-flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span>{t("header.askJawafdehi")}</span>
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/cases">{t("header.viewCases")}</Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <div className="flex lg:hidden items-center space-x-2">
          <LanguageToggle />
          <ThemeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">{t("nav.menu")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Jawafdehi.org</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col space-y-4 mt-8">
                <NavLink to="/" end className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>
                  {t("nav.home")}
                </NavLink>
                <NavLink to="/our-process" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>
                  Our Process
                </NavLink>
                <NavLink to="/volunteer" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>
                  Volunteer
                </NavLink>
                <NavLink to="/commitment" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>
                  Our Commitment
                </NavLink>
                <NavLink to="/about" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>
                  {t("nav.about")}
                </NavLink>
                <Link
                  to="/team"
                  className="text-lg font-medium text-foreground/60 hover:text-primary transition-colors py-2 pl-4"
                  onClick={() => setIsOpen(false)}
                >
                  — Our Team
                </Link>
                <Link
                  to="/products"
                  className="text-lg font-medium text-foreground/60 hover:text-primary transition-colors py-2 pl-4"
                  onClick={() => setIsOpen(false)}
                >
                  — Our Products
                </Link>
                <Link
                  to="/updates"
                  className="text-lg font-medium text-foreground/60 hover:text-primary transition-colors py-2 pl-4"
                  onClick={() => setIsOpen(false)}
                >
                  — {t("nav.updates")}
                </Link>
                <div className="pt-4 space-y-3 border-t border-border">
                  <Button asChild variant="primary" className="w-full" onClick={() => setIsOpen(false)}>
                    <Link to="/ask" className="inline-flex items-center justify-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      <span>{t("header.askJawafdehi")}</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full" onClick={() => setIsOpen(false)}>
                    <Link to="/cases">{t("header.viewCases")}</Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
