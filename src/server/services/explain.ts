import { createHash } from "node:crypto";
import { allowedNumbers, narrativeUsesOnlyAllowedNumbers, templateExplanation } from "@/lib/explain";
import { calculateHouseholdImpact } from "@/lib/impactEngine";
import type { ActiveInterventions, DirectImpactReceipt, HourlyAir, HouseholdProfile } from "@/lib/types";
import type { Logger } from "../logger";
import type { Cache, UsageBudget } from "../ports";

export interface ExplanationProvider {
  explain(metricsJson: string): Promise<string>;
}

export interface ExplainInputs {
  hourly: HourlyAir[];
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
}

export interface ExplainResult {
  text: string;
  source: "gemini" | "template";
  receipt: DirectImpactReceipt;
}

export interface ExplainDeps {
  provider: ExplanationProvider | undefined;
  cache: Cache;
  budget: UsageBudget;
  log: Logger;
  cacheMs: number;
}

const MAX_LENGTH = 800;

/**
 * Explains a receipt in plain language. The numbers are computed here, on the server, from inputs: a client
 * can never supply them. Gemini only verbalises them, and its text is rejected if it contains any number the
 * engine did not produce. Identical receipts are cached, so the model is called at most once per distinct result.
 */
export class ExplainService {
  constructor(private readonly deps: ExplainDeps) {}

  async explain(inputs: ExplainInputs): Promise<ExplainResult> {
    const { provider, cache, budget, log, cacheMs } = this.deps;
    const receipt = calculateHouseholdImpact(inputs.hourly, inputs.profile, inputs.interventions);
    const template = (): ExplainResult => ({ text: templateExplanation(receipt), source: "template", receipt });

    if (!provider || receipt.avoidedCigarettesHouseholdDay <= 0) return template();

    const metrics = JSON.stringify(receipt);
    const key = `explain:v1:${createHash("sha256").update(metrics).digest("hex")}`;
    const hit = await cache.get<string>(key).catch(() => undefined);
    if (hit) return { text: hit.value, source: "gemini", receipt };

    if (!(await budget.tryConsume("geminiExplain"))) {
      log.warn("explain budget exhausted", { resource: "geminiExplain" });
      return template();
    }
    try {
      const text = await provider.explain(metrics);
      if (text && text.length < MAX_LENGTH && narrativeUsesOnlyAllowedNumbers(text, allowedNumbers(receipt))) {
        await cache.set(key, text, cacheMs).catch((err) => log.warn("explain cache write failed", { err }));
        return { text, source: "gemini", receipt };
      }
      log.warn("explanation rejected by number guard", { length: text.length });
    } catch (err) {
      log.warn("explain failed", { err });
    }
    return template();
  }
}
