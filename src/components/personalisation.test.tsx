// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PRESET_SCENARIOS, buildDiurnalCurve } from "@/lib/airQualityPresets";
import { CITIES } from "@/lib/cities";
import { App } from "./App";

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({
    matches: false, media: q, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  window.HTMLElement.prototype.scrollIntoView ??= () => {};
  window.HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  window.HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
});

/** 08:35 UTC is 14:05 in India. */
const FETCHED_AT = Date.UTC(2026, 10, 20, 8, 35);
const calls: string[] = [];

beforeEach(() => {
  window.history.replaceState(null, "", "/?hour=12");
  try { localStorage.clear(); } catch { /* ignore */ }
  calls.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const q = new URL(url, "http://localhost").searchParams;
    const body = {
      mode: "live",
      scenario: {
        id: "live", name: "Your location", area: "Live forecast", lat: Number(q.get("lat")), lng: Number(q.get("lng")),
        hourly: buildDiurnalCurve(120), source: "live", fetchedAt: FETCHED_AT, provider: "Google Air Quality API",
      },
    };
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const guidance = () => screen.getByRole("heading", { name: /outdoor guidance/i }).closest("section") as HTMLElement;

describe("city picker", () => {
  it("lists the cities and loads the live forecast for the one picked, not Delhi's", async () => {
    const user = userEvent.setup();
    render(<App />);
    const picker = screen.getByRole("combobox", { name: "City" });
    // A placeholder, every live city, and the demo scenarios in their own group.
    expect(within(picker).getAllByRole("option").length).toBe(1 + CITIES.length + PRESET_SCENARIOS.length);
    expect(within(picker).getByRole("group", { name: "Demo scenarios" })).toBeDefined();
    await user.selectOptions(picker, "mumbai");
    await waitFor(() => expect(screen.getByText("Showing the live forecast for Mumbai.")).toBeDefined());
    const mumbai = CITIES.find((c) => c.id === "mumbai")!;
    expect(calls[0]).toContain(`lat=${mumbai.lat}`);
    expect(calls[0]).toContain(`lng=${mumbai.lng}`);
    expect(document.body.textContent).not.toContain("New Delhi");
  });

  it("shows where live data came from and when, in Indian time", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByText(/Source:/)).toBeNull(); // demo data has no provider to name
    await user.selectOptions(screen.getByRole("combobox", { name: "City" }), "kolkata");
    await waitFor(() => expect(screen.getByText(/Source: Google Air Quality API · updated 14:05 IST/)).toBeDefined());
  });

  it("tells visitors outside Delhi-NCR that GRAP stages are only a reference for them", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/?hour=12#community");
    render(<App />);
    expect(screen.queryByText(/GRAP is the Delhi-NCR action plan/)).toBeNull();
    await user.selectOptions(screen.getByRole("combobox", { name: "City" }), "chennai");
    await waitFor(() => expect(screen.getByText(/GRAP is the Delhi-NCR action plan/)).toBeDefined());
  });

  it("names cities in Hindi when the language is Hindi", async () => {
    window.history.replaceState(null, "", "/?lang=hi&hour=12");
    render(<App />);
    await waitFor(() => expect(screen.getByRole("option", { name: "मुंबई" })).toBeDefined());
  });
});

describe("household guidance", () => {
  it("shows guidance for every group that lives at home, and always for healthy adults", async () => {
    const user = userEvent.setup();
    render(<App />);
    // The default household has a child.
    expect(within(guidance()).getByText("Children")).toBeDefined();
    expect(within(guidance()).getByText("Healthy adults")).toBeDefined();
    expect(within(guidance()).queryByText("Older adults")).toBeNull();
    await user.click(screen.getByRole("checkbox", { name: "Older adults (65+)" }));
    expect(within(guidance()).getByText("Older adults")).toBeDefined();
    await user.click(screen.getByRole("checkbox", { name: "Children (under 12)" }));
    expect(within(guidance()).queryByText("Children")).toBeNull();
  });

  it("gives a household with a child stricter advice than healthy adults at the same hour", async () => {
    render(<App />);
    // Noon in the severe scenario is far above every limit, so both groups are told to stay in, but only the child
    // card is highlighted as the strictest. Switch to a cleaner city to see the groups diverge.
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole("combobox", { name: "City" }), "pune");
    await waitFor(() => expect(screen.getByText("Showing the live forecast for Pune.")).toBeDefined());
    const cards = within(guidance()).getAllByRole("listitem");
    const child = cards.find((c) => c.textContent?.startsWith("Children"))!;
    const adult = cards.find((c) => c.textContent?.startsWith("Healthy adults"))!;
    expect(child.textContent).not.toEqual(adult.textContent?.replace("Healthy adults", "Children"));
  });

  it("writes the guidance in Hindi", async () => {
    window.history.replaceState(null, "", "/?lang=hi&hour=12");
    render(<App />);
    const heading = await screen.findByRole("heading", { name: /बाहर जाने की सलाह/ });
    expect(within(heading.closest("section") as HTMLElement).getByText("स्वस्थ वयस्क")).toBeDefined();
  });

  it("remembers who lives at home", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole("checkbox", { name: "Asthma, heart or lung condition" }));
    unmount();
    render(<App />);
    await waitFor(() => expect((screen.getByRole("checkbox", { name: "Asthma, heart or lung condition" }) as HTMLInputElement).checked).toBe(true));
  });
});
