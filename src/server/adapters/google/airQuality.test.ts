import { describe, expect, it, vi } from "vitest";
import { GoogleAirQualityProvider, parseForecast } from "./airQuality";

const body = (n: number, base = 100) => ({
  hourlyForecasts: Array.from({ length: n }, (_, i) => ({
    dateTime: new Date(Date.UTC(2026, 10, 18, i, 30)).toISOString(),
    pollutants: [{ code: "pm25", concentration: { value: base + i } }],
  })),
});

describe("parseForecast", () => {
  it("builds a 24-slot series", () => {
    const out = parseForecast(body(24));
    expect(out).toHaveLength(24);
    expect(out!.every((h) => h.pm25 >= 100)).toBe(true);
  });

  it("fills gaps when at least 12 hours are present", () => {
    expect(parseForecast(body(14))).toHaveLength(24);
  });

  it("returns null for sparse or malformed bodies", () => {
    expect(parseForecast(body(5))).toBeNull();
    expect(parseForecast({})).toBeNull();
    expect(parseForecast(null)).toBeNull();
  });

  it("ignores readings that are not finite non-negative numbers", () => {
    const bad = body(24);
    bad.hourlyForecasts[3].pollutants[0].concentration.value = Number.NaN;
    bad.hourlyForecasts[4].pollutants[0].concentration.value = -5;
    const out = parseForecast(bad)!;
    expect(out).toHaveLength(24);
    expect(out.every((h) => Number.isFinite(h.pm25) && h.pm25 >= 0)).toBe(true);
  });
});

describe("GoogleAirQualityProvider", () => {
  const ok = (data: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));

  it("sends the key in a header, never in the URL, with the requested location", async () => {
    const fetchImpl = ok(body(24));
    await new GoogleAirQualityProvider("secret-key", fetchImpl as unknown as typeof fetch).fetchScenario(28.615, 77.21);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).not.toContain("secret-key");
    expect(String(url)).not.toContain("key=");
    expect(init.headers["X-Goog-Api-Key"]).toBe("secret-key");
    expect(JSON.parse(init.body).location).toEqual({ latitude: 28.615, longitude: 77.21 });
    expect(init.method).toBe("POST");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("asks for the next 24 hours using the `period` field, which is the shape Google's API accepts", async () => {
    // Verified against the live API: top-level startTime/endTime are rejected with HTTP 400 ("Cannot find field").
    const fetchImpl = ok(body(24));
    const before = Date.now();
    await new GoogleAirQualityProvider("k", fetchImpl as unknown as typeof fetch).fetchScenario(28.615, 77.21);
    const sent = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(sent).not.toHaveProperty("startTime");
    expect(sent).not.toHaveProperty("endTime");
    const start = Date.parse(sent.period.startTime);
    const end = Date.parse(sent.period.endTime);
    expect(start).toBeGreaterThan(before); // a forecast never starts in the past
    expect(start % 3_600_000).toBe(0); // on a whole hour
    expect(end - start).toBe(24 * 3_600_000);
    expect(sent.pageSize).toBe(24);
    expect(sent.extraComputations).toEqual(["POLLUTANT_CONCENTRATION"]);
  });

  it("returns a live scenario for the queried point", async () => {
    const s = await new GoogleAirQualityProvider("k", ok(body(24)) as unknown as typeof fetch).fetchScenario(28.615, 77.21);
    expect(s).toMatchObject({ id: "live", source: "live", lat: 28.615, lng: 77.21 });
    expect(s.hourly).toHaveLength(24);
  });

  it("stamps the scenario with who supplied it and when, so the page can show how current it is", async () => {
    const before = Date.now();
    const s = await new GoogleAirQualityProvider("k", ok(body(24)) as unknown as typeof fetch).fetchScenario(28.615, 77.21);
    expect(s.provider).toBe("Google Air Quality API");
    expect(s.fetchedAt).toBeGreaterThanOrEqual(before);
    expect(s.fetchedAt).toBeLessThanOrEqual(Date.now());
  });

  it("throws on HTTP errors without exposing the response body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("API key not valid: secret-key", { status: 403 }));
    await expect(new GoogleAirQualityProvider("secret-key", fetchImpl as unknown as typeof fetch).fetchScenario(1, 1)).rejects.toThrow(
      /^Air Quality API responded 403$/,
    );
  });

  it("throws when the response has too little data to use", async () => {
    await expect(new GoogleAirQualityProvider("k", ok(body(3)) as unknown as typeof fetch).fetchScenario(1, 1)).rejects.toThrow(/too little/);
  });
});
