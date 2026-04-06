import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DisqusComments } from "@/components/DisqusComments";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";

// Mock disqus-react
interface MockDiscussionEmbedProps {
  shortname: string;
  config: { identifier: string };
}

vi.mock("disqus-react", () => ({
  DiscussionEmbed: vi.fn(({ shortname, config }: MockDiscussionEmbedProps) => (
    <div data-testid="disqus-embed" data-shortname={shortname} data-identifier={config.identifier}>
      Disqus Comments Widget
    </div>
  )),
}));

// Mock IntersectionObserver
const mockIntersectionObserverObserve = vi.fn();
const mockIntersectionObserverDisconnect = vi.fn();

// Save original IntersectionObserver to restore after tests
const originalIntersectionObserver = globalThis.IntersectionObserver;

class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe = mockIntersectionObserverObserve.mockImplementation(() => {
    // Simulate immediate intersection
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  });

  disconnect = mockIntersectionObserverDisconnect;
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = "";
  thresholds = [];
}

beforeEach(() => {
  // Setup i18n for tests
  i18n.init({
    lng: "en",
    resources: {
      en: {
        translation: {
          caseDetail: {
            comments: {
              title: "Public Discussion",
              loading: "Loading comments...",
              joinDiscussion: "Join the discussion and share your thoughts on this case.",
              loadComments: "Load Comments",
            },
          },
        },
      },
      ne: {
        translation: {
          caseDetail: {
            comments: {
              title: "सार्वजनिक छलफल",
              loading: "टिप्पणीहरू लोड हुँदैछ...",
              joinDiscussion: "यस मुद्दामा आफ्नो विचार साझा गर्न छलफलमा सामेल हुनुहोस्।",
              loadComments: "टिप्पणीहरू लोड गर्नुहोस्",
            },
          },
        },
      },
    },
  });

  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  globalThis.IntersectionObserver = originalIntersectionObserver;
});

describe("DisqusComments", () => {
  const defaultProps = {
    caseId: "123",
    caseTitle: "भ्रष्टाचार मुद्दा",
    caseUrl: "https://jawafdehi.org/case/123",
  };

  describe("when Disqus shortname is not configured", () => {
    it("should render nothing", () => {
      vi.stubEnv("VITE_DISQUS_SHORTNAME", "");
      
      const { container } = render(
        <I18nextProvider i18n={i18n}>
          <DisqusComments {...defaultProps} />
        </I18nextProvider>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("when Disqus shortname is configured", () => {
    beforeEach(() => {
      vi.stubEnv("VITE_DISQUS_SHORTNAME", "test-shortname");
    });

    it("should render the comments section with correct heading", () => {
      render(
        <I18nextProvider i18n={i18n}>
          <DisqusComments {...defaultProps} />
        </I18nextProvider>
      );

      expect(screen.getByRole("heading", { name: /public discussion/i })).toBeTruthy();
    });

    it("should render join discussion text", () => {
      render(
        <I18nextProvider i18n={i18n}>
          <DisqusComments {...defaultProps} />
        </I18nextProvider>
      );

      expect(screen.getByText(/join the discussion/i)).toBeTruthy();
    });

    it("should show load comments button initially", () => {
      render(
        <I18nextProvider i18n={i18n}>
          <DisqusComments {...defaultProps} />
        </I18nextProvider>
      );

      expect(screen.getByRole("button", { name: /load comments/i })).toBeTruthy();
    });

    it("should load Disqus widget when load button is clicked", async () => {
      vi.useFakeTimers();
      
      render(
        <I18nextProvider i18n={i18n}>
          <DisqusComments {...defaultProps} />
        </I18nextProvider>
      );

      const loadButton = screen.getByRole("button", { name: /load comments/i });
      fireEvent.click(loadButton);

      // Wait for the timeout in the component
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(screen.getByTestId("disqus-embed")).toBeTruthy();
    });

    it("should have correct ARIA attributes for accessibility", () => {
      render(
        <I18nextProvider i18n={i18n}>
          <DisqusComments {...defaultProps} />
        </I18nextProvider>
      );

      const section = screen.queryByRole("region", { hidden: true }) ?? 
                      document.querySelector("section[aria-labelledby='comments-heading']");
      
      expect(section?.getAttribute("aria-labelledby")).toBe("comments-heading");
    });

    it("should have print:hidden class for print exclusion", () => {
      render(
        <I18nextProvider i18n={i18n}>
          <DisqusComments {...defaultProps} />
        </I18nextProvider>
      );

      const section = document.querySelector(".disqus-comments");
      expect(section?.classList.contains("print:hidden")).toBe(true);
    });
  });

  describe("Disqus configuration", () => {
    beforeEach(() => {
      vi.stubEnv("VITE_DISQUS_SHORTNAME", "jawafdehi-nepal");
    });

    it("should pass correct identifier to Disqus", async () => {
      vi.useFakeTimers();
      
      render(
        <I18nextProvider i18n={i18n}>
          <DisqusComments {...defaultProps} />
        </I18nextProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: /load comments/i }));
      act(() => {
        vi.advanceTimersByTime(150);
      });

      const disqusEmbed = screen.getByTestId("disqus-embed");
      expect(disqusEmbed.getAttribute("data-identifier")).toBe("case-123");
      expect(disqusEmbed.getAttribute("data-shortname")).toBe("jawafdehi-nepal");
    });
  });

  describe("language switching", () => {
    beforeEach(() => {
      vi.stubEnv("VITE_DISQUS_SHORTNAME", "test-shortname");
    });

    it("should display Nepali translations when language is ne", async () => {
      await i18n.changeLanguage("ne");
      
      render(
        <I18nextProvider i18n={i18n}>
          <DisqusComments {...defaultProps} />
        </I18nextProvider>
      );

      expect(screen.getByRole("heading", { name: /सार्वजनिक छलफल/i })).toBeTruthy();
      expect(screen.getByText(/छलफलमा सामेल हुनुहोस्/i)).toBeTruthy();
    });

    it("should display English translations when language is en", async () => {
      await i18n.changeLanguage("en");
      
      render(
        <I18nextProvider i18n={i18n}>
          <DisqusComments {...defaultProps} />
        </I18nextProvider>
      );

      expect(screen.getByRole("heading", { name: /public discussion/i })).toBeTruthy();
    });
  });
});
