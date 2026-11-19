import { randomInt } from "node:crypto";
import { ENGINE_VERSION, calculateHouseholdImpact } from "@/lib/impactEngine";
import type { ActiveInterventions, HourlyAir, HouseholdProfile } from "@/lib/types";
import { badRequest, unavailable } from "../errors";
import type { ReceiptStore, StoredReceipt } from "../ports";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const ID_LENGTH = 10;
const ID_PATTERN = /^[0-9A-Za-z]{10}$/;
const NAME_PATTERN = /^[\p{L}\p{N} .'-]{1,40}$/u;
const DAY_MS = 86_400_000;

/** 10 characters from a 62-letter alphabet is about 59 bits, drawn with a CSPRNG: ids cannot be guessed or enumerated. */
export function newReceiptId(): string {
  return Array.from({ length: ID_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}
export const isReceiptId = (v: unknown): v is string => typeof v === "string" && ID_PATTERN.test(v);

export interface ReceiptInputs {
  scenarioName: string;
  hourly: HourlyAir[];
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
}

export interface ReceiptDeps {
  store: ReceiptStore;
  ttlDays: number;
  now?: () => number;
  generateId?: () => string;
}

/**
 * Shareable, immutable receipts. A link stores the inputs and the receipt computed from them on the server
 * (never a client-supplied number), plus the engine version. It holds no personal data: only a scenario name,
 * an hourly series, household sizes and switches. Links expire (Firestore deletes them through a TTL policy).
 */
export class ReceiptService {
  private readonly now: () => number;
  private readonly generateId: () => string;
  constructor(private readonly deps: ReceiptDeps) {
    this.now = deps.now ?? Date.now;
    this.generateId = deps.generateId ?? newReceiptId;
  }

  async create(inputs: ReceiptInputs): Promise<StoredReceipt> {
    if (!NAME_PATTERN.test(inputs.scenarioName)) throw badRequest("scenarioName is not valid.", "invalid_scenario_name");
    const createdAt = this.now();
    const record = (id: string): StoredReceipt => ({
      id,
      createdAt,
      expiresAt: createdAt + this.deps.ttlDays * DAY_MS,
      engineVersion: ENGINE_VERSION,
      scenarioName: inputs.scenarioName,
      hourly: inputs.hourly.map((h) => h.pm25),
      profile: inputs.profile,
      interventions: inputs.interventions,
      receipt: calculateHouseholdImpact(inputs.hourly, inputs.profile, inputs.interventions),
    });
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const r = record(this.generateId());
        if (await this.deps.store.create(r)) return r;
      }
    } catch (err) {
      throw unavailable("Share links are temporarily unavailable. Please try again shortly.", err);
    }
    throw unavailable("Could not allocate a share link. Please try again.");
  }

  async get(id: string): Promise<StoredReceipt | null> {
    if (!isReceiptId(id)) return null;
    let r: StoredReceipt | null;
    try {
      r = await this.deps.store.get(id);
    } catch (err) {
      throw unavailable("Share links are temporarily unavailable. Please try again shortly.", err);
    }
    return r && r.expiresAt > this.now() ? r : null;
  }
}
