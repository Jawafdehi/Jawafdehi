import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LinkifiedText } from "@/components/LinkifiedText";
import { linkifyText, sourceLabel } from "@/lib/linkify";

describe("linkifyText", () => {
  it("turns a 'Source: <url>' description into text plus a labelled link", () => {
    const url =
      "https://ekantipur.com/news/2025/01/09/en/forensic-examination-proved-that-lamichhanes-signature-38-44.html";

    expect(linkifyText(`Source: ${url}`)).toEqual([
      { kind: "text", text: "Source: " },
      { kind: "link", href: url, label: "Kantipur", title: url },
    ]);
  });

  it("leaves trailing punctuation and an unbalanced bracket outside the link", () => {
    const segments = linkifyText(
      "Source: Rabi Lamichhane Twitter (https://x.com/hamrorabi/status/1749489567135338894/).",
    );

    expect(segments).toEqual([
      { kind: "text", text: "Source: Rabi Lamichhane Twitter (" },
      expect.objectContaining({
        kind: "link",
        href: "https://x.com/hamrorabi/status/1749489567135338894/",
        label: "X",
      }),
      { kind: "text", text: ")." },
    ]);
  });

  it("does not swallow a Nepali danda ending the sentence", () => {
    expect(linkifyText("स्रोत: https://ekantipur.com/news/article.html।")).toEqual([
      { kind: "text", text: "स्रोत: " },
      expect.objectContaining({ href: "https://ekantipur.com/news/article.html", label: "Kantipur" }),
      { kind: "text", text: "।" },
    ]);
  });

  it("keeps balanced brackets that belong to the URL", () => {
    const url = "https://en.wikipedia.org/wiki/Rabi_Lamichhane_(politician)";
    expect(linkifyText(url)).toEqual([
      expect.objectContaining({ kind: "link", href: url, label: "en.wikipedia.org" }),
    ]);
  });

  it("only links http(s): other schemes and bare domains stay text", () => {
    const text = "javascript:alert(1) ftp://files.example.org ekantipur.com";
    expect(linkifyText(text)).toEqual([{ kind: "text", text }]);
  });

  it("returns plain text untouched", () => {
    expect(linkifyText("Judges: रमेश ढकाल, स्वीकृति पराजुली")).toEqual([
      { kind: "text", text: "Judges: रमेश ढकाल, स्वीकृति पराजुली" },
    ]);
  });

  it("decodes percent-escapes for the tooltip only", () => {
    const url = "https://setopati.com/%E0%A4%B8%E0%A4%AE%E0%A4%BE%E0%A4%9A%E0%A4%BE%E0%A4%B0";
    const [link] = linkifyText(url);
    expect(link).toMatchObject({ href: url, label: "Setopati", title: "https://setopati.com/समाचार" });
  });
});

describe("sourceLabel", () => {
  it("names known outlets and platforms, ignoring www. and m.", () => {
    expect(sourceLabel("https://www.facebook.com/story.php?story_fbid=1")).toBe("Facebook");
    expect(sourceLabel("https://m.youtube.com/watch?v=abc")).toBe("YouTube");
    expect(sourceLabel("https://kathmandupost.com/national/2022/06/15/x")).toBe("The Kathmandu Post");
  });

  it("falls back to the host for unknown sites", () => {
    expect(sourceLabel("https://www.ciaa.gov.np/pressrelease/2402")).toBe("ciaa.gov.np");
  });
});

describe("LinkifiedText", () => {
  it("renders a safe external link that opens in a new tab", () => {
    render(<LinkifiedText text="Source: https://ekantipur.com/news/2025/01/09/a.html" />);

    const link = screen.getByRole("link", { name: /Kantipur/ });
    expect(link.getAttribute("href")).toBe("https://ekantipur.com/news/2025/01/09/a.html");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
    expect(link.parentElement?.textContent).toBe("Source: Kantipur");
  });
});
