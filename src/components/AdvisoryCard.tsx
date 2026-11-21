"use client";
import { useMemo, useState } from "react";
import { track } from "@/lib/clientApi";
import { buildAdvisory } from "@/lib/rwa";
import type { GrapStage } from "@/lib/types";
import { useT } from "@/hooks/useLang";

interface Props {
  stage: GrapStage;
  aqi: number;
  locationName: string;
  flats: number;
  guards: number;
}

const SHARED = { event: "impact_receipt_shared", props: { share_type: "rwa_whatsapp" } } as const;

/** A ready-to-send advisory for an apartment society's WhatsApp group, in English and Hindi, from fixed templates. */
export function AdvisoryCard({ stage, aqi, locationName, flats, guards }: Props) {
  const t = useT();
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState(false);
  const advisory = useMemo(() => buildAdvisory({ stage, aqi, locationName, flats, guards }), [stage, aqi, locationName, flats, guards]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(advisory.combined);
      setToast(t.advisoryCopied);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      track(SHARED);
    } catch {
      setToast(t.advisoryCopyFailed);
    }
  }

  return (
    <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="adv-h">
      <h3 id="adv-h" className="label">
        {t.advisoryTitle}
      </h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="label">English</p>
          <pre lang="en" className="bubble m-0 whitespace-pre-wrap chip p-4 font-sans text-sm">
            {advisory.en}
          </pre>
        </div>
        <div>
          <p className="label">हिन्दी</p>
          <pre lang="hi" className="bubble m-0 whitespace-pre-wrap chip p-4 font-sans text-sm">
            {advisory.hi}
          </pre>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn-primary">
          <span key={String(copied)} className={copied ? "pop" : ""}>
            {copied ? t.copied : t.copyAdvisory}
          </span>
        </button>
        <a
          onClick={() => track(SHARED)}
          href={`https://wa.me/?text=${encodeURIComponent(advisory.combined)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pill no-underline"
        >
          {t.shareWhatsApp}
        </a>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-6 text-sm font-semibold">
        {toast}
      </p>
    </section>
  );
}
