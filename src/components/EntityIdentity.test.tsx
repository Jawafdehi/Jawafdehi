import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { EntityIdentity } from "@/components/EntityIdentity";

// jsdom does not lay out, so these tests pin the CLASSES that keep a long name
// inside its card: the text block must be width-bound (`w-full` in a tile,
// `flex-1` in a row — never `min-w-0` alone, which lets a centred flex child
// grow to its content), the name must wrap, the alternate must truncate.
// See the header comment in EntityIdentity.tsx for the bug this guards.
const LONG = "Ministry of Land Management, Agriculture and Cooperative, Province No. 5, Butwal, Rupandehi";

describe("EntityIdentity", () => {
  it("binds the tile's text block to the card width", () => {
    render(<EntityIdentity kind="organization" layout="tile" name={LONG} alternate="भूमि व्यवस्था मन्त्रालय" />);
    const text = screen.getByTestId("entity-identity-text");
    expect(text.className).toContain("w-full");
    expect(text.className).toContain("min-w-0");
    expect(screen.getByText(LONG).className).toContain("break-words");
    expect(screen.getByText(LONG).className).not.toContain("line-clamp");
    expect(screen.getByText("भूमि व्यवस्था मन्त्रालय").className).toContain("truncate");
  });

  it("lets the row's text block fill the remaining width", () => {
    render(<EntityIdentity kind="person" layout="row" name={LONG} nameAs="h3" />);
    const text = screen.getByTestId("entity-identity-text");
    expect(text.className).toContain("flex-1");
    expect(text.className).toContain("min-w-0");
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.textContent).toBe(LONG);
    expect(heading.className).toContain("line-clamp-2");
  });

  it("draws the kind glyph when there is no picture and hides it from AT", () => {
    const { container } = render(<EntityIdentity kind="location" layout="tile" name="Nepal" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
