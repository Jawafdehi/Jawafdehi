import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { DocumentSourceCard } from "@/components/DocumentSourceCard";
import type { SourceLink } from "@/types/jds";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === "string" ? fallback : key,
    i18n: { language: "en" },
  }),
}));

const ORIGINAL_MD = "https://s3.jawafdehi.org/case_uploads/aaa.md";
const REDACTED_MD = "https://s3.jawafdehi.org/case_uploads/bbb.md";
const OUR_PDF = "https://s3.jawafdehi.org/case_uploads/ccc.pdf";
const REDACTED_PDF = "https://s3.jawafdehi.org/case_uploads/ddd.pdf";
const PUBLISHER_PDF = "https://ag.gov.np/storage/abhiyogPatra/x.pdf";

const renderCard = (urls: SourceLink[]) =>
  render(
    <MemoryRouter>
      <DocumentSourceCard
        material={{ display_name: "Charge sheet", material_type: "charge_sheet", urls }}
        materialIri="https://jawafdehi.org/material/ag/1"
        itemNumber={1}
      />
    </MemoryRouter>,
  ).container.innerHTML;

describe("DocumentSourceCard never shows staff-only originals", () => {
  it("drops our original transcript and PDF when redacted copies exist", () => {
    const html = renderCard([
      { link: OUR_PDF, role: "RAW" },
      { link: REDACTED_PDF, role: "REDACTED_PDF" },
      { link: ORIGINAL_MD, role: "MARKDOWN" },
      { link: REDACTED_MD, role: "REDACTED_MARKDOWN" },
      { link: PUBLISHER_PDF, role: "PRIMARY" },
    ] as SourceLink[]);

    expect(html).not.toContain(ORIGINAL_MD);
    expect(html).not.toContain(OUR_PDF);
    expect(html).toContain(REDACTED_MD);
    expect(html).toContain(PUBLISHER_PDF);
  });

  it("keeps our original when there is no redacted copy to show instead", () => {
    const html = renderCard([{ link: ORIGINAL_MD, role: "MARKDOWN" }] as SourceLink[]);
    expect(html).toContain(ORIGINAL_MD);
  });
});
