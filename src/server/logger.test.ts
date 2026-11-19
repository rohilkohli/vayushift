import { describe, expect, it } from "vitest";
import { createLogger } from "./logger";

const make = (level: "debug" | "info" | "warn" | "error" | "silent" = "debug") => {
  const lines: Array<Record<string, unknown>> = [];
  const logger = createLogger({
    level,
    service: { name: "vayushift", revision: "rev-1" },
    sink: (l) => lines.push(JSON.parse(l)),
  });
  return { logger, lines };
};

describe("logger", () => {
  it("writes Cloud Logging shaped JSON with severity, message and time", () => {
    const { logger, lines } = make();
    logger.info("hello", { route: "x" });
    expect(lines[0]).toMatchObject({ severity: "INFO", message: "hello", route: "x" });
    expect(typeof lines[0].time).toBe("string");
  });

  it("maps warn to WARNING and respects the level threshold", () => {
    const { logger, lines } = make("warn");
    logger.debug("no");
    logger.info("no");
    logger.warn("yes");
    logger.error("yes");
    expect(lines.map((l) => l.severity)).toEqual(["WARNING", "ERROR"]);
  });

  it("is silent at level silent", () => {
    const { logger, lines } = make("silent");
    logger.error("x");
    expect(lines).toHaveLength(0);
  });

  it("links a line to its request through the trace field", () => {
    const { logger, lines } = make();
    logger.info("x", { trace: "projects/p/traces/abc" });
    expect(lines[0]["logging.googleapis.com/trace"]).toBe("projects/p/traces/abc");
    expect(lines[0].trace).toBeUndefined();
  });

  it("marks errors for Error Reporting and puts the stack in the message", () => {
    const { logger, lines } = make();
    logger.error("boom", { err: new Error("disk on fire") });
    expect(lines[0]["@type"]).toContain("ReportedErrorEvent");
    expect(lines[0].serviceContext).toEqual({ service: "vayushift", version: "rev-1" });
    expect(String(lines[0].message)).toContain("disk on fire");
    expect(String(lines[0].message)).toContain("at ");
  });

  it("includes the underlying cause of a wrapped error, in the structured field and for Error Reporting", () => {
    const { logger, lines } = make();
    logger.error("service error", { err: new Error("Share links unavailable", { cause: new Error("firestore: PERMISSION_DENIED") }) });
    expect((lines[0].error as { cause: { message: string } }).cause.message).toBe("firestore: PERMISSION_DENIED");
    expect(String(lines[0].message)).toContain("Caused by");
    expect(String(lines[0].message)).toContain("PERMISSION_DENIED");
  });

  it("does not mark warnings as reported errors", () => {
    const { logger, lines } = make();
    logger.warn("careful", { err: new Error("minor") });
    expect(lines[0]["@type"]).toBeUndefined();
    expect(lines[0].error).toMatchObject({ message: "minor" });
  });

  it("redacts secrets by key name, at any shallow depth", () => {
    const { logger, lines } = make();
    logger.info("x", { apiKey: "AIza-secret", nested: { authorization: "Bearer abc", fine: 1 }, token: "t" });
    const text = JSON.stringify(lines[0]);
    expect(text).not.toContain("AIza-secret");
    expect(text).not.toContain("Bearer abc");
    expect(lines[0].apiKey).toBe("[redacted]");
    expect((lines[0].nested as Record<string, unknown>).fine).toBe(1);
  });

  it("truncates very long strings", () => {
    const { logger, lines } = make();
    logger.info("x", { blob: "a".repeat(5000) });
    expect(String(lines[0].blob).length).toBeLessThan(2100);
  });

  it("child loggers inherit and extend context", () => {
    const { logger, lines } = make();
    logger.child({ requestId: "r1" }).child({ route: "a" }).info("x");
    expect(lines[0]).toMatchObject({ requestId: "r1", route: "a" });
  });
});
