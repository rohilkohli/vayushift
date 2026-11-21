import type { WindowType, CookingFuel } from "./types";

export type RoomCategory = "bedroom" | "living_room" | "kitchen" | "classroom" | "office" | "unknown";
export type ExhaustType = "ducted_chimney" | "wall_exhaust_fan" | "recirculating_hood" | "none";

export interface RoomScan {
  isIndoorRoom: boolean;
  roomCategory: RoomCategory;
  estimatedAreaSqFt: number;
  estimatedCeilingHeightFt: number;
  windowType: WindowType | "none_visible";
  cookingApplianceDetected: CookingFuel | "both" | "none";
  exhaustTypeDetected: ExhaustType;
  infiltrationRiskNotes: string[];
  recommendedPlacementSpot: string;
}

const CATEGORIES: RoomCategory[] = ["bedroom", "living_room", "kitchen", "classroom", "office", "unknown"];
const WINDOWS = ["sliding_aluminum_unsealed", "casement_wood_unsealed", "upvc_sealed", "none_visible"] as const;
const COOKING = ["lpg_gas_stove", "electric_induction", "both", "none"] as const;
const EXHAUST: ExhaustType[] = ["ducted_chimney", "wall_exhaust_fan", "recirculating_hood", "none"];

/** JSON schema handed to Gemini (types in the SDK's upper-case form). */
export const ROOM_SCAN_SCHEMA = {
  type: "OBJECT",
  required: [
    "isIndoorRoom",
    "roomCategory",
    "estimatedAreaSqFt",
    "estimatedCeilingHeightFt",
    "windowType",
    "cookingApplianceDetected",
    "exhaustTypeDetected",
    "infiltrationRiskNotes",
    "recommendedPlacementSpot",
  ],
  properties: {
    isIndoorRoom: { type: "BOOLEAN" },
    roomCategory: { type: "STRING", enum: CATEGORIES },
    estimatedAreaSqFt: { type: "NUMBER" },
    estimatedCeilingHeightFt: { type: "NUMBER" },
    windowType: { type: "STRING", enum: [...WINDOWS] },
    cookingApplianceDetected: { type: "STRING", enum: [...COOKING] },
    exhaustTypeDetected: { type: "STRING", enum: EXHAUST },
    infiltrationRiskNotes: { type: "ARRAY", items: { type: "STRING" } },
    recommendedPlacementSpot: { type: "STRING" },
  },
} as const;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const isControlOrAngle = (ch: string) => ch.charCodeAt(0) <= 0x1f || ch === "<" || ch === ">";
/** Free text from the model: control characters and angle brackets become spaces, then trimmed and length-limited. */
const cleanText = (s: unknown, max: number) =>
  typeof s === "string"
    ? [...s]
        .map((ch) => (isControlOrAngle(ch) ? " " : ch))
        .join("")
        .trim()
        .slice(0, max)
    : "";

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);

/** The gas stove the model names is the engine's "unvented LPG" fuel; everything else passes through. */
const toCooking = (c: (typeof COOKING)[number]): RoomScan["cookingApplianceDetected"] => (c === "lpg_gas_stove" ? "lpg_unvented" : c);

type Enums = Pick<RoomScan, "roomCategory" | "windowType" | "exhaustTypeDetected"> & { cooking: (typeof COOKING)[number] };

/** The four enumerated fields, or null if any is outside its allowed list. */
function readEnums(r: Record<string, unknown>): Enums | null {
  const { roomCategory, windowType, cookingApplianceDetected: cooking, exhaustTypeDetected } = r;
  if (!isOneOf(CATEGORIES, roomCategory) || !isOneOf(WINDOWS, windowType)) return null;
  if (!isOneOf(COOKING, cooking) || !isOneOf(EXHAUST, exhaustTypeDetected)) return null;
  return { roomCategory, windowType, cooking, exhaustTypeDetected };
}

/**
 * Validates untrusted model output against the schema. Enums are checked,
 * numbers clamped to plausible ranges and free text length-limited, so a
 * manipulated image cannot push arbitrary content into the UI or the engine.
 * Returns null when the output is unusable.
 */
export function validateRoomScan(raw: unknown): RoomScan | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const area = Number(r.estimatedAreaSqFt);
  const ceiling = Number(r.estimatedCeilingHeightFt);
  const enums = readEnums(r);
  if (typeof r.isIndoorRoom !== "boolean" || !Number.isFinite(area) || !Number.isFinite(ceiling) || !enums) return null;
  const notes = Array.isArray(r.infiltrationRiskNotes) ? r.infiltrationRiskNotes : [];
  return {
    isIndoorRoom: r.isIndoorRoom,
    roomCategory: enums.roomCategory,
    estimatedAreaSqFt: Math.round(clamp(area, 40, 800)),
    estimatedCeilingHeightFt: clamp(Math.round(ceiling * 2) / 2, 7, 14),
    windowType: enums.windowType,
    cookingApplianceDetected: toCooking(enums.cooking),
    exhaustTypeDetected: enums.exhaustTypeDetected,
    infiltrationRiskNotes: notes
      .slice(0, 5)
      .map((n) => cleanText(n, 120))
      .filter(Boolean),
    recommendedPlacementSpot: cleanText(r.recommendedPlacementSpot, 160),
  };
}

/** Sample rooms so the Lab works with no upload, no network and no API key. */
export const SAMPLE_ROOMS: ReadonlyArray<{ id: string; label: string; scan: RoomScan }> = [
  {
    id: "master-bedroom",
    label: "Master bedroom (180 sq ft)",
    scan: {
      isIndoorRoom: true,
      roomCategory: "bedroom",
      estimatedAreaSqFt: 180,
      estimatedCeilingHeightFt: 10,
      windowType: "sliding_aluminum_unsealed",
      cookingApplianceDetected: "none",
      exhaustTypeDetected: "none",
      infiltrationRiskNotes: ["Aluminium sliding track leaks around the frame", "Road-facing balcony door"],
      recommendedPlacementSpot: "Corner away from the window, 30 cm clear of walls and curtains",
    },
  },
  {
    id: "kids-study",
    label: "Kids study (120 sq ft)",
    scan: {
      isIndoorRoom: true,
      roomCategory: "bedroom",
      estimatedAreaSqFt: 120,
      estimatedCeilingHeightFt: 9.5,
      windowType: "casement_wood_unsealed",
      cookingApplianceDetected: "none",
      exhaustTypeDetected: "none",
      infiltrationRiskNotes: ["Wooden casement gaps at the corners"],
      recommendedPlacementSpot: "Beside the desk, facing into the room",
    },
  },
  {
    id: "living-kitchen",
    label: "Living room + kitchen (340 sq ft)",
    scan: {
      isIndoorRoom: true,
      roomCategory: "living_room",
      estimatedAreaSqFt: 340,
      estimatedCeilingHeightFt: 10,
      windowType: "sliding_aluminum_unsealed",
      cookingApplianceDetected: "lpg_unvented",
      exhaustTypeDetected: "recirculating_hood",
      infiltrationRiskNotes: ["Open-plan kitchen shares air with the living room", "Recirculating hood does not vent outdoors"],
      recommendedPlacementSpot: "Between the kitchen and the sofa area",
    },
  },
];
