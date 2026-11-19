import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config";

describe("loadConfig", () => {
  it("has working defaults, so the app runs with no configuration at all", () => {
    const c = loadConfig({});
    expect(c.storage).toBe("memory");
    expect(c.trustedProxyHops).toBe(1);
    expect(c.budgets).toEqual({ airQuality: 20000, geminiVision: 300, geminiExplain: 2000 });
    expect(c.airCache).toEqual({ freshMs: 30 * 60_000, staleMs: 180 * 60_000 });
    expect(c.geminiApiKey).toBeUndefined();
  });

  it("treats empty strings (as in .env.example) as unset", () => {
    const c = loadConfig({ GEMINI_API_KEY: "", GOOGLE_MAPS_API_KEY: "  ", STORAGE_BACKEND: "" });
    expect(c.geminiApiKey).toBeUndefined();
    expect(c.mapsApiKey).toBeUndefined();
    expect(c.storage).toBe("memory");
  });

  it("reads Cloud Run's service and revision names", () => {
    const c = loadConfig({ K_SERVICE: "vayushift", K_REVISION: "vayushift-00042-abc" });
    expect(c.service).toEqual({ name: "vayushift", revision: "vayushift-00042-abc" });
  });

  it("requires a project for Firestore, but accepts the emulator as one", () => {
    expect(() => loadConfig({ STORAGE_BACKEND: "firestore" })).toThrow(ConfigError);
    expect(loadConfig({ STORAGE_BACKEND: "firestore", GOOGLE_CLOUD_PROJECT: "my-proj" }).gcpProject).toBe("my-proj");
    expect(loadConfig({ STORAGE_BACKEND: "firestore", FIRESTORE_EMULATOR_HOST: "localhost:8080" }).gcpProject).toBe("demo-vayushift");
  });

  it("reports every problem at once, not just the first", () => {
    try {
      loadConfig({ STORAGE_BACKEND: "mongo", TRUSTED_PROXY_HOPS: "99", BUDGET_GEMINI_VISION_DAILY: "lots", PUBLIC_ORIGIN: "nope" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      const { problems } = err as ConfigError;
      expect(problems).toHaveLength(4);
      expect(problems.join("\n")).toMatch(/STORAGE_BACKEND/);
      expect(problems.join("\n")).toMatch(/TRUSTED_PROXY_HOPS/);
      expect(problems.join("\n")).toMatch(/BUDGET_GEMINI_VISION_DAILY/);
      expect(problems.join("\n")).toMatch(/PUBLIC_ORIGIN/);
    }
  });

  it("only allows http for localhost origins and strips the path", () => {
    expect(loadConfig({ PUBLIC_ORIGIN: "http://localhost:3000/" }).publicOrigin).toBe("http://localhost:3000");
    expect(loadConfig({ PUBLIC_ORIGIN: "https://vayushift.example.com/some/path" }).publicOrigin).toBe("https://vayushift.example.com");
    expect(() => loadConfig({ PUBLIC_ORIGIN: "http://vayushift.example.com" })).toThrow(/https/);
  });

  it("rejects an air-cache stale window shorter than the fresh window", () => {
    expect(() => loadConfig({ AIR_CACHE_FRESH_MINUTES: "60", AIR_CACHE_STALE_MINUTES: "30" })).toThrow(/STALE/);
  });

  it("allows a zero budget, which switches a paid upstream off", () => {
    expect(loadConfig({ BUDGET_GEMINI_VISION_DAILY: "0" }).budgets.geminiVision).toBe(0);
  });

  it("is quiet in tests unless asked", () => {
    expect(loadConfig({ NODE_ENV: "test" }).logLevel).toBe("silent");
    expect(loadConfig({ NODE_ENV: "test", LOG_LEVEL: "debug" }).logLevel).toBe("debug");
    expect(loadConfig({ NODE_ENV: "production" }).logLevel).toBe("info");
  });
});
