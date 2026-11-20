// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { App } from "./App";

const DEVANAGARI = /[ऀ-ॿ]/;

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({
    matches: false, media: q, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  window.HTMLElement.prototype.scrollIntoView ??= () => {};
  window.HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  window.HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
});

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  try { localStorage.clear(); } catch { /* ignore */ }
  document.documentElement.lang = "en";
});
afterEach(cleanup);

async function violations(container: Element) {
  const r = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false }, "link-in-text-block": { enabled: false }, region: { enabled: false } },
  });
  return r.violations.map((v) => `${v.id}: ${v.help} e.g. ${v.nodes[0]?.html.slice(0, 120)}`);
}

describe("language switch", () => {
  it("starts in English and offers Hindi, labelled in Hindi for screen readers", () => {
    render(<App />);
    const button = screen.getByRole("button", { name: "Switch language to Hindi" });
    const label = button.querySelector("[lang]");
    expect(label?.getAttribute("lang")).toBe("hi");
    expect(label?.textContent).toBe("हिन्दी");
    expect(document.documentElement.lang).toBe("en");
  });

  it("switches the whole interface to Hindi, updates <html lang> and remembers the choice", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole("button", { name: "Switch language to Hindi" }));
    await waitFor(() => expect(document.documentElement.lang).toBe("hi"));
    expect(localStorage.getItem("vayushift-lang")).toBe("hi");
    // The hero headline, tabs and a routine switch are all Hindi now.
    expect(DEVANAGARI.test(container.querySelector("h2")?.textContent ?? "")).toBe(true);
    for (const tab of screen.getAllByRole("tab")) expect(DEVANAGARI.test(tab.textContent ?? ""), tab.textContent ?? "").toBe(true);
    for (const s of container.querySelectorAll("#panel-choreographer [role='switch']")) {
      expect(DEVANAGARI.test(s.textContent ?? "")).toBe(true);
    }
    expect(container.querySelector("[aria-valuetext]")?.getAttribute("aria-valuetext")).toMatch(/माइक्रोग्राम/);
    // ...and back again.
    await user.click(screen.getByRole("button", { name: "भाषा अंग्रेज़ी में बदलें" }));
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
    expect(container.querySelector("[aria-valuetext]")?.getAttribute("aria-valuetext")).toMatch(/micrograms/);
  });

  it("a status message already on screen is re-rendered when the language changes", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "geolocation", { value: undefined, configurable: true });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Use my location" }));
    expect(screen.getByText("Location is not available in this browser. Showing demo data.")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Switch language to Hindi" }));
    await waitFor(() => expect(screen.getByText("इस ब्राउज़र में लोकेशन उपलब्ध नहीं है। डेमो डेटा दिखाया जा रहा है।")).toBeDefined());
    expect(screen.queryByText("Location is not available in this browser. Showing demo data.")).toBeNull();
  });

  it("opens in Hindi from ?lang=hi", async () => {
    window.history.replaceState(null, "", "/?lang=hi");
    render(<App />);
    await waitFor(() => expect(document.documentElement.lang).toBe("hi"));
    expect(screen.getByRole("button", { name: "भाषा अंग्रेज़ी में बदलें" })).toBeDefined();
  });

  it("every tab in Hindi has no axe violations", async () => {
    window.history.replaceState(null, "", "/?lang=hi");
    const user = userEvent.setup();
    const { container } = render(<App />);
    await waitFor(() => expect(document.documentElement.lang).toBe("hi"));
    for (const tab of screen.getAllByRole("tab")) {
      await user.click(tab);
      expect(await violations(container), `tab "${tab.textContent}"`).toEqual([]);
    }
  });

  it("English-only data inside the Hindi interface is marked lang=en", async () => {
    window.history.replaceState(null, "", "/?lang=hi#community");
    const { container } = render(<App />);
    await waitFor(() => expect(document.documentElement.lang).toBe("hi"));
    // The GRAP measures come from the rules table in English; they must not be read out with a Hindi voice.
    const english = container.querySelectorAll("#panel-community ul [lang='en']");
    expect(english.length).toBeGreaterThan(0);
  });
});
