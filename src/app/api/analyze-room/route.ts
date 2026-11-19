import { MAX_IMAGE_BYTES, checkImagePayload } from "@/lib/validation";
import { badRequest } from "@/server/errors";
import { defineRoute, json, readJson } from "@/server/http/handler";

export const runtime = "nodejs";
/** Base64 is 4/3 the size of the image, plus a little JSON. */
const MAX_BODY = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 1024;

/** POST /api/analyze-room: stateless. The image lives only in memory for this request, never stored or logged. */
export const POST = defineRoute(
  { name: "analyze-room", rateLimit: { limit: 10, windowMs: 60_000 }, sameOriginOnly: true },
  async ({ req, services }) => {
    const body = await readJson(req, MAX_BODY);
    if (typeof body !== "object" || body === null) throw badRequest("Expected a JSON object.");
    const { mimeType, data } = body as { mimeType?: unknown; data?: unknown };
    const check = checkImagePayload(mimeType, data);
    if (!check.ok) throw badRequest(check.reason, "invalid_image");

    const outcome = await services.room.analyze(check.mimeType, check.base64);
    return json(outcome.kind === "scan" ? { scan: outcome.scan } : { fallback: true, reason: outcome.reason });
  },
);
