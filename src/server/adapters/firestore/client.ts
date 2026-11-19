import type { Firestore } from "@google-cloud/firestore";
import type { AppConfig } from "../../config";

/**
 * Lazily creates one Firestore client per process. The library is imported on first use, so the in-memory
 * backend (local development, tests) never loads it and cold starts stay short. On Cloud Run the client uses
 * Application Default Credentials: the service account attached to the revision, with no key file anywhere.
 * With FIRESTORE_EMULATOR_HOST set, the library talks to the emulator automatically.
 */
export class FirestoreHandle {
  private pending: Promise<Firestore> | undefined;
  constructor(private readonly config: Pick<AppConfig, "gcpProject">) {}

  db(): Promise<Firestore> {
    this.pending ??= import("@google-cloud/firestore").then(
      ({ Firestore }) => new Firestore({ projectId: this.config.gcpProject, ignoreUndefinedProperties: true }),
    );
    return this.pending;
  }
}

/** gRPC status code for "document already exists". */
export const ALREADY_EXISTS = 6;
export const isAlreadyExists = (err: unknown) => (err as { code?: number })?.code === ALREADY_EXISTS;
