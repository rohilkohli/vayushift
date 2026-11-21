import type { RoomScan } from "@/lib/roomScan";
import type { AllowedImageType } from "@/lib/validation";
import type { Logger } from "../logger";
import type { UsageBudget } from "../ports";

export interface RoomVisionProvider {
  scan(mimeType: AllowedImageType, base64: string): Promise<RoomScan | null>;
}

export type RoomVisionOutcome =
  { kind: "scan"; scan: RoomScan } | { kind: "fallback"; reason: "ai_unavailable" | "not_a_room" | "budget_exhausted" };

export interface RoomVisionDeps {
  provider: RoomVisionProvider | undefined;
  budget: UsageBudget;
  log: Logger;
}

/**
 * Photo to room description. This is the most expensive call in the system, so it is the first one behind a
 * daily budget; every failure path degrades to "use the manual sliders" rather than an error. Images are
 * processed in memory and never stored or logged.
 */
export class RoomVisionService {
  constructor(private readonly deps: RoomVisionDeps) {}

  async analyze(mimeType: AllowedImageType, base64: string): Promise<RoomVisionOutcome> {
    const { provider, budget, log } = this.deps;
    if (!provider) return { kind: "fallback", reason: "ai_unavailable" };
    if (!(await budget.tryConsume("geminiVision"))) {
      log.warn("room vision budget exhausted", { resource: "geminiVision" });
      return { kind: "fallback", reason: "budget_exhausted" };
    }
    try {
      const scan = await provider.scan(mimeType, base64);
      if (!scan || !scan.isIndoorRoom) return { kind: "fallback", reason: "not_a_room" };
      return { kind: "scan", scan };
    } catch (err) {
      log.warn("room vision failed", { err });
      return { kind: "fallback", reason: "ai_unavailable" };
    }
  }
}
