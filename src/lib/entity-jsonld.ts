// Helpers for authoring entity schema.org JSON-LD in the admin panel.
//
// Mirrors the backend write contract (entity write_validation +
// validation.py): the known @type vocabulary, the immutable patch paths, and an
// RFC-6902 diff for the edit form (since no json-patch lib is bundled).
import type { PatchOp } from "@/services/admin-api";

// Known @type vocabulary — kept in sync with validation.KNOWN_SCHEMAORG_TYPES
// and KNOWN_JAWAFDEHI_TYPES. jawafdehi: types carry the CURIE prefix.
export const SCHEMAORG_TYPES = [
  "Thing",
  "Person",
  "Organization",
  "GovernmentOrganization",
  "NGO",
  "Corporation",
  "EducationalOrganization",
  "Hospital",
  "Place",
  "AdministrativeArea",
  "Courthouse",
  "CivicStructure",
  "Project",
  "GovernmentService",
  "CreativeWork",
  "Service",
] as const;

export const JAWAFDEHI_TYPES = [
  "jawafdehi:PoliticalParty",
  "jawafdehi:Contractor",
  "jawafdehi:JudicialBody",
  "jawafdehi:InternationalOrganization",
  "jawafdehi:Province",
  "jawafdehi:District",
  "jawafdehi:MetropolitanCity",
  "jawafdehi:SubMetropolitanCity",
  "jawafdehi:Municipality",
  "jawafdehi:RuralMunicipality",
  "jawafdehi:Ward",
  "jawafdehi:ElectoralConstituency",
  "jawafdehi:DevelopmentProject",
] as const;

export const ALL_ENTITY_TYPES = [...SCHEMAORG_TYPES, ...JAWAFDEHI_TYPES];

// JSON Pointer prefixes the backend forbids in a PATCH. Mirrors
// write_validation.PATCH_BLOCKED_PATH_PREFIXES.
const BLOCKED_PATCH_PREFIXES = [
  "/@id",
  "/@type",
  "/@context",
  "/jawafdehi:version",
];

export function isBlockedPatchPath(path: string): boolean {
  return BLOCKED_PATCH_PREFIXES.some(
    (b) => path === b || path.startsWith(b + "/"),
  );
}

// RFC-6901 token escaping: ~ -> ~0, / -> ~1.
function escapeToken(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

// Slug rule mirrors ids._SLUG: lowercase alnum, hyphen-separated.
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
// prefix is one or more lowercase/_/digit segments joined by '/'.
export const PREFIX_RE = /^[a-z0-9_]+(?:\/[a-z0-9_]+){0,3}$/;

// --- Entity picture (schema.org `image`) -------------------------------------

// The JSON-LD key the admin picture field owns. Named so the two forms and the
// field itself agree without repeating the literal.
export const ENTITY_IMAGE_KEY = "image";

// The shape a picture is STORED in. Fixed by the NES→schema.org mapping the
// importer already follows (docs/shared/research/nes-schema-org.md §5:
// `pictures[]` → `image` (`ImageObject`) with contentUrl/width/height/caption),
// so an admin upload and an imported record are the same shape and the reader
// below needs no special case for ours.
export interface EntityImageObject {
  "@type": "ImageObject";
  contentUrl: string;
  width?: number;
  height?: number;
}

export function entityImageObject(
  contentUrl: string,
  width?: number,
  height?: number,
): EntityImageObject {
  return { "@type": "ImageObject", contentUrl, width, height };
}

// schema.org image/logo → ONE display URL, or undefined when there's nothing
// usable. Accepts a plain string, an ImageObject via url/contentUrl, or an
// array of either, because imported records carry all three forms.
//
// This lives here rather than beside either caller so the admin field's preview
// and the public profile resolve the SAME url: if they disagreed, an editor
// could upload a picture, see it in the preview, and have the profile keep
// rendering the glyph (or an older array entry) with nothing to explain why.
export function entityImageUrl(
  rec: Record<string, unknown> | null | undefined,
): string | undefined {
  const pick = (v: unknown): string | undefined => {
    if (typeof v === "string") return v.trim() || undefined;
    if (Array.isArray(v)) {
      for (const x of v) {
        const u = pick(x);
        if (u) return u;
      }
      return undefined;
    }
    if (v && typeof v === "object") {
      const o = v as { url?: unknown; contentUrl?: unknown };
      if (typeof o.url === "string" && o.url.trim()) return o.url.trim();
      if (typeof o.contentUrl === "string" && o.contentUrl.trim())
        return o.contentUrl.trim();
    }
    return undefined;
  };
  return pick(rec?.[ENTITY_IMAGE_KEY]) ?? pick(rec?.logo);
}

// A minimal RFC-6902 diff between two JSON documents, scoped to the top-level
// object keys an editor touches. We intentionally emit whole-key replace/add/
// remove ops (not deep array diffs) — simpler and unambiguous for the form,
// where a user edits one field at a time. Blocked paths are skipped (the form
// never exposes them, but this is a belt-and-suspenders guard).
export function diffToPatchOps(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): PatchOp[] {
  const ops: PatchOp[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const path = "/" + escapeToken(key);
    if (isBlockedPatchPath(path)) continue;
    const inBefore = key in before;
    const inAfter = key in after;
    if (inBefore && !inAfter) {
      ops.push({ op: "remove", path });
    } else if (!inBefore && inAfter) {
      ops.push({ op: "add", path, value: after[key] });
    } else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      ops.push({ op: "replace", path, value: after[key] });
    }
  }
  return ops;
}
