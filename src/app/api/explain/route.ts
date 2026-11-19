import { parseHourly, parseInterventions, parseProfile } from "@/lib/requestSchemas";
import { badRequest } from "@/server/errors";
import { defineRoute, json, readJson } from "@/server/http/handler";

export const runtime = "nodejs";

/**
 * POST /api/explain: the client sends inputs, never numbers. The server recomputes the receipt, has Gemini
 * verbalise it, and rejects any text containing a number the engine did not produce.
 */
export const POST = defineRoute(
  { name: "explain", rateLimit: { limit: 20, windowMs: 60_000 }, sameOriginOnly: true },
  async ({ req, services }) => {
    const body = (await readJson(req, 32 * 1024)) as Record<string, unknown> | null;
    const hourly = parseHourly(body?.hourly);
    const profile = parseProfile(body?.profile);
    const interventions = parseInterventions(body?.interventions);
    if (!hourly || !profile || !interventions) throw badRequest("Invalid inputs.", "invalid_inputs");

    const { text, source } = await services.explain.explain({ hourly, profile, interventions });
    return json({ text, source });
  },
);
