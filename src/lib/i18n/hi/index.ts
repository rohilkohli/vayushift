/** Every Hindi message, assembled from the per-section modules; the compiler checks it against the English catalogue. */
import type { Messages } from "../en";
import { shell } from "./shell";
import { sky } from "./sky";
import { household } from "./household";
import { horizon } from "./horizon";
import { lab } from "./lab";
import { community } from "./community";
import { receipt } from "./receipt";

export const hi: Messages = { ...shell, ...sky, ...household, ...horizon, ...lab, ...community, ...receipt };
