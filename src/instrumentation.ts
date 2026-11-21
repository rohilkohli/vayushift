/**
 * Runs once when the server starts. In production a bad configuration stops the process immediately, so a
 * faulty Cloud Run revision fails its startup check and is never given traffic, instead of failing request by
 * request. In development the error is logged and the server keeps running so it can be fixed live.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { loadConfig, ConfigError } = await import("./server/config");
  const line = (entry: Record<string, unknown>) => process.stdout.write(`${JSON.stringify(entry)}\n`);
  try {
    const config = loadConfig();
    if (config.nodeEnv === "production") {
      if (!config.publicOrigin) {
        line({
          severity: "WARNING",
          message: "PUBLIC_ORIGIN is not set: share links will use the request's own host. Set it to the public https URL.",
        });
      }
      if (!config.gcpProject) {
        line({
          severity: "WARNING",
          message: "GOOGLE_CLOUD_PROJECT is not set: log lines cannot be linked to Cloud Trace. Cloud Run does not set it for you.",
        });
      }
    }
    line({
      severity: "INFO",
      message: "server starting",
      storage: config.storage,
      upstreams: { airQuality: Boolean(config.mapsApiKey), gemini: Boolean(config.geminiApiKey) },
    });
  } catch (err) {
    const problems = err instanceof ConfigError ? err.problems : [String(err)];
    line({ severity: "CRITICAL", message: "invalid configuration", problems });
    if (process.env.NODE_ENV === "production") process.exit(1);
  }
}
