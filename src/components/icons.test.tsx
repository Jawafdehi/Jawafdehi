// SPDX-License-Identifier: Hippocratic-3.0
import { describe, expect, it } from "vitest";
import { Fragment, createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ICON_PATHS } from "@/components/icon-paths";
import { ChevronDown } from "@/components/icons";

// icon-paths.ts is generated from @phosphor-icons/react so only the light and
// fill drawings ship. These pin that the drawings are Phosphor's own, exactly
// — i.e. the icons look the same as before — and fail if someone adds an icon
// to icons.tsx without rerunning scripts/gen-icon-paths.mjs.
const defs = import.meta.glob<{ default: Map<string, ReactElement> }>(
  "/node_modules/@phosphor-icons/react/dist/defs/*.es.js",
  { eager: true },
);

const phosphor = (name: string, weight: string) => {
  const weights = defs[`/node_modules/@phosphor-icons/react/dist/defs/${name}.es.js`].default;
  return renderToStaticMarkup(createElement(Fragment, null, weights.get(weight)));
};

describe("generated icon paths", () => {
  it.each(Object.keys(ICON_PATHS))("%s is Phosphor's light and fill drawing, unchanged", (name) => {
    const [light, fill] = ICON_PATHS[name];
    expect(light).toBe(phosphor(name, "light"));
    expect(fill).toBe(phosphor(name, "fill"));
  });

  it("covers every icon icons.tsx draws", async () => {
    const source = (await import("@/components/icons.tsx?raw")).default as string;
    const used = [...source.matchAll(/make\("([A-Za-z0-9]+)",/g)].map((m) => m[1]);
    expect(used.filter((name) => !(name in ICON_PATHS))).toEqual([]);
  });

  it("draws the light weight by default and fill for fill-current, as Phosphor's weight prop did", () => {
    const light = renderToStaticMarkup(createElement(ChevronDown, { className: "h-4 w-4" }));
    const filled = renderToStaticMarkup(createElement(ChevronDown, { className: "h-4 w-4 fill-current" }));
    expect(light).toContain(ICON_PATHS.CaretDown[0]);
    expect(filled).toContain(ICON_PATHS.CaretDown[1]);
    // The same svg Phosphor's IconBase rendered: 256 grid, currentColor, the 18% scale.
    expect(light).toMatch(/viewBox="0 0 256 256"/);
    expect(light).toMatch(/fill="currentColor"/);
    expect(light).toMatch(/class="scale-\[1\.18\] h-4 w-4"/);
  });
});
