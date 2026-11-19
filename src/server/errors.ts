/**
 * Errors that are safe to show to a client. Anything that is not an AppError is treated as an
 * internal failure: it is logged in full but the client only ever sees a generic message.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly options: { retryAfterSec?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
  }
}

export const badRequest = (message: string, code = "bad_request") => new AppError(400, code, message);
export const forbidden = (message: string, code = "forbidden") => new AppError(403, code, message);
export const notFound = (message = "Not found.") => new AppError(404, "not_found", message);
export const payloadTooLarge = (message: string) => new AppError(413, "payload_too_large", message);
export const unsupportedMediaType = (message: string) => new AppError(415, "unsupported_media_type", message);
export const tooManyRequests = (retryAfterSec: number) =>
  new AppError(429, "rate_limited", "Too many requests. Please try again shortly.", { retryAfterSec });
export const unavailable = (message: string, cause?: unknown) => new AppError(503, "unavailable", message, { cause });
