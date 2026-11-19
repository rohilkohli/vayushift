/** Shared helpers for server tests. Not imported by application code. */
import { PRESET_SCENARIOS } from "@/lib/airQualityPresets";
import type { ActiveInterventions, HouseholdProfile } from "@/lib/types";
import { loadConfig, type AppConfig } from "../config";
import { createServices, type Overrides, type Services } from "../container";
import { createLogger } from "../logger";

export class FakeClock {
  constructor(public ms = Date.UTC(2026, 10, 19, 10, 0, 0)) {}
  now = () => this.ms;
  tick(ms: number) {
    this.ms += ms;
  }
}

export function testConfig(env: Record<string, string> = {}): AppConfig {
  return loadConfig({ NODE_ENV: "test", ...env });
}

/** A container wired for tests, plus every log line it emitted (as parsed objects). */
export function testServices(overrides: Overrides = {}, env: Record<string, string> = {}) {
  const config = testConfig(env);
  const lines: string[] = [];
  const logger = createLogger({ level: "debug", service: config.service, sink: (l) => lines.push(l) });
  const services: Services = createServices(config, { logger, airProvider: null, visionProvider: null, explainProvider: null, ...overrides });
  return { services, config, logs: () => lines.map((l) => JSON.parse(l) as Record<string, unknown>) };
}

export const hourlyFixture: number[] = PRESET_SCENARIOS[0].hourly.map((h) => h.pm25);

export const profileFixture: HouseholdProfile = {
  memberCount: 3,
  commuterCount: 1,
  walkerCount: 1,
  hasVulnerableMembers: true,
  roomAreaSqFt: 180,
  ceilingHeightFt: 10,
  windowType: "sliding_aluminum_unsealed",
  sleepNoiseSensitivity: "medium",
  commuteKmRoundTrip: 20,
  baselineCommuteMode: "private_petrol_car",
  baselineCookingFuel: "lpg_unvented",
};

export const interventionsFixture: ActiveInterventions = {
  shiftWalkToTrough: false,
  purgeAtTrough: false,
  sealWindowsWithEpdm: false,
  filtrationMode: "quad_merv13_cr_box",
  switchToInduction: false,
  switchCommuteToMetroN95: true,
};

/** A JSON POST the way a browser would send it. */
export function post(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://app.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.7", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export function get(path: string, headers: Record<string, string> = {}): Request {
  return new Request(`http://app.test${path}`, { headers: { "x-forwarded-for": "198.51.100.7", ...headers } });
}
