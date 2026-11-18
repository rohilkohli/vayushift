import { NextResponse } from "next/server";
import { allowedNumbers, narrativeUsesOnlyAllowedNumbers, templateExplanation } from "@/lib/explain";
import { explainWithGemini, geminiConfigured } from "@/lib/gemini";
import { calculateHouseholdImpact } from "@/lib/impactEngine";
import { parseHourly, parseInterventions, parseProfile } from "@/lib/requestSchemas";
import { RateLimiter, clientKey } from "@/lib/validation";

export const runtime = "nodejs";
const limiter = new RateLimiter(20, 60_000);

/**
 * The client sends inputs, never numbers. The server recomputes the receipt,
 * asks Gemini to verbalise it, then rejects any text containing a number the
 * engine did not produce and falls back to a fixed template.
 */
export async function POST(req: Request) {
  if (!limiter.allow(clientKey(req))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const hourly = parseHourly(body.hourly);
  const profile = parseProfile(body.profile);
  const interventions = parseInterventions(body.interventions);
  if (!hourly || !profile || !interventions) return NextResponse.json({ error: "Invalid inputs." }, { status: 400 });

  const receipt = calculateHouseholdImpact(hourly, profile, interventions);
  const fallback = { text: templateExplanation(receipt), source: "template" as const };
  if (!geminiConfigured() || receipt.avoidedCigarettesHouseholdDay <= 0) return NextResponse.json(fallback);
  try {
    const text = await explainWithGemini(JSON.stringify(receipt));
    if (text && text.length < 800 && narrativeUsesOnlyAllowedNumbers(text, allowedNumbers(receipt))) {
      return NextResponse.json({ text, source: "gemini" });
    }
  } catch {
    /* fall through to template */
  }
  return NextResponse.json(fallback);
}
