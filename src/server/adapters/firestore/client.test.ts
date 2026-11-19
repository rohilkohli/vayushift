import { describe, expect, it } from "vitest";
import { firestoreLib } from "./client";

describe("firestoreLib", () => {
  it("returns the classes the adapters need, as constructors", async () => {
    const lib = await firestoreLib();
    expect(typeof lib.Firestore).toBe("function");
    expect(typeof lib.Timestamp.fromMillis).toBe("function");
    expect(typeof lib.FieldValue.increment).toBe("function");
  });

  it("loads once and shares the result", async () => {
    expect(await firestoreLib()).toBe(await firestoreLib());
  });

  it("builds real Timestamp and increment values", async () => {
    const { Timestamp, FieldValue } = await firestoreLib();
    expect(Timestamp.fromMillis(86_400_000).toMillis()).toBe(86_400_000);
    expect(FieldValue.increment(1)).toBeDefined();
  });
});
