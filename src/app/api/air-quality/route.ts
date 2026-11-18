import { NextResponse } from "next/server";
import { demoFallbackFor, fetchLiveScenario } from "@/lib/liveAirQuality";
import { RateLimiter, clientKey, parseCoords } from "@/lib/validation";

export const runtime = "nodejs";
const limiter = new RateLimiter(30, 60_000);

export async function GET(req: Request) {
  if (!limiter.allow(clientKey(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const url = new URL(req.url);
  const coords = parseCoords(url.searchParams.get("lat"), url.searchParams.get("lng"));
  if (!coords) return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ scenario: demoFallbackFor(coords.lat, coords.lng), mode: "demo", reason: "no_api_key" });
  }
  try {
    const scenario = await fetchLiveScenario(coords.lat, coords.lng, key);
    return NextResponse.json({ scenario, mode: "live" }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch {
    // Never leak upstream error details (they can echo the request URL, including the key).
    return NextResponse.json({ scenario: demoFallbackFor(coords.lat, coords.lng), mode: "demo", reason: "upstream_unavailable" });
  }
}
