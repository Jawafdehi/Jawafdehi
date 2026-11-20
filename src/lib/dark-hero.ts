/**
 * Which pages open on a full-bleed navy hero. The navbar and the social bar
 * above it both read this, so the top of the page is one colour: light-on-dark
 * chrome over a navy hero, the normal navy-on-light everywhere else.
 */

/** Routes whose page opens on a navy hero. */
const DARK_HERO_PATHS = new Set(["/", "/mcp", "/mcp/", "/likhit", "/likhit/"]);

// /materials opens on the navy landing unless its query sends it on to
// /search (pages/Materials.tsx). The folder browser's own ?path= and ?view=
// keep it on the landing, so they keep the chrome light-on-dark too.
const MATERIALS_PATHS = new Set(["/materials", "/materials/"]);
const MATERIALS_LANDING_PARAMS = new Set(["path", "view"]);

function isMaterialsLanding(pathname: string, search: string): boolean {
  if (!MATERIALS_PATHS.has(pathname)) return false;
  return [...new URLSearchParams(search).keys()].every((name) => MATERIALS_LANDING_PARAMS.has(name));
}

export function opensOnDarkHero(pathname: string, search = ""): boolean {
  return DARK_HERO_PATHS.has(pathname) || isMaterialsLanding(pathname, search);
}
