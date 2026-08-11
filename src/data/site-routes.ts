
export type SearchIconName =
  | "BookOpen"
  | "Building2"
  | "FileText"
  | "HeartHandshake"
  | "Home"
  | "Info"
  | "MessageCircle"
  | "Newspaper"
  | "Search"
  | "ShieldCheck"
  | "Users";

export type SearchIndexGroup = "pages" | "updates" | "cases" | "entities";

export type SearchIndexEntry = {
  path: string;
  title?: string;
  titleKey?: string;
  description?: string;
  descriptionKey?: string;
  keywords: string[];
  icon: SearchIconName;
  group: SearchIndexGroup;
  lines?: SearchIndexLine[];
};

export type SearchIndexLine = {
  line: number;
  text: string;
  sectionId?: string;
};

export type SearchIndexFile = {
  version: 1;
  generatedAt: string;
  entries: SearchIndexEntry[];
};

// SEO, sitemap and search metadata. A route carrying this block is pre-rendered
// at build time by scripts/pre-render.ts; a route without one is client-rendered
// only, because it is dynamic, auth-gated, or a redirect.
export type StaticPageMeta = {
  titleKey: string;
  descriptionKey: string;
  keywords: string[];
  icon: SearchIconName;
  sitemapTitle: string;
  excludeFromSearch?: boolean;
  excludeFromSitemap?: boolean;
};

export type StaticSiteRoute = { path: string } & StaticPageMeta;

// Whether the route renders inside the site chrome (<AppLayout>) or full-screen.
export type RouteChrome = "app" | "standalone";

export type SiteRoute = { path: string; chrome: RouteChrome } & Partial<StaticPageMeta>;

export type UpdateRouteEntry = {
  id: string;
  title: string;
};

// The one route table for the site.
//
// This used to be three lists kept in step by hand: `<Route path>` in App.tsx,
// PRE_RENDERED_STATIC_ROUTES here, and hand-written regexes in route-patterns.ts
// for the Worker. Nothing enforced agreement, and each way of disagreeing failed
// differently — a route missing from the Worker's list 404s at the edge while
// working fine in dev; a route missing here is never pre-rendered and ships
// without meta tags.
//
// Now App.tsx renders its `<Route>`s from this table, route-patterns.ts matches
// against it with React Router's own matcher, and PRE_RENDERED_STATIC_ROUTES is
// a filtered view of it. A route exists once.
//
// Paths use React Router pattern syntax (`:param`, `*` splat). React Router ranks
// matches by specificity, not declaration order, so the order below is for human
// readers only — `/updates/preview` still beats `/updates/:slug`.
//
// The catch-all `*` is deliberately absent: it exists to render NotFound, and a
// table entry matching every path would tell the Worker that every path is real.
//
// MUST stay free of component imports — the Worker imports this table, and
// pulling React into the edge bundle would be a large regression.
export const SITE_ROUTES = [
  // Standalone, outside the site chrome.
  { path: "/embed/case/:id", chrome: "standalone" },
  { path: "/document-viewer", chrome: "standalone" },
  { path: "/admin/*", chrome: "standalone" },
  // Back-compat: the casework portal moved from /portal to /admin.
  { path: "/portal/*", chrome: "standalone" },

  {
    path: "/",
    chrome: "app",
    titleKey: "nav.home",
    descriptionKey: "searchCommand.descriptions.home",
    keywords: ["home", "jawafdehi", "start"],
    icon: "Home",
    sitemapTitle: "Jawafdehi — Nepal Open Corruption Database",
  },
  {
    path: "/cases",
    chrome: "app",
    titleKey: "header.browseCases",
    descriptionKey: "searchCommand.descriptions.cases",
    keywords: ["cases", "corruption", "archive"],
    icon: "Search",
    sitemapTitle: "Cases — Jawafdehi",
  },
  {
    path: "/search",
    chrome: "app",
    titleKey: "searchCommand.pageTitles.archiveSearch",
    descriptionKey: "searchCommand.descriptions.archiveSearch",
    keywords: ["search", "archive", "cases", "entities", "documents"],
    icon: "Search",
    sitemapTitle: "Archive Search — Jawafdehi",
  },
  {
    path: "/faq",
    chrome: "app",
    titleKey: "nav.faq",
    descriptionKey: "searchCommand.descriptions.faq",
    keywords: ["faq", "questions", "answers", "reporting", "privacy", "volunteer", "funding"],
    icon: "BookOpen",
    sitemapTitle: "FAQ — Jawafdehi",
  },
  {
    path: "/research/corruption-accountability",
    chrome: "app",
    titleKey: "research.corruption.meta.title",
    descriptionKey: "research.corruption.meta.description",
    keywords: ["research", "corruption", "conviction rate", "ciaa", "special court", "accountability", "report"],
    icon: "FileText",
    sitemapTitle: "Corruption Accountability — Jawafdehi",
  },
  {
    path: "/our-process",
    chrome: "app",
    titleKey: "nav.ourProcess",
    descriptionKey: "searchCommand.descriptions.process",
    keywords: ["process", "verification", "methodology"],
    icon: "ShieldCheck",
    sitemapTitle: "Our Process — Jawafdehi",
  },
  {
    path: "/commitment",
    chrome: "app",
    titleKey: "nav.ourCommitment",
    descriptionKey: "searchCommand.descriptions.commitment",
    keywords: ["commitment", "principles", "trust"],
    icon: "FileText",
    sitemapTitle: "Our Commitment — Jawafdehi",
  },
  {
    path: "/volunteer",
    chrome: "app",
    titleKey: "nav.volunteer",
    descriptionKey: "searchCommand.descriptions.volunteer",
    keywords: ["volunteer", "contribute", "help"],
    icon: "HeartHandshake",
    sitemapTitle: "Volunteer — Jawafdehi",
  },
  {
    path: "/donate",
    chrome: "app",
    titleKey: "nav.donate",
    descriptionKey: "searchCommand.descriptions.donate",
    keywords: ["donate", "donation", "support", "fund", "give", "contribute"],
    icon: "HeartHandshake",
    sitemapTitle: "Donate — Jawafdehi",
  },
  {
    path: "/donate/success",
    chrome: "app",
    titleKey: "nav.donate",
    descriptionKey: "searchCommand.descriptions.donate",
    keywords: ["donate", "donation", "support", "success", "payment"],
    icon: "HeartHandshake",
    sitemapTitle: "Donation Success — Jawafdehi",
    excludeFromSearch: true,
    excludeFromSitemap: true,
  },
  {
    path: "/donate/cancel",
    chrome: "app",
    titleKey: "nav.donate",
    descriptionKey: "searchCommand.descriptions.donate",
    keywords: ["donate", "donation", "support", "cancel", "payment"],
    icon: "HeartHandshake",
    sitemapTitle: "Donation Cancelled — Jawafdehi",
    excludeFromSearch: true,
    excludeFromSitemap: true,
  },
  {
    path: "/about",
    chrome: "app",
    titleKey: "nav.about",
    descriptionKey: "searchCommand.descriptions.about",
    keywords: ["about", "mission", "jawafdehi"],
    icon: "Info",
    sitemapTitle: "About — Jawafdehi",
  },
  {
    path: "/team",
    chrome: "app",
    titleKey: "nav.team",
    descriptionKey: "searchCommand.descriptions.team",
    keywords: ["team", "people", "members"],
    icon: "Users",
    sitemapTitle: "Our Team — Jawafdehi",
  },
  {
    path: "/products",
    chrome: "app",
    titleKey: "nav.products",
    descriptionKey: "searchCommand.descriptions.products",
    keywords: ["products", "tools", "platforms"],
    icon: "FileText",
    sitemapTitle: "Products — Jawafdehi",
  },
  {
    path: "/saptahik",
    chrome: "app",
    titleKey: "nav.weeklySeries",
    descriptionKey: "searchCommand.descriptions.weeklySeries",
    keywords: ["weekly", "corruption", "series", "meeting", "zoom", "youtube", "live"],
    icon: "Newspaper",
    sitemapTitle: "Weekly Corruption Series — Jawafdehi",
  },
  {
    path: "/updates",
    chrome: "app",
    titleKey: "nav.updates",
    descriptionKey: "searchCommand.descriptions.updates",
    keywords: ["updates", "news", "posts"],
    icon: "Newspaper",
    sitemapTitle: "Updates — Jawafdehi",
  },
  {
    path: "/feedback",
    chrome: "app",
    titleKey: "searchCommand.pageTitles.feedback",
    descriptionKey: "searchCommand.descriptions.feedback",
    keywords: ["feedback", "bug", "suggestion"],
    icon: "MessageCircle",
    sitemapTitle: "Feedback — Jawafdehi",
  },
  {
    path: "/report",
    chrome: "app",
    titleKey: "searchCommand.pageTitles.report",
    descriptionKey: "searchCommand.descriptions.report",
    keywords: ["report", "tip", "whistleblower", "corruption", "submit", "anonymous", "उजुरी"],
    icon: "ShieldCheck",
    sitemapTitle: "Report a Case — Jawafdehi",
  },
  {
    path: "/privacy",
    chrome: "app",
    titleKey: "searchCommand.pageTitles.privacy",
    descriptionKey: "searchCommand.descriptions.privacy",
    keywords: ["privacy", "cookies", "data"],
    icon: "ShieldCheck",
    sitemapTitle: "Privacy Policy — Jawafdehi",
  },
  {
    path: "/terms",
    chrome: "app",
    titleKey: "searchCommand.pageTitles.terms",
    descriptionKey: "searchCommand.descriptions.terms",
    keywords: ["terms", "service", "rules"],
    icon: "FileText",
    sitemapTitle: "Terms of Service — Jawafdehi",
  },

  // Client-rendered only — no pre-render metadata. Detail pages get their share
  // metadata injected at the edge instead (see handleCaseMetaFallback in
  // worker.ts); redirects and auth-gated pages have nothing to index.
  { path: "/case/:id", chrome: "app" },
  { path: "/entity/:id", chrome: "app" },
  // Entity record by IRI tail (multi-segment, e.g. organization/.../tu). React
  // Router prefers the more specific :id route for single-segment numeric ids,
  // so this splat only catches the hierarchical entity IRIs.
  { path: "/entity/*", chrome: "app" },
  { path: "/material/*", chrome: "app" },
  { path: "/courtcase/*", chrome: "app" },
  // Data-lake single-type browse pages (unified-archive search, type-pinned).
  //
  // Both render ArchiveSearch with the record type pinned (see Materials.tsx and
  // CourtCases.tsx). They carried no page metadata until 2026-08-11, so they were
  // filtered out of PRE_RENDERED_STATIC_ROUTES below and never pre-rendered: a
  // crawl or a share of either got index.html's bare shell. Metadata in the
  // component cannot fix that on its own, because nothing runs the client render.
  {
    path: "/materials",
    chrome: "app",
    titleKey: "materialsPage.heading",
    descriptionKey: "materialsPage.description",
    keywords: ["materials", "documents", "records", "projects", "publications", "government"],
    icon: "FileText",
    sitemapTitle: "Documents & Other Materials — Jawafdehi",
  },
  {
    path: "/courtcases",
    chrome: "app",
    titleKey: "courtCasesPage.heading",
    descriptionKey: "courtCasesPage.description",
    keywords: ["court", "cases", "hearings", "orders", "supreme", "special", "district", "judiciary"],
    icon: "ShieldCheck",
    sitemapTitle: "Court Cases — Jawafdehi",
  },
  // Wagtail headless preview target.
  { path: "/updates/preview", chrome: "app" },
  { path: "/updates/:slug", chrome: "app" },
  { path: "/data-quality", chrome: "app" },
  { path: "/newsletter/confirmed", chrome: "app" },
  { path: "/newsletter/unsubscribe/:token", chrome: "app" },
  // Redirects to a canonical home: the entities directory folded into search,
  // /information duplicated /faq, and moderation moved under /admin.
  { path: "/entities", chrome: "app" },
  { path: "/information", chrome: "app" },
  { path: "/moderation", chrome: "app" },
] as const satisfies readonly SiteRoute[];

// Every path the SPA will render, as a React Router pattern.
export type RoutePath = (typeof SITE_ROUTES)[number]["path"];

// The pre-rendered subset, in table order. scripts/pre-render.ts renders each of
// these to static HTML at build time; scripts/sitemap.ts and the search index
// read the same rows.
export const PRE_RENDERED_STATIC_ROUTES: readonly StaticSiteRoute[] =
  SITE_ROUTES.filter((route): route is Extract<typeof route, StaticSiteRoute> =>
    "sitemapTitle" in route,
  );

// Updates/news now live in the Wagtail CMS and are fetched at runtime, so there
// are no longer static per-article entries here. Build-time sitemap/prerender of
// individual articles should source these from the CMS API (`getArticles`).
export const UPDATE_ROUTE_ENTRIES: readonly UpdateRouteEntry[] = [];

export function shouldIncludeStaticRouteInSearch(route: StaticSiteRoute): boolean {
  return route.excludeFromSearch !== true;
}

export function shouldIncludeStaticRouteInSitemap(route: StaticSiteRoute): boolean {
  return route.excludeFromSitemap !== true;
}

export function staticRouteToSearchEntry(route: StaticSiteRoute): SearchIndexEntry {
  return {
    path: route.path,
    titleKey: route.titleKey,
    descriptionKey: route.descriptionKey,
    keywords: route.keywords,
    icon: route.icon,
    group: "pages",
  };
}

export function updateRouteToSearchEntry(update: UpdateRouteEntry): SearchIndexEntry {
  return {
    path: `/updates/${update.id}`,
    title: update.title,
    descriptionKey: "searchCommand.descriptions.updateDetail",
    keywords: ["updates", "news", "posts", update.id],
    icon: "Newspaper",
    group: "updates",
  };
}

export function buildFallbackSearchIndexEntries(): SearchIndexEntry[] {
  return [
    ...PRE_RENDERED_STATIC_ROUTES
      .filter(shouldIncludeStaticRouteInSearch)
      .map(staticRouteToSearchEntry),
    ...UPDATE_ROUTE_ENTRIES.map(updateRouteToSearchEntry),
  ];
}
