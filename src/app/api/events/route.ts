import { AppError } from "@/server/errors";
import { defineRoute, readJson } from "@/server/http/handler";

export const runtime = "nodejs";

/**
 * POST /api/events: anonymous product analytics (the five events in the PRD). Only daily counters are kept.
 * A request carrying Global Privacy Control or Do Not Track is acknowledged but not counted.
 */
export const POST = defineRoute(
  { name: "events", rateLimit: { limit: 120, windowMs: 60_000 }, sameOriginOnly: true },
  async ({ req, services, log }) => {
    const body = (await readJson(req, 2 * 1024)) as { event?: unknown; props?: unknown } | null;
    const optedOut = req.headers.get("sec-gpc") === "1" || req.headers.get("dnt") === "1";
    try {
      await services.analytics.record(body?.event, body?.props, optedOut);
    } catch (err) {
      // A bad event is the caller's mistake (400). A storage failure must never surface: analytics is best-effort.
      if (err instanceof AppError) throw err;
      log.warn("analytics write failed", { err });
    }
    return new Response(null, { status: 204 });
  },
);
