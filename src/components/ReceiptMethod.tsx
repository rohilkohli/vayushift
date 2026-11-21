"use client";
import { SOURCES } from "@/lib/sources";
import { useLang } from "@/hooks/useLang";

/** "How is this calculated?": the formulas in words, and the published sources behind each constant. */
export function ReceiptMethod() {
  const { t, englishAttrs } = useLang();
  return (
    <details className="mt-4">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold underline">{t.howTitle}</summary>
      <ul className="list-disc pl-5 text-sm">
        <li>{t.how1}</li>
        <li>
          {t.how2} <code>src/lib/constants.ts</code>.
        </li>
        <li>{t.how3}</li>
        <li>{t.how4}</li>
      </ul>
      <ul className="mt-2 list-none p-0 text-sm">
        {Object.values(SOURCES).map((s) => (
          <li key={s.id} className="py-1" {...englishAttrs}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
              {s.label}
            </a>
            : {s.supports}
          </li>
        ))}
      </ul>
    </details>
  );
}
