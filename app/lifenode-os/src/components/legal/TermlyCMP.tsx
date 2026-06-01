"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SCRIPT_SRC_BASE = "https://app.termly.io";

type Props = {
  websiteUUID?: string;
  autoBlock?: boolean;
};

/**
 * Loads Termly's consent management platform so `.termly-display-preferences`
 * links open the on-site preference center.
 */
export default function TermlyCMP({
  websiteUUID = process.env.NEXT_PUBLIC_TERMLY_WEBSITE_UUID?.trim(),
  autoBlock = true,
}: Props) {
  const scriptSrc = useMemo(() => {
    if (!websiteUUID) return null;
    const src = new URL(SCRIPT_SRC_BASE);
    src.pathname = `/resource-blocker/${websiteUUID}`;
    if (autoBlock) src.searchParams.set("autoBlock", "on");
    return src.toString();
  }, [websiteUUID, autoBlock]);

  const isScriptAdded = useRef(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!scriptSrc || isScriptAdded.current || typeof window === "undefined") {
      return;
    }
    if (document.querySelector(`script[src="${scriptSrc}"]`)) {
      isScriptAdded.current = true;
      return;
    }
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    document.head.appendChild(script);
    isScriptAdded.current = true;
  }, [scriptSrc]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const termly = (window as Window & { Termly?: { initialize?: () => void } })
      .Termly;
    try {
      termly?.initialize?.();
    } catch {
      /* Termly not ready yet */
    }
  }, [pathname, searchParams]);

  return null;
}
