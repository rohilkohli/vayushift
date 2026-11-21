/**
 * The living sky: stars, moon, sun, clouds and birds, all drawn as inline SVG (no external files, so no licences,
 * requests or CSP changes). Everything is decorative (aria-hidden) and driven by CSS variables that useLivingSky
 * sets from the hour; see the "Fixed atmosphere" block in globals.css. Layout is deterministic, so server and
 * client render the same markup.
 */
import { BirdLayer, CloudLayer, StarField } from "./SkyLayers";
import { Moon, Sun } from "./SkyBodies";

export function SkyScene() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <StarField />
      <Moon />
      <Sun />
      <CloudLayer />
      <BirdLayer />
    </div>
  );
}
