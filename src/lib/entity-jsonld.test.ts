import { describe, it, expect } from "vitest";
import {
  ENTITY_IMAGE_KEY,
  entityImageObject,
  entityImageUrl,
} from "@/lib/entity-jsonld";

// `entityImageUrl` is the ONE resolver behind both the public entity profile
// and the admin picture field, so its branches are worth pinning directly:
// the admin field can only reach the `image` ones, and the profile's `logo`
// fallback is otherwise exercised by nothing in the suite.
describe("entityImageUrl", () => {
  const cases: Array<[string, Record<string, unknown> | null | undefined, string | undefined]> = [
    ["undefined record", undefined, undefined],
    ["null record", null, undefined],
    ["empty record", {}, undefined],
    ["plain string", { image: "https://x.test/a.jpg" }, "https://x.test/a.jpg"],
    ["string is trimmed", { image: "  https://x.test/a.jpg  " }, "https://x.test/a.jpg"],
    ["whitespace-only string is nothing", { image: "   " }, undefined],
    ["empty string is nothing", { image: "" }, undefined],
    ["ImageObject via contentUrl", { image: { contentUrl: "https://x.test/c.jpg" } }, "https://x.test/c.jpg"],
    ["ImageObject via url", { image: { url: "https://x.test/u.jpg" } }, "https://x.test/u.jpg"],
    [
      "url WINS over contentUrl on the same object",
      { image: { url: "https://x.test/u.jpg", contentUrl: "https://x.test/c.jpg" } },
      "https://x.test/u.jpg",
    ],
    ["object with neither key", { image: { "@type": "ImageObject" } }, undefined],
    ["array picks the first usable", { image: ["https://x.test/1.jpg", "https://x.test/2.jpg"] }, "https://x.test/1.jpg"],
    [
      "array SKIPS unusable leading entries",
      { image: ["", { "@type": "ImageObject" }, { contentUrl: "https://x.test/3.jpg" }] },
      "https://x.test/3.jpg",
    ],
    ["nested array", { image: [["https://x.test/n.jpg"]] }, "https://x.test/n.jpg"],
    ["empty array is nothing", { image: [] }, undefined],
    // The fallback the profile relies on and the admin field deliberately does not.
    ["falls back to logo when image is absent", { logo: "https://x.test/l.jpg" }, "https://x.test/l.jpg"],
    [
      "falls back to logo when image is present but unusable",
      { image: [], logo: { contentUrl: "https://x.test/l.jpg" } },
      "https://x.test/l.jpg",
    ],
    [
      "image WINS over logo",
      { image: "https://x.test/i.jpg", logo: "https://x.test/l.jpg" },
      "https://x.test/i.jpg",
    ],
    ["numbers and booleans are not urls", { image: 42 }, undefined],
    ["null image is nothing", { image: null }, undefined],
  ];

  for (const [name, rec, expected] of cases) {
    it(name, () => expect(entityImageUrl(rec)).toBe(expected));
  }
});

describe("entityImageObject", () => {
  it("builds the shape the NES importer already writes", () => {
    expect(entityImageObject("https://x.test/a.webp", 1200, 675)).toEqual({
      "@type": "ImageObject",
      contentUrl: "https://x.test/a.webp",
      width: 1200,
      height: 675,
    });
  });

  it("keeps width and height in the order they were given", () => {
    // Guards the pairing at the call site: a transposition here would store
    // dimensions that describe a different file than `contentUrl`.
    const o = entityImageObject("https://x.test/a.webp", 1200, 675);
    expect(o.width).toBe(1200);
    expect(o.height).toBe(675);
  });

  it("round-trips through the resolver", () => {
    const o = entityImageObject("https://x.test/a.webp", 1200, 675);
    expect(entityImageUrl({ [ENTITY_IMAGE_KEY]: o })).toBe("https://x.test/a.webp");
  });

  it("omits absent dimensions rather than serialising undefined", () => {
    // The PATCH value travels as a JS object; a key present with `undefined`
    // survives axios' JSON serialisation as an absent key, but only because
    // JSON.stringify drops it — assert the built object so a future change to
    // the transport cannot quietly start writing nulls.
    expect(JSON.parse(JSON.stringify(entityImageObject("https://x.test/a.webp")))).toEqual({
      "@type": "ImageObject",
      contentUrl: "https://x.test/a.webp",
    });
  });
});
