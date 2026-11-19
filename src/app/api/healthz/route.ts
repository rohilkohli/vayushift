import { defineRoute, json } from "@/server/http/handler";

export const runtime = "nodejs";

/** Liveness: the process is up and can answer. Deliberately touches no dependency, so an outage elsewhere never restarts it. */
export const GET = defineRoute({ name: "healthz" }, async ({ services }) =>
  json({ status: "ok", service: services.config.service.name, revision: services.config.service.revision, uptimeSec: Math.round(process.uptime()) }),
);
