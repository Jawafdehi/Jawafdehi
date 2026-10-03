import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { OpenHouseSignupForm } from "@/components/open-house/signup-form";
import { JDSApiError, subscribeToNewsletter } from "@/services/jds-api";
import { setNewsletterPromptState } from "@/lib/newsletter";

// Passthrough i18n so assertions don't depend on translation resources.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "ne", language: "ne" },
  }),
}));

vi.mock("@/services/jds-api", async () => {
  const actual = await vi.importActual<typeof import("@/services/jds-api")>(
    "@/services/jds-api",
  );
  return { ...actual, subscribeToNewsletter: vi.fn() };
});

vi.mock("@/lib/newsletter", () => ({ setNewsletterPromptState: vi.fn() }));

// The region pre-fill reads the browser timezone; pin it so the payload is
// deterministic rather than dependent on where the test runs.
vi.mock("@/components/open-house/regions", async () => {
  const actual = await vi.importActual<typeof import("@/components/open-house/regions")>(
    "@/components/open-house/regions",
  );
  return { ...actual, detectRegion: () => "gulf-middle-east" as const };
});

const subscribeMock = vi.mocked(subscribeToNewsletter);
const promptMock = vi.mocked(setNewsletterPromptState);

function renderForm() {
  return render(
    <MemoryRouter>
      <OpenHouseSignupForm />
    </MemoryRouter>,
  );
}

function fillRequired() {
  fireEvent.change(screen.getByLabelText(/openHouse\.signup\.name/), {
    target: { value: "Sita" },
  });
  fireEvent.change(screen.getByLabelText(/openHouse\.signup\.email/), {
    target: { value: "sita@example.org" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: /consent/i }));
}

beforeEach(() => {
  // Radix's Checkbox measures itself on mount; jsdom has no ResizeObserver.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;

  vi.clearAllMocks();
  subscribeMock.mockResolvedValue({ id: 1, email: "x", status: "subscribed", message: "" });
});

describe("OpenHouseSignupForm", () => {
  it("pre-fills the region from the detected timezone and posts it", async () => {
    renderForm();
    fillRequired();
    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);

    await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));
    const payload = subscribeMock.mock.calls[0][0];
    expect(payload.region).toBe("gulf-middle-east");
    // Must keep starting with "openhouse" — the API keys the welcome off it.
    expect(payload.consentSource).toMatch(/^openhouse/);
  });

  it("marks the newsletter prompt as done, so the modal stops asking", async () => {
    // One shared list: without this the site-wide modal would later ask someone
    // who just signed up to sign up.
    renderForm();
    fillRequired();
    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);

    await waitFor(() => expect(promptMock).toHaveBeenCalledWith("subscribed"));
  });

  it("rejects a WhatsApp number the API would reject, without a round trip", async () => {
    renderForm();
    fillRequired();
    fireEvent.change(screen.getByLabelText(/openHouse\.signup\.whatsapp/), {
      target: { value: "not a phone" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);

    expect(await screen.findByText("openHouse.signup.whatsappInvalid")).toBeTruthy();
    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it("omits an untouched WhatsApp field rather than sending an empty string", async () => {
    renderForm();
    fillRequired();
    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);

    await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));
    expect(subscribeMock.mock.calls[0][0].whatsapp).toBeUndefined();
  });

  it("clears a field error as soon as the visitor corrects it", async () => {
    renderForm();
    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);
    expect(await screen.findByText("openHouse.signup.nameRequired")).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/openHouse\.signup\.name/), {
      target: { value: "Sita" },
    });
    await waitFor(() =>
      expect(screen.queryByText("openHouse.signup.nameRequired")).toBeNull(),
    );
  });

  it("names the offending field when the API returns a 400", async () => {
    subscribeMock.mockRejectedValueOnce(
      new JDSApiError("bad", 400, "/api/newsletter/subscriptions/", undefined, {
        whatsapp: ["nope"],
      }),
    );
    renderForm();
    fillRequired();
    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);

    expect(await screen.findByText("openHouse.signup.errorInvalid")).toBeTruthy();
    expect(screen.getByText("openHouse.signup.whatsappInvalid")).toBeTruthy();
  });

  it("gives 409 its own message rather than a generic failure", async () => {
    subscribeMock.mockRejectedValueOnce(
      new JDSApiError("conflict", 409, "/api/newsletter/subscriptions/"),
    );
    renderForm();
    fillRequired();
    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);

    expect(await screen.findByText("openHouse.signup.errorAlreadyOnList")).toBeTruthy();
  });
});
