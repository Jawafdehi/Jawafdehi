import { describe, it, expect } from "vitest";

import { buttonVariants } from "@/components/ui/button";

describe("the ghost button's hover state", () => {
  it("colours the label, not a block behind it", () => {
    // A ghost button has no border and no fill. Painting its whole box on
    // hover draws a shape that was not there a moment ago, and in a column of
    // them it reads as the ROW being selected rather than the control being
    // pointed at.
    const classes = buttonVariants({ variant: "ghost" });

    expect(classes).toContain("hover:text-primary");
    expect(classes).not.toContain("hover:bg-accent");
  });

  it("keeps the block on an icon-only ghost, which has no label to colour", () => {
    // 16 of the 67 ghost call sites are icon-only. A 16px glyph changing hue
    // is not a hover state, so these keep the only affordance they have.
    for (const size of ["icon", "navMenuIcon"] as const) {
      const classes = buttonVariants({ variant: "ghost", size });
      expect(classes).toContain("hover:bg-accent");
    }
  });

  it("leaves the other variants' hover states alone", () => {
    // The compound rule is keyed on ghost; a sized button of another variant
    // must not pick it up.
    expect(buttonVariants({ variant: "outline", size: "icon" })).not.toContain(
      "hover:text-primary",
    );
    expect(buttonVariants({ variant: "default" })).toContain(
      "hover:bg-primary-surface/85",
    );
  });
});
