/** Keeps docs/openapi.yaml honest: every route has a documented path, and every documented path has a route. */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const apiDir = join(process.cwd(), "src", "app", "api");

function routePaths(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return routePaths(full);
    if (e.name !== "route.ts") return [];
    return ["/api/" + relative(apiDir, dir).split(sep).join("/").replace(/\[(\w+)\]/g, "{$1}")].map((p) => p.replace(/\/$/, ""));
  });
}

describe("OpenAPI spec", () => {
  const spec = readFileSync(join(process.cwd(), "docs", "openapi.yaml"), "utf8");
  const documented = [...spec.matchAll(/^ {2}(\/api\/[^:\s]+):\s*$/gm)].map((m) => m[1]).sort();
  const actual = routePaths(apiDir).sort();

  it("documents every route", () => {
    expect(actual.filter((p) => !documented.includes(p))).toEqual([]);
  });

  it("documents no route that does not exist", () => {
    expect(documented.filter((p) => !actual.includes(p))).toEqual([]);
  });

  it("finds the routes it expects (guards against the test silently matching nothing)", () => {
    expect(actual).toContain("/api/receipts/{id}");
    expect(actual.length).toBeGreaterThanOrEqual(8);
  });
});
