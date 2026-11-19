import { parseCoords } from "@/lib/validation";
import { badRequest } from "@/server/errors";
import { defineRoute, json } from "@/server/http/handler";

export const runtime = "nodejs";

/** GET /api/air-quality?lat&lng: an hourly forecast for the user's grid cell (cached, budgeted, with fallbacks). */
export const GET = defineRoute(
  { name: "air-quality", rateLimit: { limit: 30, windowMs: 60_000 }, sameOriginOnly: true },
  async ({ req, services }) => {
    const url = new URL(req.url);
    const coords = parseCoords(url.searchParams.get("lat"), url.searchParams.get("lng"));
    if (!coords) throw badRequest("Invalid coordinates.", "invalid_coordinates");
    const result = await services.air.get(coords.lat, coords.lng);
    return json(
      { scenario: result.scenario, mode: result.mode, reason: result.reason },
      { headers: result.mode === "live" ? { "Cache-Control": "private, max-age=300" } : undefined },
    );
  },
);
