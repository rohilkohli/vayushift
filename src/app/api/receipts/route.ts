import { parseHourly, parseInterventions, parseProfile } from "@/lib/requestSchemas";
import { badRequest } from "@/server/errors";
import { defineRoute, json, readJson } from "@/server/http/handler";

export const runtime = "nodejs";

/**
 * POST /api/receipts: freeze a receipt behind a short, unguessable link. Only inputs are accepted; the receipt
 * is computed here. Nothing personal is stored (see ReceiptService).
 */
export const POST = defineRoute(
  { name: "receipts-create", rateLimit: { limit: 20, windowMs: 60_000 }, sameOriginOnly: true },
  async ({ req, services }) => {
    const body = (await readJson(req, 32 * 1024)) as Record<string, unknown> | null;
    const hourly = parseHourly(body?.hourly);
    const profile = parseProfile(body?.profile);
    const interventions = parseInterventions(body?.interventions);
    const scenarioName = body?.scenarioName;
    if (!hourly || !profile || !interventions || typeof scenarioName !== "string") {
      throw badRequest("Invalid inputs.", "invalid_inputs");
    }

    const stored = await services.receipts.create({ scenarioName, hourly, profile, interventions });
    const origin = services.config.publicOrigin ?? new URL(req.url).origin;
    return json({ id: stored.id, url: `${origin}/r/${stored.id}`, expiresAt: stored.expiresAt }, { status: 201 });
  },
);
