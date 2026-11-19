import { notFound } from "@/server/errors";
import { defineRoute, json } from "@/server/http/handler";

export const runtime = "nodejs";

/** GET /api/receipts/:id. Receipts are immutable until they expire, so they can be cached briefly. */
export const GET = defineRoute({ name: "receipts-get", rateLimit: { limit: 60, windowMs: 60_000 } }, async ({ services, params }) => {
  const receipt = await services.receipts.get(params.id ?? "");
  if (!receipt) throw notFound("This receipt link does not exist or has expired.");
  return json(receipt, { headers: { "Cache-Control": "public, max-age=300" } });
});
