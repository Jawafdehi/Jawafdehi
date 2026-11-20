import { beforeEach, describe, expect, it, vi } from "vitest";

const { getArticlesMock, getArticleBySlugMock } = vi.hoisted(() => ({
  getArticlesMock: vi.fn(),
  getArticleBySlugMock: vi.fn(),
}));

vi.mock("@/services/cms-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/cms-api")>()),
  getArticles: getArticlesMock,
  getArticleBySlug: getArticleBySlugMock,
}));

const { render } = await import("../../src/entry-server");
const { WHATS_NEW, whatsNewPostPath } = await import("@/data/whats-new");

const hasArticles = (state: { queries: { queryKey: readonly unknown[] }[] }) =>
  state.queries.some((query) => query.queryKey[0] === "cms-articles");

/**
 * Updates & News is the one list whose stories come from the CMS, about a
 * second away. Missing the prefetch costs nothing visible in SSR, which still
 * returns valid HTML; the page just ships skeletons and waits in the browser.
 */
describe("SSR prefetch for Updates & News", () => {
  beforeEach(() => {
    getArticlesMock.mockReset().mockResolvedValue([]);
    getArticleBySlugMock.mockReset().mockResolvedValue(null);
  });

  it.each(["/updates", "/updates/", "/updates/?filter=product", "/updates?filter=news"])(
    "dehydrates the stories for %s",
    async (url) => {
      const { dehydratedState } = await render(url);
      expect(hasArticles(dehydratedState)).toBe(true);
    },
  );

  it("never asks the CMS for an article on a product update's page", async () => {
    await render(whatsNewPostPath(WHATS_NEW[0].id));
    expect(getArticleBySlugMock).not.toHaveBeenCalled();
  });

  it("still fetches a CMS article on its own page", async () => {
    await render("/updates/some-story/");
    expect(getArticleBySlugMock).toHaveBeenCalledWith("some-story");
  });
});
