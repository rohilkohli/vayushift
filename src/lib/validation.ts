/** Input validation and request-hardening helpers shared by API routes. */

export interface Coords {
  lat: number;
  lng: number;
}

/** Validates a lat/lng pair and rounds to 3 dp (~110 m) so exact home locations are never sent upstream. */
export function parseCoords(lat: unknown, lng: unknown): Coords | null {
  const a = typeof lat === "string" ? Number(lat) : lat;
  const b = typeof lng === "string" ? Number(lng) : lng;
  if (typeof a !== "number" || typeof b !== "number" || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < -90 || a > 90 || b < -180 || b > 180) return null;
  return { lat: Math.round(a * 1000) / 1000, lng: Math.round(b * 1000) / 1000 };
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Checks the real file signature, not just the claimed MIME type. */
export function sniffImageType(bytes: Uint8Array): AllowedImageType | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (
    bytes.length > 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

export type ImageCheck =
  | { ok: true; mimeType: AllowedImageType; base64: string }
  | { ok: false; reason: string };

export function checkImagePayload(mimeType: unknown, base64: unknown): ImageCheck {
  if (typeof base64 !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return { ok: false, reason: "Image data is missing or malformed." };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType as AllowedImageType)) {
    return { ok: false, reason: "Only JPEG, PNG or WebP images are supported." };
  }
  const approxBytes = Math.floor((base64.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) return { ok: false, reason: "Image is larger than 5 MB." };
  const head = Uint8Array.from(Buffer.from(base64.slice(0, 64), "base64"));
  const sniffed = sniffImageType(head);
  if (!sniffed) return { ok: false, reason: "File contents are not a valid JPEG, PNG or WebP image." };
  return { ok: true, mimeType: sniffed, base64 };
}

/** Fixed-window in-memory limiter. Per-instance only: a best-effort guard, not a global quota. */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    if (this.hits.size > 5000) this.sweep(now);
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }

  private sweep(now: number) {
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}

export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}
