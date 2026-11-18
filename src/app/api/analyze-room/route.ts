import { NextResponse } from "next/server";
import { geminiConfigured, scanRoomWithGemini } from "@/lib/gemini";
import { RateLimiter, checkImagePayload, clientKey, MAX_IMAGE_BYTES } from "@/lib/validation";

export const runtime = "nodejs";
const limiter = new RateLimiter(10, 60_000);
const MAX_BODY = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 1024;

/** Stateless: the image lives only in memory for this request and is never stored or logged. */
export async function POST(req: Request) {
  if (!limiter.allow(clientKey(req))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY) return NextResponse.json({ error: "Image is larger than 5 MB." }, { status: 413 });

  let body: { mimeType?: unknown; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const check = checkImagePayload(body.mimeType, body.data);
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

  if (!geminiConfigured()) {
    return NextResponse.json({ fallback: true, reason: "ai_unavailable" });
  }
  try {
    const scan = await scanRoomWithGemini(check.mimeType, check.base64);
    if (!scan || !scan.isIndoorRoom) return NextResponse.json({ fallback: true, reason: "not_a_room" });
    return NextResponse.json({ scan });
  } catch {
    return NextResponse.json({ fallback: true, reason: "ai_unavailable" });
  }
}
