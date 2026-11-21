import { randomUUID } from "node:crypto";
import { getServices, type Services } from "../container";
import { AppError, badRequest, forbidden, payloadTooLarge, tooManyRequests, unsupportedMediaType } from "../errors";
import type { Logger } from "../logger";
import { clientIp } from "./clientIp";
import type { RateLimitOptions } from "./rateLimit";

export interface RouteContext {
  req: Request;
  requestId: string;
  /** The client address used for rate limiting (see clientIp). Not logged or stored. */
  ip: string;
  log: Logger;
  services: Services;
  params: Record<string, string>;
}

export interface RouteOptions {
  /** A short stable name, used for logs and as the rate-limit bucket. */
  name: string;
  rateLimit?: RateLimitOptions;
  /**
   * Refuse requests a browser marks as cross-site (Sec-Fetch-Site). Prevents other websites from making a
   * visitor's browser spend this app's paid quota. Non-browser clients send no such header and are unaffected.
   */
  sameOriginOnly?: boolean;
}

type Handler = (ctx: RouteContext) => Promise<Response>;
/** What Next passes as the second argument to a route handler (dynamic segments arrive as a promise). */
type NextRouteContext = { params: Promise<Record<string, string>> };

/**
 * A Next.js route handler. Declared with two signatures: Next's type checker reads the LAST one, which must
 * take the context; the first lets tests and plain callers omit it.
 */
export interface RouteFunction {
  (req: Request): Promise<Response>;
  (req: Request, ctx: NextRouteContext): Promise<Response>;
}

const REQUEST_ID = /^[\w.-]{8,64}$/;

/** `Response.json` with sensible defaults. */
export const json = (body: unknown, init: ResponseInit = {}) => Response.json(body, init);

/** Cloud Run puts the trace id in a header; turning it into the field Cloud Logging expects links log lines to requests. */
function traceOf(req: Request, project: string | undefined): string | undefined {
  const header = req.headers.get("x-cloud-trace-context");
  const id = header?.split("/")[0];
  return id && project && /^[0-9a-f]{32}$/i.test(id) ? `projects/${project}/traces/${id}` : undefined;
}

/**
 * Wraps a route handler with everything every endpoint needs, once: a request id, a client address, the
 * cross-site check, rate limiting, uniform error responses (internal details are logged, never returned),
 * one access-log line, and standard response headers. Routes contain only their own logic.
 */
export function defineRoute(opts: RouteOptions, handler: Handler): RouteFunction {
  const route = async (req: Request, nextCtx?: NextRouteContext): Promise<Response> => {
    const started = performance.now();
    const services = getServices();
    const incoming = req.headers.get("x-request-id");
    const requestId = incoming && REQUEST_ID.test(incoming) ? incoming : randomUUID();
    const log = services.logger.child({ route: opts.name, requestId, trace: traceOf(req, services.config.gcpProject) });
    const ip = clientIp(req.headers, services.config.trustedProxyHops);

    let res: Response;
    try {
      admit(opts, req, services, ip);
      const params = nextCtx?.params ? await nextCtx.params : {};
      res = await handler({ req, requestId, ip, log, services, params });
    } catch (err) {
      res = errorResponse(err, requestId, log);
    }
    const durationMs = Math.round(performance.now() - started);
    log[levelFor(res.status)]("request", { method: req.method, status: res.status, durationMs });
    return withStandardHeaders(res, requestId, durationMs);
  };
  return route as RouteFunction;
}

/** The checks every request passes before its handler runs: the cross-site check, then the rate limit. */
function admit(opts: RouteOptions, req: Request, services: Services, ip: string): void {
  if (opts.sameOriginOnly && req.headers.get("sec-fetch-site") === "cross-site") {
    throw forbidden("Cross-site requests are not allowed.", "cross_site");
  }
  if (!opts.rateLimit) return;
  const decision = services.limiters.for(opts.name, opts.rateLimit).check(ip);
  if (!decision.allowed) throw tooManyRequests(decision.retryAfterSec);
}

const levelFor = (status: number) => (status >= 500 ? "error" : status >= 400 ? "warn" : "info");

function withStandardHeaders(res: Response, requestId: string, durationMs: number): Response {
  const headers = new Headers(res.headers);
  headers.set("X-Request-Id", requestId);
  headers.set("Server-Timing", `app;dur=${durationMs}`);
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function errorResponse(err: unknown, requestId: string, log: Logger): Response {
  if (err instanceof AppError) {
    // 5xx AppErrors wrap an internal cause (a storage outage, say): the client sees the safe message, we log the cause.
    if (err.status >= 500) log.error("service error", { err, code: err.code });
    const headers = new Headers();
    if (err.options.retryAfterSec) headers.set("Retry-After", String(err.options.retryAfterSec));
    return json({ error: { code: err.code, message: err.message, requestId } }, { status: err.status, headers });
  }
  log.error("unhandled error", { err });
  return json({ error: { code: "internal_error", message: "Something went wrong on our side.", requestId } }, { status: 500 });
}

/**
 * Reads a JSON body without trusting Content-Length: the stream is cut off as soon as it exceeds `maxBytes`,
 * so an oversized or endless upload never gets buffered.
 */
export async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes)
    throw payloadTooLarge(`Request body is larger than ${Math.round(maxBytes / 1024)} KB.`);
  if (!/^application\/json\b/i.test(req.headers.get("content-type") ?? "")) {
    throw unsupportedMediaType("Content-Type must be application/json.");
  }
  const reader = req.body?.getReader();
  if (!reader) throw badRequest("A JSON request body is required.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw payloadTooLarge(`Request body is larger than ${Math.round(maxBytes / 1024)} KB.`);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw badRequest("Request body is not valid JSON.", "invalid_json");
  }
}
