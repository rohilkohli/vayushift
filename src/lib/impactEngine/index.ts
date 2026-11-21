/**
 * The deterministic impact engine. Every figure shown to a user, and every figure given to the language model as
 * context, comes from here. Split by job: `room` (volume, filter airflow, indoor mass balance), `episodes` (exposure
 * periods), `pairs` (the five actions before and after), `receipt` (the household total) and `filters` (comparison).
 */
export { compareFilters, type FilterComparison } from "./filters";
export { ENGINE_VERSION, NO_INTERVENTIONS, calculateHouseholdImpact } from "./receipt";
export { clampMembers, fieldCadrM3h, modelIndoor, requiredCadrM3h, roomVolumeM3, type IndoorInputs } from "./room";
