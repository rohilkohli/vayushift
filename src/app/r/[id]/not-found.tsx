import Link from "next/link";

export default function ReceiptNotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 py-16">
      <section className="glass rounded-[2.5rem] p-8 text-center" aria-labelledby="nf-title">
        <h1 id="nf-title" className="serif m-0 text-3xl font-medium">
          This receipt isn&apos;t available
        </h1>
        <p className="ink-soft mt-2">The link may be mistyped, or it has expired. Receipt links stay valid for 90 days.</p>
        <p className="mt-4">
          <Link href="/" className="btn-primary no-underline">
            Open VayuShift
          </Link>
        </p>
      </section>
    </main>
  );
}
