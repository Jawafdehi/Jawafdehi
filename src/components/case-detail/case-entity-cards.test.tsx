import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CaseEntityCards } from "@/components/case-detail/case-entity-cards";
import type { JawafEntity } from "@/types/jds";
import type { Entity } from "@/types/entity";

// Passthrough translations, with `count` folded into the key so the "view more"
// assertions don't depend on i18n resources (mirrors case-overview-section.test).
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) =>
      opts?.count === undefined ? key : `${key}:${opts.count}`,
  }),
}));

const party = (over: Partial<JawafEntity> = {}): JawafEntity => ({
  nes_id: "https://jawafdehi.org/entity/person/ram-shah",
  display_name: "Ram Shah",
  type: "accused",
  entity_type: "Person",
  outcome: "convicted",
  notes: "<p>Charged with embezzling NPR 4,00,000.</p>",
  ...over,
});

function renderCards(entities: JawafEntity[], initialLimit = 9) {
  return render(
    <MemoryRouter>
      <CaseEntityCards
        entities={entities}
        resolvedEntities={{}}
        language="en"
        initialLimit={initialLimit}
      />
    </MemoryRouter>,
  );
}

// The card element carries the single state the transform reads.
function cardOf(container: HTMLElement): HTMLElement {
  const card = container.querySelector<HTMLElement>("[data-flipped]");
  if (!card) throw new Error("no flip card rendered");
  return card;
}

const flipped = (container: HTMLElement) => cardOf(container).getAttribute("data-flipped");

// The flip has three triggers (tap/Enter, hover, focus reaching the details
// link). They all have to agree with `aria-expanded`, because the transform is
// invisible to assistive tech: an out-of-sync value is the only thing a screen
// reader user has to go on. An earlier revision drove hover and focus from CSS
// `group-hover:` / `group-focus-within:` variants, which ARIA cannot observe.
describe("CaseEntityCards — the flip and what it announces", () => {
  it("starts at rest, and says so", () => {
    const { container } = renderCards([party()]);

    expect(flipped(container)).toBe("false");
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps the card at rest while the front button merely holds focus, so pressing it still has something to do", () => {
    const { container } = renderCards([party()]);
    const front = screen.getByRole("button");

    front.focus();
    expect(document.activeElement).toBe(front);
    expect(flipped(container)).toBe("false");
    expect(front.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(front);
    expect(flipped(container)).toBe("true");
    expect(front.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(front);
    expect(flipped(container)).toBe("false");
    expect(front.getAttribute("aria-expanded")).toBe("false");
  });

  it("reveals the card when Tab reaches the details link, so focus never lands on a face that is turned away", () => {
    const { container } = renderCards([party()]);
    const details = screen.getByRole("link");

    fireEvent.focus(details);
    expect(flipped(container)).toBe("true");
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("true");

    fireEvent.blur(details);
    expect(flipped(container)).toBe("false");
  });

  // Hiding a focused control from assistive tech is a WCAG 4.1.2 failure, and a
  // keyboard user whose pointer happens to rest on the card would hit exactly
  // that: hover set aria-hidden on the button that held focus.
  it("never hides the front button from assistive tech", () => {
    const { container } = renderCards([party()]);
    const front = screen.getByRole("button");

    front.focus();
    fireEvent.mouseEnter(cardOf(container));

    expect(front.hasAttribute("aria-hidden")).toBe(false);
    expect(document.activeElement).toBe(front);
    expect(front.tabIndex).toBe(0);
  });

  it("does not leave a tapped card turned over once the pointer moves on", () => {
    const { container } = renderCards([party()]);
    const card = cardOf(container);

    // A tap fires an emulated mouseenter alongside the click.
    fireEvent.mouseEnter(card);
    fireEvent.click(screen.getByRole("button"));
    expect(flipped(container)).toBe("true");

    fireEvent.mouseLeave(card);
    expect(flipped(container)).toBe("false");
  });
});

describe("CaseEntityCards — which parties flip at all", () => {
  it("constrains a long alternate-language name to its card", () => {
    const longAlternateName = "Tek Narayan Pandey (Then-Secretary of Land Management)";
    const entity: Pick<Entity, "names"> = {
      names: [
        {
          kind: "PRIMARY",
          en: { full: "Tek Narayan Pandey" },
          ne: { full: longAlternateName },
        },
      ],
    };

    render(
      <MemoryRouter>
        <CaseEntityCards
          entities={[party()]}
          resolvedEntities={{ [party().nes_id!]: entity as Entity }}
          language="en"
          initialLimit={9}
        />
      </MemoryRouter>,
    );

    // The alternate label uses `truncate`; its parent must fill, rather than
    // grow beyond, the card for that overflow rule to take effect.
    expect(screen.getByText(longAlternateName).parentElement?.className).toContain("w-full");
  });

  it("leaves a party with nothing to reveal as a plain link, with no disclosure control", () => {
    const { container } = renderCards([party({ notes: "", outcome: null })]);

    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("[data-flipped]")).toBeNull();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/entity/person/ram-shah");
  });

  it("treats a punctuation-only note as no note", () => {
    renderCards([party({ notes: "<p> - </p>", outcome: null })]);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("flips for an undecided accused who still carries charge notes", () => {
    renderCards([party({ outcome: "charged" })]);

    // `charged` is the undecided default and renders no badge, but the notes
    // are still worth a details face.
    const details = screen.getByRole("link");
    expect(within(details).queryByText(/embezzling/)).not.toBeNull();
    expect(within(details).queryByText("Charged")).toBeNull();
  });

  it("renders the decided verdict on the details face", () => {
    renderCards([party({ outcome: "acquitted" })]);

    // The verdict sits on the front, under the name, not on the details face.
    expect(within(screen.getByRole("button")).queryByText("Acquitted")).not.toBeNull();
    expect(within(screen.getByRole("link")).queryByText("Acquitted")).toBeNull();
  });

  it("orders decided verdicts first: convicted, acquitted, abated, then charged", () => {
    renderCards([
      party({ nes_id: "https://jawafdehi.org/entity/person/a", display_name: "A", outcome: "charged" }),
      party({ nes_id: "https://jawafdehi.org/entity/person/b", display_name: "B", outcome: "acquitted" }),
      party({ nes_id: "https://jawafdehi.org/entity/person/c", display_name: "C", outcome: "abated" }),
      party({ nes_id: "https://jawafdehi.org/entity/person/d", display_name: "D", outcome: "convicted" }),
    ]);
    const names = screen.getAllByRole("button").map((b) => b.textContent?.trim().charAt(0));
    expect(names).toEqual(["D", "B", "C", "A"]);
  });
});

describe("CaseEntityCards — the view-more toggle", () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      party({ nes_id: `https://jawafdehi.org/entity/person/p-${i}`, display_name: `Party ${i}` }),
    );

  it("shows every party and no toggle when the group fits", () => {
    renderCards(many(9));

    expect(screen.getAllByRole("link")).toHaveLength(9);
    expect(screen.queryByText(/showMoreParties/)).toBeNull();
  });

  it("caps the group at initialLimit and counts the remainder", () => {
    renderCards(many(12));

    expect(screen.getAllByRole("link")).toHaveLength(9);
    const toggle = screen.getByText("caseDetail.showMoreParties:3");

    fireEvent.click(toggle);
    expect(screen.getAllByRole("link")).toHaveLength(12);
    expect(screen.queryByText("caseDetail.showLessParties")).not.toBeNull();
  });
});
