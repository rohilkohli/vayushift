import type { LogLevel } from "./config";

/**
 * Structured JSON logs shaped for Google Cloud Logging: `severity`, `message`, `time`, and the trace field
 * that links a line to its request. Errors logged at ERROR severity carry the Error Reporting markers, so
 * they appear in Error Reporting with a stack trace. Secrets are redacted and long values are truncated.
 */
export interface Logger {
  debug(message: string, fields?: Fields): void;
  info(message: string, fields?: Fields): void;
  warn(message: string, fields?: Fields): void;
  error(message: string, fields?: Fields): void;
  child(fields: Fields): Logger;
}
export type Fields = Record<string, unknown>;

const RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const SEVERITY = { debug: "DEBUG", info: "INFO", warn: "WARNING", error: "ERROR" } as const;
const SENSITIVE = /(key|token|secret|authorization|cookie|password|credential)/i;
const MAX_STRING = 2000;
const REPORTED_ERROR = "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent";

interface SerialisedError {
  name: string;
  message: string;
  stack?: string;
  cause?: SerialisedError;
}

function serialiseError(err: unknown, depth = 0): SerialisedError {
  if (err instanceof Error) {
    const cause = depth < 2 && err.cause !== undefined ? serialiseError(err.cause, depth + 1) : undefined;
    return { name: err.name, message: err.message, stack: err.stack, ...(cause ? { cause } : {}) };
  }
  return { name: "NonError", message: String(err) };
}

function clean(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (value instanceof Error) return serialiseError(value);
  if (Array.isArray(value)) return depth > 2 ? "[array]" : value.slice(0, 50).map((v) => clean(v, depth + 1));
  if (value && typeof value === "object") {
    if (depth > 2) return "[object]";
    return Object.fromEntries(Object.entries(value as Fields).map(([k, v]) => [k, SENSITIVE.test(k) ? "[redacted]" : clean(v, depth + 1)]));
  }
  return value;
}

export interface LoggerOptions {
  level: LogLevel;
  service: { name: string; revision: string };
  /** Where lines go. Defaults to stdout, which Cloud Run ships to Cloud Logging. */
  sink?: (line: string) => void;
  base?: Fields;
}

export function createLogger(opts: LoggerOptions): Logger {
  const sink = opts.sink ?? ((line: string) => process.stdout.write(`${line}\n`));
  const make = (base: Fields): Logger => {
    const emit = (level: keyof typeof SEVERITY, message: string, fields: Fields = {}) => {
      if (RANK[level] < RANK[opts.level]) return;
      const merged: Fields = { ...base, ...fields };
      const entry: Fields = { severity: SEVERITY[level], time: new Date().toISOString() };
      const { trace, err, ...rest } = merged;
      if (typeof trace === "string") entry["logging.googleapis.com/trace"] = trace;
      let text = message;
      if (err !== undefined) {
        const e = serialiseError(err);
        entry.error = e;
        if (level === "error") {
          // Error Reporting groups on a message that contains the stack trace.
          text = `${message}: ${e.stack ?? e.message}${e.cause ? `\nCaused by: ${e.cause.stack ?? e.cause.message}` : ""}`;
          entry["@type"] = REPORTED_ERROR;
          entry.serviceContext = { service: opts.service.name, version: opts.service.revision };
        }
      }
      entry.message = text;
      Object.assign(entry, clean(rest) as Fields);
      sink(JSON.stringify(entry));
    };
    return {
      debug: (m, f) => emit("debug", m, f),
      info: (m, f) => emit("info", m, f),
      warn: (m, f) => emit("warn", m, f),
      error: (m, f) => emit("error", m, f),
      child: (fields) => make({ ...base, ...fields }),
    };
  };
  return make(opts.base ?? {});
}
