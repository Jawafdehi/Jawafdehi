const CASE_CONTENT_MAX_WIDTH = 1408;
const CASE_CONTENT_HORIZONTAL_PADDING = 16;
const SIDEBAR_WIDTH = 56;
const SIDEBAR_GAP = 12;
const MIN_SAFE_LEFT = 12;
export const CASE_COMMENTS_SECTION_ID = "case-comments-section";

export type CaseShareBarPlacement =
  | { mode: "sidebar"; left: number }
  | { mode: "top" };

export const getCaseShareBarLeftOffset = (viewportWidth: number): number | null => {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return null;
  }

  const containerWidth = Math.min(viewportWidth, CASE_CONTENT_MAX_WIDTH);
  const contentLeft = (viewportWidth - containerWidth) / 2 + CASE_CONTENT_HORIZONTAL_PADDING;
  const sidebarLeft = contentLeft - SIDEBAR_WIDTH - SIDEBAR_GAP;

  return sidebarLeft >= MIN_SAFE_LEFT ? Math.round(sidebarLeft) : null;
};

export const getCaseShareBarPlacement = (
  viewportWidth: number,
): CaseShareBarPlacement => {
  void viewportWidth;
  return { mode: "top" };
};

export const scrollToCommentsSection = (): boolean => {
  const section = document.getElementById(CASE_COMMENTS_SECTION_ID);
  if (!section) return false;

  section.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
};
