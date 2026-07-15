import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { MaterialsBySource } from "@/components/data-quality/MaterialsBySource";
import { MOCK_STATISTICS } from "@/lib/data-quality-mock";

// Passthrough translations: `t(key, fallback)` returns the fallback string, or
// the key itself when no fallback is given. The component passes each i18n key's
// leaf (`ag`, `courts`, `chargeSheet`...) as its own fallback, so labels render
// as those stable keys — enough to assert the roll-up structure without pulling
// in i18n resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>, opts?: Record<string, unknown>) => {
      const tmpl = typeof fallback === "string" ? fallback : key;
      const vars = (typeof fallback === "string" ? opts : fallback) as
        | Record<string, unknown>
        | undefined;
      return vars
        ? tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""))
        : tmpl;
    },
    i18n: { language: "en" },
  }),
}));

/** The <tr> whose cells include the given text. */
function rowContaining(text: string): HTMLElement {
  return screen.getByText(text).closest("tr")!;
}

describe("MaterialsBySource", () => {
  const { materials } = MOCK_STATISTICS;

  it("rolls sources up into publishing institutions", () => {
    render(<MaterialsBySource materials={materials} />);
    // court_order source is named after the institution, not the document type.
    expect(screen.getByText("courts")).toBeTruthy();
    // ag → Office of the Attorney General.
    expect(screen.getByText("ag")).toBeTruthy();
    // The CIAA source cell appears once (it row-spans its two type rows).
    expect(screen.getAllByText("ciaa").length).toBe(1);
    // nkp + kanun_patrika collapse into ONE nkp row.
    expect(screen.getAllByText("nkp").length).toBe(1);
  });

  it("gives each CIAA document type its own row with its own count", () => {
    render(<MaterialsBySource materials={materials} />);
    // Press releases (3,438) and annual/official reports (41) are SEPARATE rows,
    // each with its own count — not a single combined cell.
    const press = rowContaining("pressRelease");
    expect(within(press).getByText("3,438")).toBeTruthy();
    const reports = rowContaining("officialReport");
    expect(within(reports).getByText("41")).toBeTruthy();
    // Both live under one spanning CIAA source cell.
    expect(within(press).queryByText("ciaa")).toBeTruthy();
  });

  it("keeps single-type institutions on one row and excludes jawafdehi", () => {
    render(<MaterialsBySource materials={materials} />);
    // Nepal Courts contribute court orders (one row).
    const courts = rowContaining("courts");
    expect(within(courts).getByText("courtOrder")).toBeTruthy();
    expect(within(courts).getByText("23,233")).toBeTruthy();
    // The jawafdehi source is deliberately excluded from this table.
    expect(screen.queryByText("jawafdehi")).toBeNull();
  });

  it("names what generic-document sources actually publish", () => {
    render(<MaterialsBySource materials={materials} />);
    // DFMIS and PPMO carry the generic `document` type in the DB; the table must
    // name their real output (via the per-source `publishes` string), never a
    // bare "Documents" row.
    const dfmis = rowContaining("dfmis");
    expect(within(dfmis).getByText("publishes.dfmis")).toBeTruthy();
    expect(within(dfmis).queryByText("document")).toBeNull();
    const ppmo = rowContaining("ppmo");
    expect(within(ppmo).getByText("publishes.ppmo")).toBeTruthy();
  });
});
