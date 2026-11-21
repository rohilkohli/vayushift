"use client";
import { useT } from "@/hooks/useLang";
import { LiquidFilter } from "./LiquidFilter";
import { SkyScene } from "./SkyScene";
import { WindLayer } from "./WindLayer";

/** The skip link and the living sky behind the page. The sky is decoration only, so it is hidden from assistive technology. */
export function Backdrop() {
  const t = useT();
  return (
    <>
      <a href="#main" className="skip-link">
        {t.skipToContent}
      </a>
      <LiquidFilter />
      <div className="sky" aria-hidden="true">
        <SkyScene />
        <div className="dust" />
        <WindLayer />
      </div>
    </>
  );
}

/** The standing disclaimer: general guidance, modelled indoor figures, illustrative demo scenarios. */
export function DisclaimerFooter() {
  return (
    <footer className="relative z-10 mx-auto max-w-[1440px] px-5 pb-28 lg:px-8 lg:pb-8">
      <p className="glass m-0 max-w-3xl rounded-[2rem] px-5 py-3 text-xs">
        VayuShift gives general guidance, not medical advice. Indoor figures are modelled estimates, not sensor readings. Demo scenarios are
        illustrative, not recorded station data.
      </p>
    </footer>
  );
}
