import { defineRoute, json } from "@/server/http/handler";

export const runtime = "nodejs";

/**
 * Readiness: can this instance do real work? Checks the storage backend and reports which optional upstreams
 * are configured (booleans only). Returns 503 when storage is unreachable, for uptime checks and alerting.
 */
export const GET = defineRoute({ name: "readyz", rateLimit: { limit: 30, windowMs: 60_000 } }, async ({ services, log }) => {
  const checks: Record<string, "ok" | "fail" | "skipped"> = { storage: "skipped" };
  if (services.storage.kind === "firestore") {
    try {
      await services.storage.ping();
      checks.storage = "ok";
    } catch (err) {
      log.error("readiness check failed", { err, dependency: "firestore" });
      checks.storage = "fail";
    }
  }
  const ready = !Object.values(checks).includes("fail");
  return json(
    { status: ready ? "ok" : "degraded", storage: services.storage.kind, checks, upstreams: services.upstreams },
    { status: ready ? 200 : 503 },
  );
});
