import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Sparkles, Menu, ChevronDown, Users, Info, Package } from "lucide-react";
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
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2.5">
          <img src="/favicon.png" alt="Jawafdehi Logo" className="h-9 w-9" />
          <span className="text-lg font-bold text-foreground tracking-tight">
            Jawafdehi.org
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-7">
          <NavLink to="/cases" className={navLinkClass}>
            {t("nav.cases")}
          </NavLink>
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
              className={`flex items-center gap-1 text-sm font-medium transition-colors outline-none ${
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
            </DropdownMenuContent>
          </DropdownMenu>

          {/* AI teaser */}
          <span className="flex items-center gap-1.5 text-sm text-amber-600/80 cursor-default select-none">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Search</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium leading-none">
              Soon
            </span>
          </span>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center space-x-3">
          <LanguageToggle />
          <Button asChild>
            <Link to="/cases">{t("header.viewCases")}</Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <div className="flex lg:hidden items-center space-x-2">
          <LanguageToggle />
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
                <NavLink to="/cases" className={mobileNavLinkClass} onClick={() => setIsOpen(false)}>
                  {t("nav.cases")}
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
                <div className="pt-4 space-y-3 border-t border-border">
                  <Button asChild className="w-full" onClick={() => setIsOpen(false)}>
                    <Link to="/cases">{t("header.viewCases")}</Link>
                  </Button>
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-amber-600/80">
                    <Sparkles className="h-4 w-4" />
                    <span>AI Search — Coming Soon</span>
                  </div>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
