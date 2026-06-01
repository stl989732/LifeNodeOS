"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

type Props = {
  policyId: string;
  className?: string;
};

/**
 * Embeds a Termly-hosted policy (terms, cookie policy, etc.) via Termly's iframe loader.
 * Policy IDs come from the Termly dashboard embed snippet or DSAR link UUID.
 */
export default function TermlyPolicyEmbed({ policyId, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.setAttribute("name", "termly-embed");
    host.setAttribute("data-id", policyId);
    host.setAttribute("data-type", "iframe");
  }, [policyId]);

  return (
    <>
      <div ref={hostRef} className={className} />
      <Script
        src="https://app.termly.io/embed-policy.min.js"
        strategy="afterInteractive"
      />
    </>
  );
}
