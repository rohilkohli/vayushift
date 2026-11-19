import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServices } from "@/server/container";

/** Read from storage on every request: a link can expire or be removed at any time. */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const r = await getServices().receipts.get(id);
  return {
    title: "Lungs & Sky receipt · VayuShift",
    description: r
      ? `A household in ${r.scenarioName} avoids about ${r.receipt.avoidedCigarettesHouseholdDay} cigarette-equivalents of PM2.5 and ${r.receipt.savedCo2GramsDay} g of CO2 a day. Estimates, not medical advice.`
      : "This receipt link does not exist or has expired.",
    // A private link should not be indexed by search engines.
    robots: { index: false, follow: false },
  };
}

export default async function SharedReceiptPage({ params }: Params) {
  const { id } = await params;
  const r = await getServices().receipts.get(id);
  if (!r) notFound();
  const { receipt } = r;
  const stats: Array<[string, string]> = [
    ["Per person, per day", `${receipt.avoidedCigarettesPerPersonDay} cig-eq`],
    ["Household, per day", `${receipt.avoidedCigarettesHouseholdDay} cig-eq`],
    ["90-day season", `${receipt.avoidedCigarettesSeason90Days} cig-eq`],
    ["Inhaled PM2.5 avoided", `${receipt.avoidedPm25MicrogramsDay} µg`],
    ["CO₂ saved", `${receipt.savedCo2GramsDay} g`],
    ["Indoor PM2.5 (modelled)", `${receipt.baselineIndoorPm25} → ${receipt.managedIndoorPm25} µg/m³`],
  ];

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <section className="glass rounded-[2.5rem] p-6 sm:p-8" aria-labelledby="receipt-title">
        <p className="label m-0">Shared receipt · {r.scenarioName}</p>
        <h1 id="receipt-title" className="serif m-0 mt-1 text-3xl font-medium">Lungs &amp; Sky receipt</h1>
        <p className="ink-soft mt-1 text-sm">
          Calculated {new Date(r.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })} with engine v{r.engineVersion}. This link expires{" "}
          {new Date(r.expiresAt).toLocaleDateString("en-IN", { dateStyle: "long" })}.
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-3">
          {stats.map(([k, v]) => (
            <div key={k} className="chip rounded-2xl p-3">
              <dt className="label">{k}</dt>
              <dd className="serif m-0 text-xl italic">{v}</dd>
            </div>
          ))}
        </dl>

        <h2 className="label mt-6">Where it comes from</h2>
        <table className="tbl mt-2">
          <caption className="sr-only">Contribution of each action</caption>
          <thead>
            <tr><th scope="col">Action</th><th scope="col">Cig-eq/day</th><th scope="col">µg avoided</th></tr>
          </thead>
          <tbody>
            {receipt.components.map((c) => (
              <tr key={c.key}><th scope="row">{c.label}</th><td>{c.avoidedCigarettes}</td><td>{c.avoidedPm25Micrograms}</td></tr>
            ))}
          </tbody>
        </table>

        <p className="ink-soft mt-5 text-xs">
          Cigarette-equivalents are a communication aid (PM2.5 ÷ 22 × hours ÷ 24), not a medical measure. These figures describe one household&apos;s
          modelled exposure, not a change in the city&apos;s air. Indoor values are modelled, not measured. Not medical advice.
        </p>
        <p className="mt-4">
          <Link href="/" className="btn-primary no-underline">Make your own receipt</Link>
        </p>
      </section>
    </main>
  );
}
