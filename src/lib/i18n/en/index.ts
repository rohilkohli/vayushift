/** Every English message, assembled from the per-section modules. hi/ must provide the same keys with the same signatures. */
import { shell } from "./shell";
import { sky } from "./sky";
import { household } from "./household";
import { horizon } from "./horizon";
import { lab } from "./lab";
import { community } from "./community";
import { receipt } from "./receipt";

export const en = { ...shell, ...sky, ...household, ...horizon, ...lab, ...community, ...receipt };

export type Messages = typeof en;
