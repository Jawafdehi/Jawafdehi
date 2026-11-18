import { describe, expect, it } from "vitest";

import { casePath } from "@/lib/case-links";

describe("casePath", () => {
  it("is slash-terminated, the canonical form the edge does not redirect", () => {
    expect(casePath("bhaktapur-malpot-bribe-076-cr-0047")).toBe(
      "/case/bhaktapur-malpot-bribe-076-cr-0047/",
    );
  });

  it("does not double a slash already present", () => {
    expect(casePath("giribandhu-tea-estate-land-swap/")).toBe("/case/giribandhu-tea-estate-land-swap/");
  });

  it("keeps a legacy upper-case court ref as stored", () => {
    expect(casePath("madhesh-pathology-lab-081-CR-0081")).toBe("/case/madhesh-pathology-lab-081-CR-0081/");
  });
});
