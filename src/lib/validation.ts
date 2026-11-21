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

const startsWith = (bytes: Uint8Array, sig: readonly number[], at = 0) => sig.every((b, i) => bytes[at + i] === b);
const ascii = (bytes: Uint8Array, from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));

/** Checks the real file signature, not just the claimed MIME type. */
export function sniffImageType(bytes: Uint8Array): AllowedImageType | null {
  if (bytes.length > 3 && startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytes.length > 8 && startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (bytes.length > 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  return null;
}

export type ImageCheck = { ok: true; mimeType: AllowedImageType; base64: string } | { ok: false; reason: string };

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
