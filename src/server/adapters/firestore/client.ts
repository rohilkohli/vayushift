import type * as FirestoreNamespace from "@google-cloud/firestore";
import type { Firestore } from "@google-cloud/firestore";
import type { AppConfig } from "../../config";

type FirestoreModule = typeof FirestoreNamespace;

let libPromise: Promise<FirestoreModule> | undefined;

/**
 * Loads @google-cloud/firestore on first use, so the in-memory backend (local development, tests) never loads
 * it and cold starts stay short.
 *
 * The package is CommonJS. Under Node's own `import()` its classes are named exports, but inside Next's
 * production server bundle the same `import()` can hand back a namespace whose classes live under `.default`
 * (this surfaced only on Cloud Run as "TypeError: a is not a constructor"). Accept either shape.
 */
export function firestoreLib(): Promise<FirestoreModule> {
  libPromise ??= import("@google-cloud/firestore").then((mod) => {
    const candidate = mod as FirestoreModule & { default?: FirestoreModule };
    if (typeof candidate.Firestore === "function") return candidate;
    if (typeof candidate.default?.Firestore === "function") return candidate.default;
    throw new Error("@google-cloud/firestore did not expose a Firestore class");
  });
  return libPromise;
}

/**
 * One Firestore client per process. On Cloud Run it uses Application Default Credentials: the service account
 * attached to the revision, with no key file anywhere. With FIRESTORE_EMULATOR_HOST set, the library talks to
 * the emulator automatically.
 */
export class FirestoreHandle {
  private pending: Promise<Firestore> | undefined;
  constructor(private readonly config: Pick<AppConfig, "gcpProject">) {}

  db(): Promise<Firestore> {
    this.pending ??= firestoreLib().then(
      ({ Firestore }) => new Firestore({ projectId: this.config.gcpProject, ignoreUndefinedProperties: true }),
    );
    return this.pending;
  }
}

/** gRPC status code for "document already exists". */
export const ALREADY_EXISTS = 6;
export const isAlreadyExists = (err: unknown) => (err as { code?: number })?.code === ALREADY_EXISTS;
