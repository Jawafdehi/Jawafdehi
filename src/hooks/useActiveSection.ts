import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

/**
 * The section in view: the last one whose top has passed the middle of the
 * viewport, or the last of all once the page bottoms out.
 */
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? "");
  const key = ids.join("|");

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (elements.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const readingLine = window.innerHeight * 0.5;
      let next = elements[0].id;
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= readingLine) next = element.id;
        else break;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
        next = elements[elements.length - 1].id;
      }
      setActive((current) => (current === next ? current : next));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
    // `ids` is rebuilt by callers each render; its contents are the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return active;
}

/** Smooth-scroll to a section and keep the URL shareable, without a router navigation. */
export function jumpToSection(sectionId: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${sectionId}`);
  };
}
