// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { App } from "./App";

/**
 * Automated accessibility checks (WCAG 2.1 A/AA) on the rendered app, run in CI.
 *
 * What this covers: structure, names, roles, labels, ARIA validity, landmarks, language. What it cannot cover:
 * colour contrast (jsdom paints nothing) and real screen-reader behaviour. Contrast was checked separately,
 * by hand, against the rendered backdrop at all 24 hours (see docs/ACCESSIBILITY.md).
 */

beforeAll(() => {
  // jsdom has no layout, media queries or dialog support; stub only what the app touches.
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  window.HTMLElement.prototype.scrollIntoView ??= () => {};
  window.HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  window.HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
  window.requestAnimationFrame ??= ((cb: FrameRequestCallback) => setTimeout(() => cb(0), 0) as unknown as number) as typeof requestAnimationFrame;
});

afterEach(cleanup);

async function violations(container: Element) {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    // jsdom cannot compute colours or layout: these rules would only produce false results.
    rules: { "color-contrast": { enabled: false }, "link-in-text-block": { enabled: false }, region: { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.html.slice(0, 120)}`);
}

describe("accessibility (axe-core)", () => {
  it("the checker itself catches real violations (so a clean result means something)", async () => {
    const { container } = render(
      <main>
        <button type="button" />
        <img src="x.png" />
        <input type="text" />
      </main>,
    );
    const found = (await violations(container)).join("\n");
    expect(found).toMatch(/button-name/);
    expect(found).toMatch(/image-alt/);
    expect(found).toMatch(/label/);
  });

  it("the first screen has no violations", async () => {
    const { container } = render(<App />);
    expect(await violations(container)).toEqual([]);
  });

  it("every tab, once selected, has no violations", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(3);
    for (const tab of tabs) {
      await user.click(tab);
      expect(tab.getAttribute("aria-selected"), `tab "${tab.textContent}" should be selected`).toBe("true");
      expect(await violations(container), `tab "${tab.textContent}"`).toEqual([]);
    }
  });

  it("exposes the page structure assistive technology relies on", () => {
    const { container } = render(<App />);
    expect(container.querySelector("main, [role='main']"), "a main landmark").not.toBeNull();
    expect(screen.getAllByRole("tablist")).toHaveLength(1);
    expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
    const skip = Array.from(container.querySelectorAll("a")).find((a) => /skip/i.test(a.textContent ?? ""));
    expect(skip, "a skip link").toBeDefined();
    expect(skip?.getAttribute("href")).toMatch(/^#/);
  });

  it("the hour slider announces its value in words", () => {
    render(<App />);
    const slider = screen.getByLabelText("Hour of day");
    expect(slider.getAttribute("aria-valuetext")).toMatch(/outdoor PM2\.5 \d+ micrograms per cubic metre, indoor \d+/);
  });

  it("the 24-hour chart has a table alternative: a caption, a header row and 24 hourly rows", () => {
    const { container } = render(<App />);
    // Queried by structure: the table sits in a closed <details>, which jsdom's role queries treat inconsistently.
    const table = Array.from(container.querySelectorAll("table")).find((t) => /Hourly outdoor PM2\.5/.test(t.querySelector("caption")?.textContent ?? ""));
    expect(table, "the hourly table").toBeDefined();
    expect(table!.querySelectorAll("tbody tr")).toHaveLength(24);
    expect(table!.querySelectorAll("th[scope='col']").length).toBeGreaterThanOrEqual(4);
    expect(container.querySelector("[role='img'][aria-labelledby]"), "the chart has a text description").not.toBeNull();
  });

  it("every routine control on the first tab is a real switch with a name and a state", () => {
    const { container } = render(<App />);
    const switches = Array.from(container.querySelectorAll("#panel-choreographer [role='switch']"));
    expect(switches).toHaveLength(4);
    for (const s of switches) {
      expect(s.tagName).toBe("BUTTON");
      expect(s.getAttribute("aria-checked")).toMatch(/^(true|false)$/);
      expect((s.textContent ?? "").trim().length).toBeGreaterThan(0);
      // The state is also written as text, so it never relies on colour alone.
      expect(s.textContent).toMatch(/On|Off/);
    }
  });
});
