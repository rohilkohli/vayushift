// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { App } from "./App";

let prefersMore = false;

beforeAll(() => {
  window.matchMedia = ((q: string) => ({
    matches: q.includes("prefers-contrast") ? prefersMore : false,
    media: q, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  window.HTMLElement.prototype.scrollIntoView ??= () => {};
  window.HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  window.HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
});

beforeEach(() => {
  prefersMore = false;
  window.history.replaceState(null, "", "/");
  try { localStorage.clear(); } catch { /* ignore */ }
  delete document.documentElement.dataset.contrast;
});
afterEach(cleanup);

describe("high-contrast toggle", () => {
  it("is off by default and announces its state", () => {
    render(<App />);
    const button = screen.getByRole("button", { name: "High contrast" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(document.documentElement.dataset.contrast).toBeUndefined();
  });

  it("turns the mode on and off, and remembers the choice", async () => {
    const user = userEvent.setup();
    render(<App />);
    const button = screen.getByRole("button", { name: "High contrast" });
    await user.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.dataset.contrast).toBe("high");
    expect(localStorage.getItem("vayushift-contrast")).toBe("high");
    await user.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(document.documentElement.dataset.contrast).toBeUndefined();
    expect(localStorage.getItem("vayushift-contrast")).toBe("normal");
  });

  it("starts on when the device asks for more contrast", async () => {
    prefersMore = true;
    render(<App />);
    await waitFor(() => expect(document.documentElement.dataset.contrast).toBe("high"));
    expect(screen.getByRole("button", { name: "High contrast" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("an explicit saved choice beats the device setting", async () => {
    prefersMore = true;
    localStorage.setItem("vayushift-contrast", "normal");
    render(<App />);
    await waitFor(() => expect(screen.getByRole("button", { name: "High contrast" }).getAttribute("aria-pressed")).toBe("false"));
    expect(document.documentElement.dataset.contrast).toBeUndefined();
  });

  it("?contrast=high opens in the mode, and beats a saved choice", async () => {
    localStorage.setItem("vayushift-contrast", "normal");
    window.history.replaceState(null, "", "/?contrast=high");
    render(<App />);
    await waitFor(() => expect(document.documentElement.dataset.contrast).toBe("high"));
  });

  it("ignores unsupported ?contrast= values", async () => {
    window.history.replaceState(null, "", "/?contrast=<b>");
    render(<App />);
    expect(screen.getByRole("button", { name: "High contrast" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("the label follows the language", async () => {
    window.history.replaceState(null, "", "/?lang=hi");
    render(<App />);
    expect(await screen.findByRole("button", { name: "उच्च कंट्रास्ट" })).toBeDefined();
  });

  it("every tab still has no axe violations with the mode on", async () => {
    prefersMore = true;
    const user = userEvent.setup();
    const { container } = render(<App />);
    await waitFor(() => expect(document.documentElement.dataset.contrast).toBe("high"));
    for (const tab of screen.getAllByRole("tab")) {
      await user.click(tab);
      const r = await axe.run(container, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
        rules: { "color-contrast": { enabled: false }, "link-in-text-block": { enabled: false }, region: { enabled: false } },
      });
      expect(r.violations.map((v) => v.id), `tab "${tab.textContent}"`).toEqual([]);
    }
  });
});
